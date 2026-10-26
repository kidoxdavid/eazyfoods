import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requirePerm } from '../lib/permissions.js';
import { conflict, notFound } from '../lib/errors.js';
import { approvePayout, cancelPayout, driverStatement, movements, reconcile, vendorSettlementPreview, vendorStatement } from '../services/settlements.js';

const uuid = z.string().uuid();
const dates = z.object({ from: z.string().optional(), to: z.string().optional() });

/** Settlement previews, approvals, holds, statements and reconciliation for the finance team. */
export const adminSettlementRoutes: FastifyPluginAsync = async (app) => {
  const read = requirePerm('settlements.view', 'ledger.view', 'payouts.manage');
  const manage = requirePerm('payouts.manage');
  const approve = requirePerm('payouts.approve');

  app.get<{ Params: { id: string } }>('/settlements/vendors/:id/preview', { preHandler: read }, async (req) => vendorSettlementPreview(uuid.parse(req.params.id)));

  /** Everything that needs a person: payouts waiting for approval, failed, or pending. */
  app.get('/settlements/queue', { preHandler: read }, async () => (await pool.query(
    `SELECT p.id, p.payee_type, p.amount_cents, p.status, p.created_at, p.attempts, p.note, p.trigger, COALESCE(v.name, u.full_name) AS payee, cu.full_name AS created_by_name
       FROM payouts p LEFT JOIN vendors v ON v.id = p.vendor_id LEFT JOIN drivers d ON d.id = p.driver_id LEFT JOIN users u ON u.id = d.user_id LEFT JOIN users cu ON cu.id = p.created_by
      WHERE p.status IN ('awaiting_approval','pending','failed') ORDER BY (p.status = 'awaiting_approval') DESC, p.created_at`)).rows);

  app.post<{ Params: { id: string } }>('/payouts/:id/approve', { preHandler: approve }, async (req) => approvePayout(uuid.parse(req.params.id), req.user!.id));
  app.post<{ Params: { id: string } }>('/payouts/:id/cancel', { preHandler: approve }, async (req) => {
    const { note } = z.object({ note: z.string().trim().min(3).max(300) }).parse(req.body);
    return cancelPayout(uuid.parse(req.params.id), req.user!.id, note);
  });

  /* Holds: finance can stop a payee being paid; releasing it needs the approve permission. */
  app.get('/holds', { preHandler: read }, async () => (await pool.query(
    `SELECT h.id, h.payee_type, h.reason, h.created_at, COALESCE(v.name, u.full_name) AS payee, cu.full_name AS created_by_name
       FROM payout_holds h LEFT JOIN vendors v ON v.id = h.vendor_id LEFT JOIN drivers d ON d.id = h.driver_id LEFT JOIN users u ON u.id = d.user_id LEFT JOIN users cu ON cu.id = h.created_by
      WHERE h.released_at IS NULL ORDER BY h.created_at DESC`)).rows);
  app.post('/holds', { preHandler: manage }, async (req, reply) => {
    const b = z.object({ payee_type: z.enum(['vendor', 'driver']), vendor_id: uuid.optional(), driver_id: uuid.optional(), reason: z.string().trim().min(3).max(300) }).parse(req.body);
    const id = b.payee_type === 'vendor' ? b.vendor_id : b.driver_id;
    if (!id) throw conflict('missing_payee', 'Choose who the hold is for.');
    const r = (await pool.query(`INSERT INTO payout_holds(payee_type, vendor_id, driver_id, reason, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [b.payee_type, b.payee_type === 'vendor' ? id : null, b.payee_type === 'driver' ? id : null, b.reason, req.user!.id])).rows[0];
    await audit(req.user!.id, 'payout_hold.placed', 'payout_hold', r.id, { payee_type: b.payee_type, payee: id, reason: b.reason });
    return reply.code(201).send({ id: r.id });
  });
  app.post<{ Params: { id: string } }>('/holds/:id/release', { preHandler: approve }, async (req) => {
    const id = uuid.parse(req.params.id);
    const r = await pool.query(`UPDATE payout_holds SET released_at = now(), released_by = $2 WHERE id = $1 AND released_at IS NULL RETURNING id`, [id, req.user!.id]);
    if (!r.rowCount) throw notFound('Hold not found or already released');
    await audit(req.user!.id, 'payout_hold.released', 'payout_hold', id);
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/statements/vendor/:id', { preHandler: read }, async (req) => { const q = dates.parse(req.query); return vendorStatement(uuid.parse(req.params.id), q.from, q.to); });
  app.get<{ Params: { id: string } }>('/statements/driver/:id', { preHandler: read }, async (req) => { const q = dates.parse(req.query); return driverStatement(uuid.parse(req.params.id), q.from, q.to); });

  app.get('/reconciliation', { preHandler: read }, async () => reconcile());
  /** Record what finance did about a difference. Append-only; the difference itself stays visible until the data is fixed. */
  app.post('/reconciliation/notes', { preHandler: manage }, async (req, reply) => {
    const b = z.object({ key: z.string().min(3).max(200), action: z.enum(['acknowledged', 'resolved', 'note']), note: z.string().trim().min(3).max(500) }).parse(req.body);
    await pool.query('INSERT INTO finance_exception_notes(exception_key, action, note, actor_id) VALUES ($1,$2,$3,$4)', [b.key, b.action, b.note, req.user!.id]);
    await audit(req.user!.id, 'reconciliation.note', 'reconciliation', b.key, { action: b.action });
    return reply.code(201).send({ ok: true });
  });
  app.get('/reconciliation/movements.csv', { preHandler: requirePerm('ledger.view', 'payouts.manage') }, async (req, reply) => {
    const q = dates.parse(req.query);
    const rows = await movements(q.from, q.to);
    const esc = (v: unknown) => { const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ['date', 'type', 'provider', 'provider_reference', 'amount_cad', 'our_reference', 'in_ledger'];
    const csv = [head.join(','), ...rows.map((r) => [r.at, r.type, r.provider, r.provider_ref, (r.amount_cents / 100).toFixed(2), r.reference, r.in_ledger].map(esc).join(','))].join('\n');
    await audit(req.user!.id, 'finance.export', 'reconciliation', 'movements', { rows: rows.length });
    return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', 'attachment; filename="movements.csv"').send(csv);
  });
};
