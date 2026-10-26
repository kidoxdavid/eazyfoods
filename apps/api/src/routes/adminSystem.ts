import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requirePerm, ROLE_PERMS } from '../lib/permissions.js';
import { bad, conflict, notFound } from '../lib/errors.js';
import { config } from '../config.js';
import { hashPassword } from '../lib/password.js';
import { eraseUser } from '../services/erase.js';
import { creditBalance } from '../services/credit.js';
import { getProvider } from '../payments/provider.js';

const uuid = z.string().uuid();
const int = (min: number, max: number) => z.number().int().min(min).max(max);

/** Every commercial rule is configurable, but only within sane, validated ranges. Unknown keys are refused. */
export const SETTING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'currency': z.literal('CAD'),
  'tax.rates_bps': z.object({ zero_rated: int(0, 3000), standard: int(0, 3000) }),
  'commission.default_bps': int(0, 5000),
  'checkout.reservation_minutes': int(5, 60),
  'vendor.accept_timeout_minutes': int(1, 240),
  'vendor.auto_reject_minutes': int(5, 720),
  'vendor.require_verified_docs': z.boolean(),
  'ordering.require_open': z.boolean(),
  'driver.pay_per_delivery_cents': int(0, 10000),
  'payout.hold_days': int(0, 30),
  'ads.min_cpc_cents': int(1, 5000),
  'ads.min_budget_cents': int(100, 1000000),
  'vendor.agreement_version': z.string().min(1).max(40),
  'kitchens.enabled': z.boolean(),
  'payout.hold_days_kitchen': int(0, 30),
  'payout.auto_enabled': z.boolean(),
  'payout.auto_min_cents': int(100, 1000000),
  'payout.approval_threshold_cents': int(0, 100000000),
};

export const adminSystemRoutes: FastifyPluginAsync = async (app) => {
  // ---------- Settings ----------
  app.get('/settings', { preHandler: requirePerm('settings.view') }, async () => (await pool.query('SELECT key, value, updated_at FROM app_settings ORDER BY key')).rows.filter((r) => r.key in SETTING_SCHEMAS));

  app.put<{ Params: { key: string } }>('/settings/:key', { preHandler: requirePerm('settings.manage') }, async (req) => {
    const key = req.params.key;
    const schema = SETTING_SCHEMAS[key];
    if (!schema) throw notFound('Unknown setting');
    const value = schema.parse((req.body as any)?.value);
    return tx(async (c) => {
      const old = (await c.query('SELECT value FROM app_settings WHERE key = $1 FOR UPDATE', [key])).rows[0]?.value;
      await c.query('INSERT INTO app_settings(key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()', [key, JSON.stringify(value)]);
      await audit(req.user!.id, 'setting.changed', 'setting', key, { old, new: value }, c);
      return { key, value };
    });
  });

  // ---------- Users & roles ----------
  app.get('/users', { preHandler: requirePerm('users.view') }, async (req) => {
    const { q } = z.object({ q: z.string().max(80).optional() }).parse(req.query);
    return (await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at, u.disabled_at IS NOT NULL AS disabled,
              COALESCE(array_agg(DISTINCT r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
         FROM users u LEFT JOIN user_roles r ON r.user_id = u.id WHERE $1::text IS NULL OR u.email ILIKE '%'||$1||'%' OR u.full_name ILIKE '%'||$1||'%' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100`, [q ?? null])).rows;
  });

  // An admin creates sign-ins for staff (admin, marketing, support...). These accounts have no shopping role and are not created by any sign-up window.
  app.post('/users', { preHandler: requirePerm('settings.manage') }, async (req, reply) => {
    const b = z.object({ email: z.string().email().max(254), full_name: z.string().trim().min(1).max(120), password: z.string().min(10).max(200),
      role: z.enum(['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing']) }).parse(req.body);
    const hash = await hashPassword(b.password);
    try {
      const id = await tx(async (c) => {
        const u = (await c.query('INSERT INTO users(email, password_hash, full_name, email_verified_at) VALUES ($1,$2,$3, now()) RETURNING id', [b.email.toLowerCase(), hash, b.full_name])).rows[0].id;
        await c.query('INSERT INTO user_roles(user_id, role) VALUES ($1,$2)', [u, b.role]);
        await audit(req.user!.id, 'user.created', 'user', u, { role: b.role }, c);
        return u as string;
      });
      return reply.code(201).send({ id });
    } catch (e: any) {
      if (e.code === '23505') throw conflict('email_taken', 'An account with this email already exists. Open it in the list and add the role instead.');
      throw e;
    }
  });

  app.post<{ Params: { id: string } }>('/users/:id/roles', { preHandler: requirePerm('settings.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const { role } = z.object({ role: z.enum(['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing']) }).parse(req.body);
    await pool.query('INSERT INTO user_roles(user_id, role) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, role]);
    await audit(req.user!.id, 'role.granted', 'user', id, { role });
    return { ok: true };
  });
  app.delete<{ Params: { id: string; role: string } }>('/users/:id/roles/:role', { preHandler: requirePerm('settings.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const role = z.enum(['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing']).parse(req.params.role);
    if (role === 'admin') {
      const n = (await pool.query(`SELECT count(*)::int n FROM user_roles WHERE role = 'admin'`)).rows[0].n;
      if (n <= 1) throw conflict('last_admin', 'There must always be at least one admin.');
    }
    await pool.query('DELETE FROM user_roles WHERE user_id = $1 AND role = $2', [id, role]);
    await audit(req.user!.id, 'role.revoked', 'user', id, { role });
    return { ok: true };
  });
  // Delete = remove completely when nothing refers to it, otherwise close it and scrub personal details (see services/erase.ts). The answer says which.
  app.delete<{ Params: { id: string } }>('/users/:id', { preHandler: requirePerm('settings.manage') }, async (req) => eraseUser(req.user!.id, uuid.parse(req.params.id)));
  app.get('/roles', { preHandler: requirePerm('users.view') }, async () => ROLE_PERMS);
  app.patch<{ Params: { id: string } }>('/users/:id/disabled', { preHandler: requirePerm('settings.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const { disabled } = z.object({ disabled: z.boolean() }).parse(req.body);
    if (id === req.user!.id) throw bad('self', 'You cannot disable your own account.');
    await pool.query('UPDATE users SET disabled_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1', [id, disabled]);
    if (disabled) await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await audit(req.user!.id, disabled ? 'user.disabled' : 'user.enabled', 'user', id);
    return { ok: true };
  });

  // Payout account (set after Stripe Connect onboarding; finance only).
  app.patch<{ Params: { id: string } }>('/vendors/:id/payout-account', { preHandler: requirePerm('payouts.manage') }, async (req) => {
    const { stripe_account_id } = z.object({ stripe_account_id: z.string().regex(/^acct_[A-Za-z0-9]+$/).nullable() }).parse(req.body);
    const r = await pool.query(`UPDATE vendors SET stripe_account_id = $2, payout_status = CASE WHEN $2::text IS NULL THEN 'none' ELSE 'enabled' END WHERE id = $1 RETURNING id`, [uuid.parse(req.params.id), stripe_account_id]);
    if (!r.rowCount) throw notFound('Vendor not found');
    await audit(req.user!.id, 'vendor.payout_account_set', 'vendor', req.params.id, { connected: !!stripe_account_id });
    return { ok: true };
  });

  // ---------- Audit log ----------
  app.get('/audit', { preHandler: requirePerm('audit.view') }, async (req) => {
    const q = z.object({ entity_type: z.string().optional(), action: z.string().optional() }).parse(req.query);
    return (await pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.created_at, u.email AS actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id
        WHERE ($1::text IS NULL OR a.entity_type = $1) AND ($2::text IS NULL OR a.action LIKE $2 || '%') ORDER BY a.id DESC LIMIT 200`, [q.entity_type ?? null, q.action ?? null])).rows;
  });

  // ---------- System health & integration status ----------
  app.get('/system', { preHandler: requirePerm('settings.view', 'orders.view') }, async () => {
    const one = async (sql: string) => (await pool.query(sql)).rows[0];
    const [db, outbox, stale, anomalies, lastEvent, jobs] = await Promise.all([
      one('SELECT now() AS now'),
      one(`SELECT count(*) FILTER (WHERE status='pending')::int AS pending, count(*) FILTER (WHERE status='failed')::int AS failed FROM notifications`),
      one(`SELECT count(*)::int AS n FROM inventory_reservations WHERE status='held' AND expires_at < now() - interval '5 minutes'`),
      one(`SELECT count(*)::int AS n FROM payment_events WHERE outcome IN ('amount_mismatch','unknown_payment') AND received_at > now() - interval '24 hours'`),
      one(`SELECT max(received_at) AS at FROM payment_events`),
      one(`SELECT count(*)::int AS n FROM payments WHERE status = 'requires_payment' AND created_at < now() - interval '1 hour'`),
    ]);
    const errors = (await pool.query('SELECT id, message, method, url, created_at FROM error_events ORDER BY id DESC LIMIT 20')).rows;
    const errors24 = (await pool.query(`SELECT count(*)::int n FROM error_events WHERE created_at > now() - interval '24 hours'`)).rows[0].n;
    const provider = getProvider();
    const integ = (name: string, configured: boolean, note: string) => ({ name, configured, note });
    return {
      database: { ok: true, time: db.now },
      checks: [
        { name: 'Email outbox backlog', ok: outbox.pending < 50, detail: `${outbox.pending} pending, ${outbox.failed} failed` },
        { name: 'Expired stock holds not released', ok: stale.n === 0, detail: `${stale.n} stale (the background job should clear these)` },
        { name: 'Payment anomalies (24h)', ok: anomalies.n === 0, detail: `${anomalies.n} mismatched or unknown provider events` },
        { name: 'Server errors (24h)', ok: errors24 === 0, detail: `${errors24} logged` },
        { name: 'Payments waiting over an hour', ok: jobs.n < 20, detail: `${jobs.n}` },
      ],
      last_payment_event_at: lastEvent.at, errors_24h: errors24, recent_errors: errors,
      integrations: [
        integ('Payments', provider.name === 'stripe', provider.name === 'mock' ? 'DEVELOPMENT MOCK. No real payments can be taken.' : 'Stripe configured. Verify with the test-mode checklist in docs/PAYMENTS.md.'),
        integ('Email', config.EMAIL_TRANSPORT === 'resend' && !!config.RESEND_API_KEY, config.EMAIL_TRANSPORT === 'log' ? 'Emails are only logged, not sent.' : 'Resend configured.'),
        integ('Error monitoring', !!config.SENTRY_DSN, config.SENTRY_DSN ? 'Sentry enabled.' : 'Not configured (set SENTRY_DSN).'),
        integ('Image storage', false, 'Local disk. Move to S3-compatible storage before running more than one server.'),
        integ('Background jobs', !config.DISABLE_BACKGROUND_JOBS, config.DISABLE_BACKGROUND_JOBS ? 'Disabled.' : 'Running in-process (expiry, email, vendor timeouts).'),
      ],
    };
  });

  // ---------- Vendor-sales CRM (internal) ----------
  const crm = requirePerm('crm.manage');
  const stage = z.enum(['identified', 'contacted', 'demo', 'onboarding', 'launched', 'lost']);
  app.get('/crm/prospects', { preHandler: crm }, async (req) => {
    const { stage: s } = z.object({ stage: stage.optional() }).parse(req.query);
    return (await pool.query(`SELECT id, business_name, contact_name, phone, email, address, regions, source, stage, next_action, next_action_at, last_contact_at, vendor_id, created_at,
        (next_action_at IS NOT NULL AND next_action_at < now() AND stage NOT IN ('launched','lost')) AS overdue FROM vendor_prospects WHERE ($1::text IS NULL OR stage = $1) ORDER BY (next_action_at IS NULL), next_action_at, created_at DESC LIMIT 300`, [s ?? null])).rows;
  });
  app.post('/crm/prospects', { preHandler: crm }, async (req, reply) => {
    const b = z.object({ business_name: z.string().min(2).max(160), contact_name: z.string().max(120).optional(), phone: z.string().max(30).optional(), email: z.string().email().optional(), address: z.string().max(200).optional(),
      regions: z.array(z.string()).default([]), source: z.string().max(80).optional(), next_action: z.string().max(200).optional(), next_action_at: z.coerce.date().optional() }).parse(req.body);
    const r = await pool.query(`INSERT INTO vendor_prospects(business_name, contact_name, phone, email, address, regions, source, next_action, next_action_at, owner_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [b.business_name, b.contact_name ?? null, b.phone ?? null, b.email ?? null, b.address ?? null, b.regions, b.source ?? null, b.next_action ?? null, b.next_action_at ?? null, req.user!.id]);
    return reply.code(201).send({ id: r.rows[0].id });
  });
  app.get<{ Params: { id: string } }>('/crm/prospects/:id', { preHandler: crm }, async (req) => {
    const id = uuid.parse(req.params.id);
    const p = (await pool.query('SELECT * FROM vendor_prospects WHERE id = $1', [id])).rows[0];
    if (!p) throw notFound('Prospect not found');
    const acts = (await pool.query(`SELECT a.id, a.kind, a.note, a.created_at, u.full_name AS by FROM prospect_activities a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.prospect_id = $1 ORDER BY a.id DESC`, [id])).rows;
    return { ...p, activities: acts };
  });
  app.patch<{ Params: { id: string } }>('/crm/prospects/:id', { preHandler: crm }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ stage: stage.optional(), next_action: z.string().max(200).nullable().optional(), next_action_at: z.coerce.date().nullable().optional(), vendor_id: uuid.nullable().optional() }).parse(req.body);
    await tx(async (c) => {
      const cur = (await c.query('SELECT stage FROM vendor_prospects WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!cur) throw notFound('Prospect not found');
      await c.query(`UPDATE vendor_prospects SET stage = COALESCE($2, stage), next_action = CASE WHEN $3 THEN $4 ELSE next_action END, next_action_at = CASE WHEN $5 THEN $6 ELSE next_action_at END,
        vendor_id = CASE WHEN $7 THEN $8::uuid ELSE vendor_id END, launched_at = CASE WHEN $2 = 'launched' THEN COALESCE(launched_at, now()) ELSE launched_at END WHERE id = $1`,
        [id, b.stage ?? null, b.next_action !== undefined, b.next_action ?? null, b.next_action_at !== undefined, b.next_action_at ?? null, b.vendor_id !== undefined, b.vendor_id ?? null]);
      if (b.stage && b.stage !== cur.stage) await c.query(`INSERT INTO prospect_activities(prospect_id, kind, note, actor_user_id) VALUES ($1,'stage_change',$2,$3)`, [id, `${cur.stage} → ${b.stage}`, req.user!.id]);
    });
    return { ok: true };
  });
  app.post<{ Params: { id: string } }>('/crm/prospects/:id/activities', { preHandler: crm }, async (req, reply) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ kind: z.enum(['call', 'visit', 'email', 'demo', 'note']), note: z.string().min(1).max(2000), next_action: z.string().max(200).optional(), next_action_at: z.coerce.date().optional() }).parse(req.body);
    await tx(async (c) => {
      await c.query('INSERT INTO prospect_activities(prospect_id, kind, note, actor_user_id) VALUES ($1,$2,$3,$4)', [id, b.kind, b.note, req.user!.id]);
      await c.query(`UPDATE vendor_prospects SET last_contact_at = CASE WHEN $2 <> 'note' THEN now() ELSE last_contact_at END, stage = CASE WHEN stage = 'identified' AND $2 <> 'note' THEN 'contacted' ELSE stage END,
        next_action = COALESCE($3, next_action), next_action_at = COALESCE($4, next_action_at) WHERE id = $1`, [id, b.kind, b.next_action ?? null, b.next_action_at ?? null]);
    });
    return reply.code(201).send({ ok: true });
  });
  // ---- Customer reviews: moderation (vendors can report a review; this is where it lands) ----
  app.get<{ Querystring: { filter?: string } }>('/reviews', { preHandler: requirePerm('support.manage') }, async (req) => {
    const f = z.enum(['reported', 'hidden', 'all']).catch('reported').parse(req.query.filter);
    const where = f === 'reported' ? 'r.vendor_reported_at IS NOT NULL AND NOT r.is_hidden' : f === 'hidden' ? 'r.is_hidden' : 'true';
    return (await pool.query(`SELECT r.id, r.rating, r.body, r.is_hidden, r.created_at, r.vendor_response, r.vendor_report_reason, r.vendor_reported_at, s.name AS store_name, p.name AS product_name, u.full_name AS customer
        FROM reviews r JOIN stores s ON s.id = r.store_id JOIN users u ON u.id = r.user_id LEFT JOIN products p ON p.id = r.product_id WHERE ${where} ORDER BY COALESCE(r.vendor_reported_at, r.created_at) DESC LIMIT 200`)).rows;
  });
  app.patch<{ Params: { id: string } }>('/reviews/:id', { preHandler: requirePerm('support.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ is_hidden: z.boolean().optional(), dismiss_report: z.boolean().optional() }).parse(req.body);
    const r = await pool.query(`UPDATE reviews SET is_hidden = COALESCE($2, is_hidden), vendor_reported_at = CASE WHEN $3 THEN NULL ELSE vendor_reported_at END, vendor_report_reason = CASE WHEN $3 THEN NULL ELSE vendor_report_reason END WHERE id = $1 RETURNING id, is_hidden`, [id, b.is_hidden ?? null, !!b.dismiss_report]);
    if (!r.rowCount) throw notFound('Review not found');
    await audit(req.user!.id, 'review.moderated', 'review', id, b);
    return r.rows[0];
  });

  // ---- Customers: a support view of one shopper (no card data exists here) ----
  app.get<{ Querystring: { q?: string } }>('/customers', { preHandler: requirePerm('users.view') }, async (req) => {
    const q = (req.query.q ?? '').trim();
    return (await pool.query(`SELECT u.id, u.full_name, u.email, u.created_at, (u.disabled_at IS NOT NULL) AS disabled,
        (SELECT count(*)::int FROM orders o WHERE o.user_id = u.id AND o.payment_status IN ('paid','partially_refunded','refunded')) AS orders,
        (SELECT COALESCE(sum(o.total_cents),0)::int FROM orders o WHERE o.user_id = u.id AND o.payment_status IN ('paid','partially_refunded')) AS spent_cents
        FROM users u WHERE NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role IN ('admin','support','finance','dispatcher','catalog','marketing','vendor_owner','vendor_staff','driver'))
        AND ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR u.full_name ILIKE '%' || $1 || '%') ORDER BY u.created_at DESC LIMIT 100`, [q])).rows;
  });
  app.get<{ Params: { id: string } }>('/customers/:id', { preHandler: requirePerm('users.view') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const u = (await pool.query('SELECT id, full_name, email, created_at, (disabled_at IS NOT NULL) AS disabled FROM users WHERE id = $1', [id])).rows[0];
    if (!u) throw notFound('Customer not found');
    const [orders, tickets, reviews] = await Promise.all([
      pool.query(`SELECT id, order_number, status, payment_status, total_cents, created_at AS placed_at FROM orders WHERE user_id = $1 AND status <> 'pending_payment' ORDER BY created_at DESC LIMIT 20`, [id]),
      pool.query(`SELECT id, subject, status, created_at FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
      pool.query('SELECT count(*)::int AS n, round(avg(rating),1)::float AS avg FROM reviews WHERE user_id = $1', [id]),
    ]);
    return { ...u, credit_cents: await creditBalance(pool, id), orders: orders.rows, tickets: tickets.rows, reviews: reviews.rows[0] };
  });

  // ---- Gift cards sold ----
  app.get('/gift-cards', { preHandler: requirePerm('ledger.view') }, async () =>
    (await pool.query(`SELECT g.id, g.amount_cents, g.status, g.recipient_name, g.recipient_email, g.created_at, g.paid_at, u.full_name AS buyer, u.email AS buyer_email
        FROM gift_purchases g JOIN users u ON u.id = g.buyer_id ORDER BY g.created_at DESC LIMIT 200`)).rows);
};
