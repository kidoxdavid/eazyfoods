import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireLogin } from '../lib/permissions.js';
import { conflict, notFound } from '../lib/errors.js';
import { assertVendorOwnsSuborder } from '../services/orders.js';
import { notify, notifyVendorOwners } from '../services/notify.js';
import { rl } from '../lib/ratelimit.js';

/** Chat about one order: the customer and the store's team. Open while the order is active and for three days after it ends. */
const CLOSED_AFTER_HOURS = 72;
const body = z.object({ body: z.string().trim().min(1).max(600) });
const list = (sid: string) => pool.query(`SELECT id, sender, body, created_at FROM order_messages WHERE suborder_id = $1 ORDER BY created_at`, [sid]);
const openFor = async (sid: string) => {
  const s = (await pool.query(`SELECT s.status, s.completed_at, s.vendor_id, o.user_id, o.customer_email, o.order_number, st.name AS store_name FROM suborders s JOIN orders o ON o.id = s.order_id JOIN stores st ON st.id = s.store_id WHERE s.id = $1`, [sid])).rows[0];
  if (!s) throw notFound('Order not found.');
  const done = ['delivered', 'collected', 'rejected', 'cancelled', 'expired'].includes(s.status);
  const stale = done && s.completed_at && Date.now() - new Date(s.completed_at).getTime() > CLOSED_AFTER_HOURS * 3600_000;
  return { ...s, open: !['awaiting_payment', 'expired'].includes(s.status) && !stale };
};

export const orderChatRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  // ---- the customer ----
  const mine = async (req: any) => {
    const sid = z.string().uuid().parse(req.params.sid);
    const s = await openFor(sid);
    if (s.user_id !== req.user.id) throw notFound('Order not found.');
    return { sid, s };
  };
  app.get<{ Params: { sid: string } }>('/orders/suborders/:sid/messages', async (req) => {
    const { sid, s } = await mine(req);
    await pool.query(`UPDATE order_messages SET customer_read_at = now() WHERE suborder_id = $1 AND sender = 'store' AND customer_read_at IS NULL`, [sid]);
    return { open: s.open, store_name: s.store_name, messages: (await list(sid)).rows };
  });
  app.post<{ Params: { sid: string } }>('/orders/suborders/:sid/messages', rl(30, '1 hour'), async (req) => {
    const { sid, s } = await mine(req);
    if (!s.open) throw conflict('chat_closed', 'This conversation is closed.');
    const { body: text } = body.parse(req.body);
    await pool.query(`INSERT INTO order_messages(suborder_id, sender, sender_user_id, body, customer_read_at) VALUES ($1,'customer',$2,$3, now())`, [sid, req.user!.id, text]);
    await notifyVendorOwners(pool, s.vendor_id, 'order_message_store', { order_number: s.order_number, text: text.slice(0, 300) }).catch(() => {});
    return { open: true, store_name: s.store_name, messages: (await list(sid)).rows };
  });

  // ---- the store's team ----
  const ours = async (req: any) => {
    const sid = z.string().uuid().parse(req.params.sid);
    await assertVendorOwnsSuborder(req.user.roles.map((r: any) => r.vendor_id).filter(Boolean), sid);
    return { sid, s: await openFor(sid) };
  };
  app.get<{ Params: { sid: string } }>('/vendor/suborders/:sid/messages', async (req) => {
    const { sid, s } = await ours(req);
    await pool.query(`UPDATE order_messages SET store_read_at = now() WHERE suborder_id = $1 AND sender = 'customer' AND store_read_at IS NULL`, [sid]);
    return { open: s.open, messages: (await list(sid)).rows };
  });
  app.post<{ Params: { sid: string } }>('/vendor/suborders/:sid/messages', rl(60, '1 hour'), async (req) => {
    const { sid, s } = await ours(req);
    if (!s.open) throw conflict('chat_closed', 'This conversation is closed.');
    const { body: text } = body.parse(req.body);
    await pool.query(`INSERT INTO order_messages(suborder_id, sender, sender_user_id, body, store_read_at) VALUES ($1,'store',$2,$3, now())`, [sid, req.user!.id, text]);
    await notify(pool, { userId: s.user_id, email: s.customer_email, template: 'order_message_customer', vars: { order_number: s.order_number, from: s.store_name, text: text.slice(0, 300) } }).catch(() => {});
    return { open: true, messages: (await list(sid)).rows };
  });
  app.get('/vendor/orders-unread-messages', async (req) => {
    const vids = req.user!.roles.map((r) => r.vendor_id).filter(Boolean);
    return (await pool.query(`SELECT m.suborder_id, count(*)::int AS unread FROM order_messages m JOIN suborders s ON s.id = m.suborder_id
                               WHERE s.vendor_id = ANY($1::uuid[]) AND m.sender = 'customer' AND m.store_read_at IS NULL GROUP BY m.suborder_id`, [vids])).rows;
  });
};
