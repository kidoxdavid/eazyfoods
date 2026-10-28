import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requirePerm } from '../lib/permissions.js';
import { bad, conflict, notFound } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { notifyStaff } from '../services/notify.js';
import { CommissionParams, DeliveryParams, DriverPayParams, KINDS, ServiceFeeParams, resolveRule, simulate, validateParams, type Kind } from '../services/financeRules.js';

const uuid = z.string().uuid();
const kind = z.enum(KINDS);
const scope = z.object({ scope_type: z.enum(['global', 'zone', 'store', 'vendor']).default('global'), scope_id: uuid.nullish() });
const scopeOk = (s: { scope_type: string; scope_id?: string | null }) => (s.scope_type === 'global') === !s.scope_id;
const EVENT = async (c: { query: typeof pool.query }, rule: string, action: string, actor: string, detail: object = {}) =>
  c.query('INSERT INTO pricing_rule_events(rule_id, action, actor_id, detail) VALUES ($1,$2,$3,$4)', [rule, action, actor, detail]);

/**
 * Financial rules: create, validate, submit, approve, retire, history and the simulator.
 * Editing and approving are separate permissions; with `finance.require_second_approver` on, the approver must also differ from the author.
 * Nothing here touches an order already placed: orders keep the snapshot taken at checkout.
 */
export const adminFinanceRoutes: FastifyPluginAsync = async (app) => {
  const view = requirePerm('pricing.view', 'pricing.edit', 'pricing.approve');
  const edit = requirePerm('pricing.edit', 'pricing.approve');
  const approve = requirePerm('pricing.approve');

  app.get<{ Querystring: { kind?: string } }>('/pricing/rules', { preHandler: view }, async (req) => {
    const k = req.query.kind ? kind.parse(req.query.kind) : null;
    return (await pool.query(
      `SELECT r.id, r.kind, r.scope_type, r.scope_id, r.name, r.params, r.status, r.version, r.effective_from, r.effective_to, r.note, r.updated_at, r.created_at,
              cu.full_name AS created_by_name, au.full_name AS approved_by_name,
              COALESCE(z.name, s.name, v.name) AS scope_name
         FROM pricing_rules r LEFT JOIN users cu ON cu.id = r.created_by LEFT JOIN users au ON au.id = r.approved_by
         LEFT JOIN delivery_zones z ON r.scope_type = 'zone' AND z.id = r.scope_id LEFT JOIN stores s ON r.scope_type = 'store' AND s.id = r.scope_id LEFT JOIN vendors v ON r.scope_type = 'vendor' AND v.id = r.scope_id
        WHERE ($1::text IS NULL OR r.kind = $1) ORDER BY r.kind, CASE r.status WHEN 'active' THEN 0 WHEN 'pending_approval' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END, r.effective_from DESC NULLS LAST, r.version DESC`, [k])).rows;
  });

  app.get<{ Params: { id: string } }>('/pricing/rules/:id', { preHandler: view }, async (req) => {
    const id = uuid.parse(req.params.id);
    const r = (await pool.query('SELECT * FROM pricing_rules WHERE id = $1', [id])).rows[0];
    if (!r) throw notFound('Rule not found');
    const events = (await pool.query(`SELECT e.id, e.action, e.detail, e.created_at, u.full_name AS actor FROM pricing_rule_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.rule_id = $1 ORDER BY e.id DESC`, [id])).rows;
    return { ...r, events };
  });

  /** Check a rule without saving it: plain-language problems, or the cleaned-up values. */
  app.post('/pricing/validate', { preHandler: edit }, async (req) => {
    const b = z.object({ kind, params: z.unknown() }).parse(req.body);
    return validateParams(b.kind, b.params);
  });

  app.post('/pricing/rules', { preHandler: edit }, async (req, reply) => {
    const b = z.object({ kind, name: z.string().trim().min(2).max(120), params: z.unknown(), effective_from: z.string().datetime().nullish(), note: z.string().max(500).nullish() }).merge(scope).parse(req.body);
    if (!scopeOk(b)) throw bad('invalid_rule', 'A scoped rule needs the zone, store or vendor it applies to; a global rule has none.');
    const v = validateParams(b.kind, b.params);
    if (!v.ok) throw bad('invalid_rule', v.errors.join(' '));
    const id = await tx(async (c) => {
      const ver = (await c.query(`SELECT COALESCE(max(version),0)::int + 1 AS n FROM pricing_rules WHERE kind = $1 AND scope_type = $2 AND scope_id IS NOT DISTINCT FROM $3`, [b.kind, b.scope_type, b.scope_id ?? null])).rows[0].n;
      const r = (await c.query(`INSERT INTO pricing_rules(kind, scope_type, scope_id, name, params, version, effective_from, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [b.kind, b.scope_type, b.scope_id ?? null, b.name, v.params, ver, b.effective_from ?? null, b.note ?? null, req.user!.id])).rows[0];
      await EVENT(c, r.id, 'created', req.user!.id, { version: ver });
      await audit(req.user!.id, 'pricing_rule.created', 'pricing_rule', r.id, { kind: b.kind, scope: b.scope_type }, c);
      return r.id as string;
    });
    return reply.code(201).send({ id });
  });

  /** Only a draft or rejected rule can be edited. `expected_updated_at` stops one administrator silently overwriting another's change. */
  app.put<{ Params: { id: string } }>('/pricing/rules/:id', { preHandler: edit }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ name: z.string().trim().min(2).max(120), params: z.unknown(), effective_from: z.string().datetime().nullish(), note: z.string().max(500).nullish(), expected_updated_at: z.string() }).parse(req.body);
    return tx(async (c) => {
      const r = (await c.query('SELECT * FROM pricing_rules WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!r) throw notFound('Rule not found');
      if (!['draft', 'rejected'].includes(r.status)) throw conflict('not_editable', 'A rule that has been submitted or activated cannot be edited. Create a new version instead.');
      if (new Date(r.updated_at).getTime() !== new Date(b.expected_updated_at).getTime()) throw conflict('changed_by_someone_else', 'Someone else changed this rule while you were editing. Reload it to see their change.');
      const v = validateParams(r.kind, b.params);
      if (!v.ok) throw bad('invalid_rule', v.errors.join(' '));
      await c.query(`UPDATE pricing_rules SET name = $2, params = $3, effective_from = $4, note = $5, updated_at = now(), status = 'draft' WHERE id = $1`, [id, b.name, v.params, b.effective_from ?? null, b.note ?? null]);
      await EVENT(c, id, 'edited', req.user!.id, { previous: r.params, next: v.params });
      await audit(req.user!.id, 'pricing_rule.edited', 'pricing_rule', id, {}, c);
      return { ok: true };
    });
  });

  /** A new version of a rule that is already live or retired: copies it as a fresh draft. */
  app.post<{ Params: { id: string } }>('/pricing/rules/:id/new-version', { preHandler: edit }, async (req, reply) => {
    const id = uuid.parse(req.params.id);
    const nid = await tx(async (c) => {
      const r = (await c.query('SELECT * FROM pricing_rules WHERE id = $1', [id])).rows[0];
      if (!r) throw notFound('Rule not found');
      const ver = (await c.query(`SELECT max(version)::int + 1 AS n FROM pricing_rules WHERE kind = $1 AND scope_type = $2 AND scope_id IS NOT DISTINCT FROM $3`, [r.kind, r.scope_type, r.scope_id])).rows[0].n;
      const n = (await c.query(`INSERT INTO pricing_rules(kind, scope_type, scope_id, name, params, version, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [r.kind, r.scope_type, r.scope_id, r.name, r.params, ver, `Copy of version ${r.version}`, req.user!.id])).rows[0];
      await EVENT(c, n.id, 'created', req.user!.id, { copied_from: id, version: ver });
      return n.id as string;
    });
    return reply.code(201).send({ id: nid });
  });

  app.post<{ Params: { id: string } }>('/pricing/rules/:id/submit', { preHandler: edit }, async (req) => {
    const id = uuid.parse(req.params.id);
    return tx(async (c) => {
      const r = (await c.query('SELECT * FROM pricing_rules WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!r) throw notFound('Rule not found');
      if (!['draft', 'rejected'].includes(r.status)) throw conflict('wrong_state', 'Only a draft can be submitted for approval.');
      const v = validateParams(r.kind, r.params);
      if (!v.ok) throw bad('invalid_rule', v.errors.join(' '));
      await c.query(`UPDATE pricing_rules SET status = 'pending_approval', submitted_by = $2, submitted_at = now(), updated_at = now() WHERE id = $1`, [id, req.user!.id]);
      await EVENT(c, id, 'submitted', req.user!.id);
      const who = (await c.query('SELECT full_name FROM users WHERE id = $1', [req.user!.id])).rows[0]?.full_name;
      await notifyStaff(c, { event: 'pricing_rule_pending', perm: 'pricing.approve', template: 'staff_pricing_rule_pending', vars: { name: r.name, kind: r.kind.replace('_', ' '), who }, key: `rule_submitted:${id}:${Date.now()}` });
      await audit(req.user!.id, 'pricing_rule.submitted', 'pricing_rule', id, {}, c);
      return { ok: true };
    });
  });

  /**
   * Activation. It takes effect from `effective_from` (default: now) for orders placed from then on; earlier orders keep their own snapshot.
   * The previous rule in the same scope stops applying at that moment, so exactly one rule is in force at any time.
   */
  app.post<{ Params: { id: string } }>('/pricing/rules/:id/approve', { preHandler: approve }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ effective_from: z.string().datetime().nullish(), confirm: z.literal(true) }).parse(req.body);
    const second = await getSetting<boolean>('finance.require_second_approver');
    return tx(async (c) => {
      const r = (await c.query('SELECT * FROM pricing_rules WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!r) throw notFound('Rule not found');
      if (r.status !== 'pending_approval') throw conflict('wrong_state', 'Submit the rule for approval first.');
      if (second && (r.created_by === req.user!.id || r.submitted_by === req.user!.id)) throw conflict('second_approver_required', 'A different administrator must approve this rule.');
      const v = validateParams(r.kind, r.params);
      if (!v.ok) throw bad('invalid_rule', v.errors.join(' '));
      const from = b.effective_from ? new Date(b.effective_from) : r.effective_from ? new Date(r.effective_from) : new Date();
      const eff = from.getTime() < Date.now() ? new Date() : from;   // never back-date: that would rewrite what orders were charged
      await c.query(`UPDATE pricing_rules SET effective_to = $5 WHERE kind = $1 AND scope_type = $2 AND scope_id IS NOT DISTINCT FROM $3 AND status IN ('active','retired') AND id <> $4 AND effective_from <= $5 AND (effective_to IS NULL OR effective_to > $5)`,
        [r.kind, r.scope_type, r.scope_id, id, eff]);
      await c.query(`UPDATE pricing_rules SET status = 'active', approved_by = $2, approved_at = now(), effective_from = $3, effective_to = NULL, updated_at = now() WHERE id = $1`, [id, req.user!.id, eff]);
      await EVENT(c, id, 'approved', req.user!.id, { effective_from: eff });
      await audit(req.user!.id, 'pricing_rule.approved', 'pricing_rule', id, { kind: r.kind, effective_from: eff }, c);
      return { ok: true, effective_from: eff };
    });
  });

  app.post<{ Params: { id: string } }>('/pricing/rules/:id/reject', { preHandler: approve }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ note: z.string().trim().min(3).max(500) }).parse(req.body);
    return tx(async (c) => {
      const r = await c.query(`UPDATE pricing_rules SET status = 'rejected', updated_at = now() WHERE id = $1 AND status = 'pending_approval' RETURNING id`, [id]);
      if (!r.rowCount) throw conflict('wrong_state', 'Only a rule waiting for approval can be rejected.');
      await EVENT(c, id, 'rejected', req.user!.id, { note: b.note });
      await audit(req.user!.id, 'pricing_rule.rejected', 'pricing_rule', id, { note: b.note }, c);
      return { ok: true };
    });
  });

  /** Stop a rule applying from now. Orders already placed keep their snapshot. */
  app.post<{ Params: { id: string } }>('/pricing/rules/:id/retire', { preHandler: approve }, async (req) => {
    const id = uuid.parse(req.params.id);
    return tx(async (c) => {
      const r = await c.query(`UPDATE pricing_rules SET effective_to = now(), status = 'retired', updated_at = now() WHERE id = $1 AND status = 'active' RETURNING id`, [id]);
      if (!r.rowCount) throw conflict('wrong_state', 'Only an active rule can be retired.');
      await EVENT(c, id, 'retired', req.user!.id);
      await audit(req.user!.id, 'pricing_rule.retired', 'pricing_rule', id, {}, c);
      return { ok: true };
    });
  });

  /**
   * The simulator. Same calculation as checkout, on invented numbers: it creates no order, charges nobody and activates nothing.
   * Rules can be given inline (to test a proposal) or left out to use whatever is live now.
   */
  app.post('/pricing/simulate', { preHandler: view }, async (req) => {
    const b = z.object({
      merchandise_cents: z.number().int().min(0).max(10_000_000), discount_cents: z.number().int().min(0).optional(), distance_km: z.number().min(0).max(1000).nullable().optional(),
      zone_fee_cents: z.number().int().min(0).nullable().optional(), tip_cents: z.number().int().min(0).optional(), waiting_minutes: z.number().min(0).optional(),
      tax_bps_merchandise: z.number().int().min(0).max(3000).optional(), tax_bps_delivery: z.number().int().min(0).max(3000).optional(),
      processing_bps: z.number().int().min(0).max(1000).optional(), processing_fixed_cents: z.number().int().min(0).max(1000).optional(), vendor_funded_discount: z.boolean().optional(),
      delivery: DeliveryParams.optional(), driver_pay: DriverPayParams.optional(), commission: CommissionParams.optional(), service_fee: ServiceFeeParams.nullish(),
      store_id: uuid.nullish(), vendor_id: uuid.nullish(), zone_id: uuid.nullish(),
    }).parse(req.body);
    const sc = { storeId: b.store_id, vendorId: b.vendor_id, zoneId: b.zone_id };
    const delivery = b.delivery ?? (await resolveRule(pool, 'delivery', sc))?.params;
    const driver = b.driver_pay ?? (await resolveRule(pool, 'driver_pay', sc))?.params;
    const commission = b.commission ?? (await resolveRule(pool, 'commission', sc))?.params ?? CommissionParams.parse({ bps: await getSetting<number>('commission.default_bps') });
    const sfee = b.service_fee === undefined ? (await resolveRule(pool, 'service_fee', sc))?.params ?? null : b.service_fee;
    if (!delivery) throw bad('invalid_rule', 'No delivery rule is live and none was supplied. Add one in the request or activate a rule.');
    if (!driver) throw bad('invalid_rule', 'No driver pay rule is live and none was supplied.');
    return simulate({ ...b, delivery, driver_pay: driver, commission, service_fee: sfee, distance_km: b.distance_km ?? null });
  });

  /** What is in force right now for a scope, and where it came from. */
  app.get<{ Querystring: { store_id?: string; vendor_id?: string; zone_id?: string } }>('/pricing/effective', { preHandler: view }, async (req) => {
    const sc = { storeId: req.query.store_id, vendorId: req.query.vendor_id, zoneId: req.query.zone_id };
    const out: Record<string, unknown> = {};
    for (const k of KINDS as readonly Kind[]) { const r = await resolveRule(pool, k, sc); out[k] = r ? { id: r.id, name: r.name, version: r.version, scope_type: r.scope_type, params: r.params } : null; }
    return out;
  });
};
