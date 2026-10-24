import { eraseDriver } from '../services/erase.js';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requirePerm } from '../lib/permissions.js';
import { bad, conflict, notFound } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { moveSuborder } from '../services/orders.js';
import { postPayout } from '../services/ledger.js';
import { createVendorPayout, holdDays, runAutoPayouts, settlePayout, vendorBalance } from '../services/payouts.js';
import { getProvider } from '../payments/provider.js';

const uuid = z.string().uuid();

export const adminOpsRoutes: FastifyPluginAsync = async (app) => {
  // ---- Drivers ----
  app.get('/drivers', { preHandler: requirePerm('drivers.manage') }, async () =>
    (await pool.query(`SELECT d.id, d.status, d.phone, d.vehicle, d.is_available, d.licence_verified, d.background_check_verified, u.full_name, u.email,
        (SELECT count(*)::int FROM deliveries x WHERE x.driver_id = d.id AND x.status IN ('assigned','picked_up')) AS active_jobs
        FROM drivers d JOIN users u ON u.id = d.user_id ORDER BY (d.status = 'applied') DESC, d.created_at DESC`)).rows);

  app.delete<{ Params: { id: string } }>('/drivers/:id', { preHandler: requirePerm('drivers.manage') }, async (req) => eraseDriver(req.user!.id, z.string().uuid().parse(req.params.id)));
  app.patch<{ Params: { id: string } }>('/drivers/:id', { preHandler: requirePerm('drivers.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ status: z.enum(['approved', 'suspended', 'rejected']).optional(), licence_verified: z.boolean().optional(), background_check_verified: z.boolean().optional() }).parse(req.body);
    return tx(async (c) => {
      const d = (await c.query('SELECT * FROM drivers WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!d) throw notFound('Driver not found');
      const next = { ...d, ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)) };
      if (next.status === 'approved' && !(next.licence_verified && next.background_check_verified))
        throw conflict('verification_required', 'Verify the driver’s licence and background check before approving.');
      await c.query('UPDATE drivers SET status=$2, licence_verified=$3, background_check_verified=$4, is_available = CASE WHEN $2 = \'approved\' THEN is_available ELSE false END WHERE id=$1', [id, next.status, next.licence_verified, next.background_check_verified]);
      if (next.status === 'approved') await c.query(`INSERT INTO user_roles(user_id, role) VALUES ($1,'driver') ON CONFLICT DO NOTHING`, [d.user_id]);
      else await c.query(`DELETE FROM user_roles WHERE user_id = $1 AND role = 'driver'`, [d.user_id]);
      await audit(req.user!.id, 'driver.updated', 'driver', id, b, c);
      return { id, status: next.status };
    });
  });

  // ---- Dispatch ----
  app.get('/dispatch', { preHandler: requirePerm('dispatch.manage') }, async () => {
    const jobs = (await pool.query(
      `SELECT d.id, d.status, d.created_at, d.assigned_at, d.earning_cents, d.pickup->>'store_name' AS store_name, d.pickup->>'address_line' AS pickup_address,
              d.dropoff->>'postal_code' AS dropoff_postal, d.dropoff->>'city' AS dropoff_city, o.order_number, s.promised_at, dr.id AS driver_id, u.full_name AS driver_name,
              (s.promised_at IS NOT NULL AND s.promised_at < now()) AS late
         FROM deliveries d JOIN suborders s ON s.id = d.suborder_id JOIN orders o ON o.id = s.order_id LEFT JOIN drivers dr ON dr.id = d.driver_id LEFT JOIN users u ON u.id = dr.user_id
        WHERE d.status IN ('unassigned','assigned','picked_up','failed') ORDER BY d.created_at`)).rows;
    const drivers = (await pool.query(`SELECT d.id, u.full_name, d.is_available, (SELECT count(*)::int FROM deliveries x WHERE x.driver_id = d.id AND x.status IN ('assigned','picked_up')) AS active_jobs
                                         FROM drivers d JOIN users u ON u.id = d.user_id WHERE d.status = 'approved' ORDER BY d.is_available DESC, u.full_name`)).rows;
    return { jobs, drivers };
  });

  app.post<{ Params: { id: string } }>('/deliveries/:id/assign', { preHandler: requirePerm('dispatch.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const { driver_id } = z.object({ driver_id: uuid }).parse(req.body);
    return tx(async (c) => {
      const d = (await c.query('SELECT * FROM deliveries WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!d) throw notFound('Delivery not found');
      if (!['unassigned', 'assigned', 'failed'].includes(d.status)) throw conflict('invalid_state', 'This delivery is already under way or finished.');
      const dr = (await c.query(`SELECT id FROM drivers WHERE id = $1 AND status = 'approved'`, [driver_id])).rows[0];
      if (!dr) throw bad('driver_not_approved', 'Only approved drivers can be assigned.');
      await c.query(`UPDATE deliveries SET driver_id=$2, status='assigned', assigned_at=now() WHERE id=$1`, [id, driver_id]);
      await c.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id) VALUES ($1,'assigned',$2)`, [id, req.user!.id]);
      await audit(req.user!.id, 'delivery.assigned', 'delivery', id, { driver_id }, c);
      return { id, status: 'assigned', driver_id };
    });
  });

  app.post<{ Params: { id: string } }>('/deliveries/:id/unassign', { preHandler: requirePerm('dispatch.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const r = await pool.query(`UPDATE deliveries SET driver_id=NULL, status='unassigned', assigned_at=NULL WHERE id=$1 AND status = 'assigned' RETURNING id`, [id]);
    if (!r.rowCount) throw conflict('invalid_state', 'Only assigned (not yet picked up) deliveries can be unassigned.');
    await pool.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id) VALUES ($1,'unassigned',$2)`, [id, req.user!.id]);
    return { id, status: 'unassigned' };
  });

  // Staff cancellation with refund (e.g. failed delivery, store no-show).
  app.post<{ Params: { sid: string } }>('/suborders/:sid/cancel', { preHandler: requirePerm('orders.manage') }, async (req) => {
    const sid = uuid.parse(req.params.sid);
    const { reason } = z.object({ reason: z.string().min(3).max(300) }).parse(req.body);
    const r = await tx(async (c, after) => {
      const res = await moveSuborder(c, after, sid, 'cancelled', { userId: req.user!.id, kind: 'staff' }, reason);
      await audit(req.user!.id, 'suborder.cancelled', 'suborder', sid, { reason }, c);
      return res;
    });
    return r;
  });

  // ---- Exceptions queue ----
  app.get('/exceptions', { preHandler: requirePerm('orders.view', 'dispatch.manage', 'support.manage') }, async () => {
    const accept = await getSetting<number>('vendor.accept_timeout_minutes');
    const [unaccepted, unassigned, failed, tickets, refunds, mismatches] = await Promise.all([
      pool.query(`SELECT s.id, o.order_number, st.name AS store_name, o.placed_at FROM suborders s JOIN orders o ON o.id = s.order_id JOIN stores st ON st.id = s.store_id
                   WHERE s.status = 'placed' AND o.placed_at < now() - make_interval(mins => $1) ORDER BY o.placed_at`, [accept]),
      pool.query(`SELECT d.id, o.order_number, d.created_at FROM deliveries d JOIN suborders s ON s.id = d.suborder_id JOIN orders o ON o.id = s.order_id WHERE d.status = 'unassigned' AND d.created_at < now() - interval '10 minutes'`),
      pool.query(`SELECT d.id, o.order_number, d.completion_note FROM deliveries d JOIN suborders s ON s.id = d.suborder_id JOIN orders o ON o.id = s.order_id WHERE d.status = 'failed'`),
      pool.query(`SELECT id, kind, category, subject, created_at FROM support_tickets WHERE status = 'open' ORDER BY created_at LIMIT 50`),
      pool.query(`SELECT r.id, o.order_number, r.amount_cents, r.reason FROM refunds r JOIN orders o ON o.id = r.order_id WHERE r.status IN ('requested','failed') ORDER BY r.created_at`),
      pool.query(`SELECT event_id, outcome, received_at FROM payment_events WHERE outcome IN ('amount_mismatch','unknown_payment') ORDER BY received_at DESC LIMIT 20`),
    ]);
    return { unaccepted_orders: unaccepted.rows, unassigned_deliveries: unassigned.rows, failed_deliveries: failed.rows, open_tickets: tickets.rows, refunds_waiting: refunds.rows, payment_anomalies: mismatches.rows };
  });

  // ---- Support tickets ----
  app.get('/tickets', { preHandler: requirePerm('support.manage') }, async (req) => {
    const { status } = z.object({ status: z.string().optional() }).parse(req.query);
    return (await pool.query(
      `SELECT t.id, t.kind, t.category, t.subject, t.status, t.created_at, t.updated_at, u.email, o.order_number FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id
         LEFT JOIN suborders s ON s.id = t.suborder_id LEFT JOIN orders o ON o.id = s.order_id WHERE ($1::text IS NULL OR t.status = $1) ORDER BY t.updated_at DESC LIMIT 200`, [status ?? null])).rows;
  });
  app.get<{ Params: { id: string } }>('/tickets/:id', { preHandler: requirePerm('support.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const t = (await pool.query(`SELECT t.*, u.email, o.id AS order_id, o.order_number FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN suborders s ON s.id = t.suborder_id LEFT JOIN orders o ON o.id = s.order_id WHERE t.id = $1`, [id])).rows[0];
    if (!t) throw notFound('Ticket not found');
    const messages = (await pool.query(`SELECT m.id, m.body, m.is_internal, m.created_at, u.full_name AS author FROM ticket_messages m LEFT JOIN users u ON u.id = m.author_user_id WHERE m.ticket_id = $1 ORDER BY m.id`, [id])).rows;
    return { ...t, messages };
  });
  app.post<{ Params: { id: string } }>('/tickets/:id/messages', { preHandler: requirePerm('support.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ body: z.string().min(1).max(1500), internal: z.boolean().default(false) }).parse(req.body);
    await pool.query('INSERT INTO ticket_messages(ticket_id, author_user_id, body, is_internal) VALUES ($1,$2,$3,$4)', [id, req.user!.id, b.body, b.internal]);
    await pool.query(`UPDATE support_tickets SET updated_at = now(), status = CASE WHEN $2 THEN status ELSE 'pending' END WHERE id = $1`, [id, b.internal]);
    return { ok: true };
  });
  app.patch<{ Params: { id: string } }>('/tickets/:id', { preHandler: requirePerm('support.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = z.object({ status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(), assign_to_me: z.boolean().optional() }).parse(req.body);
    await pool.query(`UPDATE support_tickets SET status = COALESCE($2, status), assigned_to = CASE WHEN $3 THEN $4::uuid ELSE assigned_to END, updated_at = now() WHERE id = $1`, [id, b.status ?? null, !!b.assign_to_me, req.user!.id]);
    await audit(req.user!.id, 'ticket.updated', 'ticket', id, b);
    return { ok: true };
  });

  // ---- Ledger, balances & payouts (finance) ----
  app.get('/finance/summary', { preHandler: requirePerm('ledger.view') }, async () => {
    const accounts = (await pool.query(`SELECT account, sum(amount_cents)::int AS balance_cents FROM ledger_entries GROUP BY account ORDER BY account`)).rows;
    const days = await holdDays('store'), kitchenDays = await holdDays('chef');
    const rows = (await pool.query(`SELECT v.id, v.name, v.kind, v.stripe_account_id IS NOT NULL AS has_payout_account, v.payout_status FROM vendors v WHERE EXISTS (SELECT 1 FROM suborders s WHERE s.vendor_id = v.id) ORDER BY v.name`)).rows;
    const vendors = [];
    for (const v of rows) { const b = await vendorBalance(v.id); vendors.push({ ...v, owed_cents: b.owed_cents, payable_now_cents: b.payable_now_cents, in_hold_cents: b.in_hold_cents }); }
    const drivers = (await pool.query(`SELECT d.id, u.full_name, COALESCE(sum(e.amount_cents) FILTER (WHERE e.payout_id IS NULL),0)::int AS unpaid_cents FROM drivers d JOIN users u ON u.id = d.user_id LEFT JOIN driver_earnings e ON e.driver_id = d.id GROUP BY d.id, u.full_name HAVING count(e.id) > 0`)).rows;
    const payouts = (await pool.query(`SELECT p.id, p.payee_type, p.amount_cents, p.status, p.created_at, p.trigger, p.attempts, p.note, v.name AS vendor_name FROM payouts p LEFT JOIN vendors v ON v.id = p.vendor_id ORDER BY p.created_at DESC LIMIT 50`)).rows;
    return { accounts, vendors, drivers, payouts, hold_days: days, hold_days_kitchen: kitchenDays, auto: { enabled: await getSetting<boolean>('payout.auto_enabled'), min_cents: await getSetting<number>('payout.auto_min_cents') } };
  });

  app.post<{ Params: { vendorId: string } }>('/payouts/vendor/:vendorId', { preHandler: requirePerm('payouts.manage') }, async (req, reply) => {
    const p = await createVendorPayout(uuid.parse(req.params.vendorId), req.user!.id, 'manual');
    return reply.code(201).send(await settlePayout(p.id, req.user!.id));
  });

  /** Try again after a failed transfer (for example the cook's account needed more details). */
  app.post<{ Params: { id: string } }>('/payouts/:id/retry', { preHandler: requirePerm('payouts.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const p = (await pool.query(`SELECT status FROM payouts WHERE id = $1`, [id])).rows[0];
    if (!p) throw notFound('Payout not found');
    if (p.status === 'paid') throw conflict('already_paid', 'This payout has already been paid.');
    return settlePayout(id, req.user!.id);
  });

  /** Run the automatic payout pass now (the same one that runs in the background when automatic payouts are turned on). */
  app.post('/payouts/run-auto', { preHandler: requirePerm('payouts.manage') }, async (req) => {
    const r = await runAutoPayouts();
    await audit(req.user!.id, 'payout.auto_run', 'payout', 'auto', r);
    return r;
  });

  app.post<{ Params: { driverId: string } }>('/payouts/driver/:driverId', { preHandler: requirePerm('payouts.manage') }, async (req, reply) => {
    const driverId = uuid.parse(req.params.driverId);
    const p = await tx(async (c) => {
      const es = (await c.query('SELECT id, amount_cents FROM driver_earnings WHERE driver_id = $1 AND payout_id IS NULL FOR UPDATE', [driverId])).rows;
      const amount = es.reduce((a, e) => a + e.amount_cents, 0);
      if (amount <= 0) throw bad('nothing_payable', 'No unpaid earnings.');
      const row = (await c.query(`INSERT INTO payouts(payee_type, driver_id, amount_cents, created_by) VALUES ('driver',$1,$2,$3) RETURNING *`, [driverId, amount, req.user!.id])).rows[0];
      await c.query('UPDATE driver_earnings SET payout_id = $2 WHERE id = ANY($1::uuid[])', [es.map((e) => e.id), row.id]);
      await audit(req.user!.id, 'payout.created', 'payout', row.id, { driverId, amount }, c);
      return row;
    });
    return reply.code(201).send(await settlePayout(p.id, req.user!.id));
  });

  app.post<{ Params: { id: string } }>('/payouts/:id/mark-paid', { preHandler: requirePerm('payouts.manage') }, async (req) => {
    const id = uuid.parse(req.params.id);
    const { reference } = z.object({ reference: z.string().min(2).max(100) }).parse(req.body);
    return tx(async (c) => {
      const p = (await c.query(`SELECT * FROM payouts WHERE id = $1 AND status IN ('pending','failed') FOR UPDATE`, [id])).rows[0];
      if (!p) throw conflict('not_pending', 'This payout is not waiting to be paid.');
      await c.query(`UPDATE payouts SET status='paid', provider_transfer_id=$2, paid_at=now(), note='Paid manually' WHERE id=$1`, [id, reference]);
      await postPayout(c, { id, payee_type: p.payee_type, vendor_id: p.vendor_id, driver_id: p.driver_id, amount: p.amount_cents });
      await audit(req.user!.id, 'payout.marked_paid', 'payout', id, { reference }, c);
      return { id, status: 'paid' };
    });
  });

  app.get('/ledger', { preHandler: requirePerm('ledger.view') }, async (req) => {
    const q = z.object({ order_number: z.string().optional() }).parse(req.query);
    return (await pool.query(
      `SELECT l.id, l.txn_id, l.account, l.amount_cents, l.kind, l.created_at, o.order_number, v.name AS vendor_name FROM ledger_entries l LEFT JOIN orders o ON o.id = l.order_id LEFT JOIN vendors v ON v.id = l.vendor_id
        WHERE ($1::text IS NULL OR o.order_number = $1) ORDER BY l.id DESC LIMIT 300`, [q.order_number ?? null])).rows;
  });
};
