import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { requireLogin } from '../lib/permissions.js';
import { bad, conflict, forbidden, notFound } from '../lib/errors.js';
import { moveSuborder } from '../services/orders.js';
import { postDriverEarning } from '../services/ledger.js';
import { featureOn, requireFeature } from '../services/features.js';

async function me(req: FastifyRequest) {
  const d = (await pool.query('SELECT * FROM drivers WHERE user_id = $1', [req.user!.id])).rows[0];
  return d ?? null;
}
async function approvedDriver(req: FastifyRequest) {
  const d = await me(req);
  if (!d || d.status !== 'approved') throw forbidden('Your driver account is not approved yet.');
  return d;
}

const JOB_SQL = `
  SELECT d.id, d.status, d.instructions, d.earning_cents, s.tip_cents, d.pickup, d.created_at, d.assigned_at, d.picked_up_at, d.delivered_at,
         jsonb_build_object('line1', d.dropoff->>'line1', 'line2', d.dropoff->>'line2', 'city', d.dropoff->>'city', 'postal_code', d.dropoff->>'postal_code',
                            'first_name', split_part(d.dropoff->>'recipient_name',' ',1), 'phone', d.dropoff->>'phone') AS dropoff,
         o.order_number, s.promised_at, s.status AS suborder_status
    FROM deliveries d JOIN suborders s ON s.id = d.suborder_id JOIN orders o ON o.id = s.order_id`;

export const driverRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  app.post('/driver/apply', async (req, reply) => {
    const b = z.object({ phone: z.string().min(7).max(25), vehicle: z.string().max(80).optional() }).parse(req.body);
    const r = await pool.query(`INSERT INTO drivers(user_id, phone, vehicle) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO NOTHING RETURNING id`, [req.user!.id, b.phone, b.vehicle ?? null]);
    if (!r.rowCount) throw conflict('already_applied', 'You have already applied.');
    return reply.code(201).send({ ok: true, status: 'applied' });
  });

  app.get('/driver/me', async (req) => {
    const d = await me(req);
    if (!d) return { status: 'none' };
    return { id: d.id, status: d.status, phone: d.phone, vehicle: d.vehicle, is_available: d.is_available, licence_verified: d.licence_verified, background_check_verified: d.background_check_verified, nav_app: d.nav_app, share_location: d.share_location };
  });

  app.put('/driver/availability', async (req) => {
    const d = await approvedDriver(req);
    const { available } = z.object({ available: z.boolean() }).parse(req.body);
    await pool.query('UPDATE drivers SET is_available = $2 WHERE id = $1', [d.id, available]);
    return { is_available: available };
  });

  // A driver only ever sees jobs assigned to them, and only the customer details needed to deliver.
  app.get('/driver/jobs', async (req) => {
    const d = await approvedDriver(req);
    const { scope } = z.object({ scope: z.enum(['active', 'history']).default('active') }).parse(req.query);
    const where = scope === 'active' ? `d.status IN ('assigned','picked_up')` : `d.status IN ('delivered','failed')`;
    return (await pool.query(`${JOB_SQL} WHERE d.driver_id = $1 AND ${where} ORDER BY d.assigned_at DESC LIMIT 100`, [d.id])).rows;
  });

  const ownJob = async (req: FastifyRequest, id: string) => {
    const d = await approvedDriver(req);
    const j = (await pool.query('SELECT d.*, s.order_id FROM deliveries d JOIN suborders s ON s.id = d.suborder_id WHERE d.id = $1', [id])).rows[0];
    if (!j || j.driver_id !== d.id) throw notFound('Job not found');   // 404, not 403: do not reveal other drivers' jobs
    return { d, j };
  };
  const jobId = (req: any) => z.string().uuid().parse(req.params.id);

  app.post('/driver/jobs/:id/pickup', async (req) => {
    const { j } = await ownJob(req, jobId(req));
    if (j.status !== 'assigned') throw conflict('invalid_state', 'This job is not waiting for pickup.');
    return tx(async (c, after) => {
      await moveSuborder(c, after, j.suborder_id, 'out_for_delivery', { userId: req.user!.id, kind: 'driver' });
      await c.query(`UPDATE deliveries SET status='picked_up', picked_up_at=now() WHERE id=$1`, [j.id]);
      await c.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id) VALUES ($1,'picked_up',$2)`, [j.id, req.user!.id]);
      return { ok: true, status: 'picked_up' };
    });
  });

  app.post('/driver/jobs/:id/deliver', async (req) => {
    const b = z.object({ code: z.string().max(10).optional(), bypass_reason: z.string().min(5).max(300).optional() }).parse(req.body);
    const { d, j } = await ownJob(req, jobId(req));
    if (j.status !== 'picked_up') throw conflict('invalid_state', 'Pick up the order first.');
    const bypass = !b.code;
    if (bypass && !b.bypass_reason) throw bad('code_required', 'Enter the 4-digit code from the customer, or explain why you cannot.');
    if (!bypass && b.code !== j.handover_code) throw bad('wrong_code', 'That code does not match. Ask the customer to check their order page.');
    return tx(async (c, after) => {
      await moveSuborder(c, after, j.suborder_id, 'delivered', { userId: req.user!.id, kind: 'driver' }, null);
      await c.query(`UPDATE deliveries SET status='delivered', delivered_at=now(), code_bypassed=$2, completion_note=$3 WHERE id=$1`, [j.id, bypass, b.bypass_reason ?? null]);
      await c.query('DELETE FROM delivery_locations WHERE delivery_id = $1', [j.id]);
      await c.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id, note) VALUES ($1,'delivered',$2,$3)`, [j.id, req.user!.id, bypass ? `CODE BYPASSED: ${b.bypass_reason}` : null]);
      // The customer's tip is released to the driver now that the order is delivered (unless it was refunded earlier).
      const tip = (await c.query('SELECT CASE WHEN tip_refunded THEN 0 ELSE tip_cents END AS t FROM suborders WHERE id = $1 FOR UPDATE', [j.suborder_id])).rows[0].t as number;
      await c.query('INSERT INTO driver_earnings(driver_id, delivery_id, amount_cents, tip_cents) VALUES ($1,$2,$3,$4)', [d.id, j.id, j.earning_cents + tip, tip]);
      await postDriverEarning(c, { driver_id: d.id, delivery_id: j.id, amount: j.earning_cents, tip, order_id: j.order_id, suborder_id: j.suborder_id });
      if (bypass) await c.query(`INSERT INTO support_tickets(kind, category, subject, suborder_id) VALUES ('driver','other',$1,$2)`, [`Delivery completed without handover code: ${b.bypass_reason}`, j.suborder_id]);
      return { ok: true, status: 'delivered', earning_cents: j.earning_cents + tip, tip_cents: tip };
    });
  });

  app.post('/driver/jobs/:id/issue', async (req) => {
    const { note } = z.object({ note: z.string().min(3).max(500) }).parse(req.body);
    const { j } = await ownJob(req, jobId(req));
    await pool.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id, note) VALUES ($1,'issue',$2,$3)`, [j.id, req.user!.id, note]);
    await pool.query(`INSERT INTO support_tickets(kind, category, subject, suborder_id, user_id) VALUES ('driver','other',$1,$2,$3)`, [`Delivery issue: ${note}`, j.suborder_id, req.user!.id]);
    return { ok: true };
  });

  app.post('/driver/jobs/:id/fail', async (req) => {
    const { reason } = z.object({ reason: z.string().min(3).max(300) }).parse(req.body);
    const { j } = await ownJob(req, jobId(req));
    if (!['assigned', 'picked_up'].includes(j.status)) throw conflict('invalid_state', 'This job is already finished.');
    await pool.query(`UPDATE deliveries SET status='failed', completion_note=$2 WHERE id=$1`, [j.id, reason]);
    await pool.query('DELETE FROM delivery_locations WHERE delivery_id = $1', [j.id]);
    await pool.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id, note) VALUES ($1,'failed',$2,$3)`, [j.id, req.user!.id, reason]);
    await pool.query(`INSERT INTO support_tickets(kind, category, subject, suborder_id, user_id) VALUES ('driver','late_order',$1,$2,$3)`, [`Delivery failed: ${reason}`, j.suborder_id, req.user!.id]);
    return { ok: true, status: 'failed' };
  });


  // ---- Deliveries nobody has claimed yet. Only the area of the drop-off is shown, never the customer's street or name. ----
  app.get('/driver/available', async (req) => {
    const d = await approvedDriver(req);
    if (!d.is_available || !(await featureOn('driver.self_assign'))) return { enabled: await featureOn('driver.self_assign'), available: d.is_available, jobs: [] };
    const jobs = (await pool.query(
      `SELECT dl.id, dl.earning_cents, s.tip_cents, dl.pickup->>'store_name' AS store_name, dl.pickup->>'address_line' AS pickup_address, dl.pickup->>'city' AS pickup_city,
              dl.dropoff->>'city' AS dropoff_city, left(dl.dropoff->>'postal_code', 3) AS dropoff_area, o.order_number, s.promised_at, dl.created_at
         FROM deliveries dl JOIN suborders s ON s.id = dl.suborder_id JOIN orders o ON o.id = s.order_id
        WHERE dl.status = 'unassigned' AND s.status = 'ready' ORDER BY dl.created_at LIMIT 100`)).rows;
    return { enabled: true, available: true, jobs };
  });
  app.post<{ Params: { id: string } }>('/driver/jobs/:id/accept', async (req) => {
    await requireFeature('driver.self_assign');
    const d = await approvedDriver(req);
    if (!d.is_available) throw conflict('not_available', 'Turn on availability to accept deliveries.');
    return tx(async (c) => {
      const active = (await c.query(`SELECT count(*)::int n FROM deliveries WHERE driver_id = $1 AND status IN ('assigned','picked_up')`, [d.id])).rows[0].n;
      if (active >= 3) throw conflict('too_many', 'Finish one of your current deliveries before taking another (3 at a time).');
      const r = await c.query(`UPDATE deliveries SET driver_id = $2, status = 'assigned', assigned_at = now() WHERE id = $1 AND status = 'unassigned' RETURNING id`, [jobId(req), d.id]);
      if (!r.rowCount) throw conflict('taken', 'Someone else just took that delivery.');
      await c.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id, note) VALUES ($1,'assigned',$2,'accepted by the driver')`, [r.rows[0].id, req.user!.id]);
      return { ok: true, id: r.rows[0].id };
    });
  });
  // Hand a job back before pickup so dispatch (or another driver) can take it.
  app.post<{ Params: { id: string } }>('/driver/jobs/:id/release', async (req) => {
    const { j } = await ownJob(req, jobId(req));
    const r = await pool.query(`UPDATE deliveries SET driver_id = NULL, status = 'unassigned', assigned_at = NULL WHERE id = $1 AND status = 'assigned' RETURNING id`, [j.id]);
    if (!r.rowCount) throw conflict('invalid_state', 'Only a delivery you have not picked up yet can be handed back.');
    await pool.query(`INSERT INTO delivery_events(delivery_id, type, actor_user_id, note) VALUES ($1,'unassigned',$2,'handed back by the driver')`, [j.id, req.user!.id]);
    return { ok: true };
  });

  // ---- Live position: only if the driver chose to share, only while the delivery is on its way, only the latest point. ----
  app.post<{ Params: { id: string } }>('/driver/jobs/:id/location', async (req) => {
    const b = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy_m: z.number().int().min(0).max(100000).optional() }).parse(req.body);
    const { d, j } = await ownJob(req, jobId(req));
    if (!d.share_location || !(await featureOn('driver.live_location'))) return { ok: true, shared: false };
    if (!['assigned', 'picked_up'].includes(j.status)) return { ok: true, shared: false };
    await pool.query(`INSERT INTO delivery_locations(delivery_id, lat, lng, accuracy_m) VALUES ($1,$2,$3,$4)
      ON CONFLICT (delivery_id) DO UPDATE SET lat = $2, lng = $3, accuracy_m = $4, updated_at = now()`, [j.id, b.lat, b.lng, b.accuracy_m ?? null]);
    return { ok: true, shared: true };
  });

  // ---- Profile and settings ----
  app.put('/driver/profile', async (req) => {
    const d = await approvedDriver(req);
    const b = z.object({ phone: z.string().min(7).max(25), vehicle: z.string().max(80).nullable().optional(), nav_app: z.enum(['google', 'apple', 'waze']), share_location: z.boolean() }).parse(req.body);
    await pool.query('UPDATE drivers SET phone = $2, vehicle = $3, nav_app = $4, share_location = $5 WHERE id = $1', [d.id, b.phone, b.vehicle ?? null, b.nav_app, b.share_location]);
    if (!b.share_location) await pool.query(`DELETE FROM delivery_locations WHERE delivery_id IN (SELECT id FROM deliveries WHERE driver_id = $1)`, [d.id]);
    return { ok: true };
  });

  // ---- Dashboard and performance (numbers come from the driver's own deliveries only) ----
  app.get('/driver/dashboard', async (req) => {
    const d = await approvedDriver(req);
    const q = async (sql: string) => (await pool.query(sql, [d.id])).rows[0];
    const today = await q(`SELECT count(*) FILTER (WHERE status = 'delivered')::int AS delivered, COALESCE(sum(e.amount_cents), 0)::int AS earned FROM deliveries dl LEFT JOIN driver_earnings e ON e.delivery_id = dl.id
                             WHERE dl.driver_id = $1 AND dl.delivered_at >= date_trunc('day', now() AT TIME ZONE 'America/Edmonton') AT TIME ZONE 'America/Edmonton'`);
    const week = await q(`SELECT count(*)::int AS delivered, COALESCE(sum(e.amount_cents), 0)::int AS earned FROM deliveries dl JOIN driver_earnings e ON e.delivery_id = dl.id WHERE dl.driver_id = $1 AND dl.delivered_at >= now() - interval '7 days'`);
    const unpaid = await q(`SELECT COALESCE(sum(amount_cents), 0)::int AS cents FROM driver_earnings WHERE driver_id = $1 AND payout_id IS NULL`);
    const rating = await q(`SELECT CASE WHEN count(*) >= 3 THEN round(avg(r.rating)::numeric, 1)::float END AS avg, count(*)::int AS n FROM delivery_ratings r JOIN deliveries dl ON dl.id = r.delivery_id WHERE dl.driver_id = $1`);
    const active = (await pool.query(`${JOB_SQL} WHERE d.driver_id = $1 AND d.status IN ('assigned','picked_up') ORDER BY d.assigned_at LIMIT 5`, [d.id])).rows;
    const open = (await pool.query(`SELECT count(*)::int n FROM deliveries dl JOIN suborders s ON s.id = dl.suborder_id WHERE dl.status = 'unassigned' AND s.status = 'ready'`)).rows[0].n;
    return { today, week, unpaid_cents: unpaid.cents, rating, active, available_count: open, is_available: d.is_available, self_assign: await featureOn('driver.self_assign') };
  });
  app.get('/driver/performance', async (req) => {
    const d = await approvedDriver(req);
    const r = (await pool.query(
      `SELECT count(*) FILTER (WHERE dl.status = 'delivered')::int AS delivered, count(*) FILTER (WHERE dl.status = 'failed')::int AS failed,
              count(*) FILTER (WHERE dl.status = 'delivered' AND dl.delivered_at <= s.promised_at)::int AS on_time,
              count(*) FILTER (WHERE dl.status = 'delivered' AND s.promised_at IS NOT NULL)::int AS timed,
              round(avg(EXTRACT(EPOCH FROM (dl.delivered_at - dl.picked_up_at)) / 60) FILTER (WHERE dl.status = 'delivered' AND dl.picked_up_at IS NOT NULL))::int AS avg_minutes,
              count(*) FILTER (WHERE dl.code_bypassed)::int AS bypassed
         FROM deliveries dl JOIN suborders s ON s.id = dl.suborder_id WHERE dl.driver_id = $1 AND dl.created_at >= now() - interval '30 days'`, [d.id])).rows[0];
    return { days: 30, ...r, on_time_pct: r.timed ? Math.round((r.on_time / r.timed) * 100) : null };
  });
  app.get('/driver/ratings', async (req) => {
    const d = await approvedDriver(req);
    const rows = (await pool.query(
      `SELECT r.rating, r.comment, r.created_at, split_part(u.full_name, ' ', 1) AS first_name FROM delivery_ratings r JOIN deliveries dl ON dl.id = r.delivery_id JOIN users u ON u.id = r.user_id
        WHERE dl.driver_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [d.id])).rows;
    const avg = rows.length >= 3 ? Math.round((rows.reduce((a, r) => a + r.rating, 0) / rows.length) * 10) / 10 : null;
    return { count: rows.length, average: avg, ratings: rows };
  });

  // ---- Support: a message to the team, and your own tickets ----
  app.post('/driver/support', async (req, reply) => {
    await approvedDriver(req);
    const b = z.object({ subject: z.string().trim().min(3).max(120), message: z.string().trim().min(10).max(2000) }).parse(req.body);
    const t = await tx(async (c) => {
      const ticket = (await c.query(`INSERT INTO support_tickets(user_id, kind, category, subject) VALUES ($1,'driver','other',$2) RETURNING id`, [req.user!.id, b.subject])).rows[0];
      await c.query('INSERT INTO ticket_messages(ticket_id, author_user_id, body) VALUES ($1,$2,$3)', [ticket.id, req.user!.id, b.message]);
      return ticket;
    });
    return reply.code(201).send({ id: t.id });
  });
  app.get('/driver/support', async (req) => {
    await approvedDriver(req);
    return (await pool.query(`SELECT t.id, t.subject, t.status, t.created_at, (SELECT body FROM ticket_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) AS last_message FROM support_tickets t WHERE t.user_id = $1 AND t.kind = 'driver' ORDER BY t.created_at DESC LIMIT 30`, [req.user!.id])).rows;
  });

  app.get('/driver/earnings', async (req) => {
    const d = await approvedDriver(req);
    const rows = (await pool.query(
      `SELECT e.amount_cents, e.tip_cents, e.created_at, o.order_number, (e.payout_id IS NOT NULL) AS paid_out, p.status AS payout_status
         FROM driver_earnings e JOIN deliveries dl ON dl.id = e.delivery_id JOIN suborders s ON s.id = dl.suborder_id JOIN orders o ON o.id = s.order_id LEFT JOIN payouts p ON p.id = e.payout_id
        WHERE e.driver_id = $1 ORDER BY e.created_at DESC LIMIT 200`, [d.id])).rows;
    return { earnings: rows, unpaid_cents: rows.filter((r) => !r.paid_out).reduce((a, r) => a + r.amount_cents, 0), paid_cents: rows.filter((r) => r.paid_out && r.payout_status === 'paid').reduce((a, r) => a + r.amount_cents, 0) };
  });
};
