import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { bad, forbidden, notFound } from '../lib/errors.js';
import { requireLogin, requirePerm } from '../lib/permissions.js';
import { rl } from '../lib/ratelimit.js';
import { notifyVendorOwners } from '../services/notify.js';
import { vendorIdsOf } from './vendorOrders.js';

const uuid = z.string().uuid();
const body = z.string().trim().min(1).max(4000);

const THREADS = `SELECT t.id, t.subject, t.status, t.last_message_at, t.created_at, v.id AS vendor_id, v.name AS vendor_name,
    (SELECT left(m.body, 120) FROM vendor_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS preview,
    (SELECT count(*)::int FROM vendor_messages m WHERE m.thread_id = t.id AND m.from_staff = $1 AND m.read_by_other_at IS NULL) AS unread
  FROM vendor_threads t JOIN vendors v ON v.id = t.vendor_id`;

const messagesOf = async (id: string) => (await pool.query(
  `SELECT m.id, m.body, m.from_staff, m.created_at, COALESCE(u.full_name, u.email) AS author
     FROM vendor_messages m LEFT JOIN users u ON u.id = m.author_user_id WHERE m.thread_id = $1 ORDER BY m.id`, [id])).rows;

/** Vendor side: a vendor sees and writes only to their own threads. */
export const vendorMessageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const vids = (req: any) => { const v = vendorIdsOf(req.user); if (!v.length) throw forbidden('This account is not linked to a store.'); return v; };
  const own = async (req: any, id: string) => {
    const t = (await pool.query('SELECT * FROM vendor_threads WHERE id = $1 AND vendor_id = ANY($2::uuid[])', [id, vids(req)])).rows[0];
    if (!t) throw notFound('Conversation not found');
    return t;
  };

  app.get('/messages', async (req) => (await pool.query(`${THREADS} WHERE t.vendor_id = ANY($2::uuid[]) ORDER BY t.last_message_at DESC LIMIT 100`, [true, vids(req)])).rows);
  app.get('/messages/unread', async (req) => ({ count: (await pool.query(
    `SELECT count(*)::int AS n FROM vendor_messages m JOIN vendor_threads t ON t.id = m.thread_id WHERE t.vendor_id = ANY($1::uuid[]) AND m.from_staff AND m.read_by_other_at IS NULL`, [vids(req)])).rows[0].n }));

  app.get<{ Params: { id: string } }>('/messages/:id', async (req) => {
    const t = await own(req, uuid.parse(req.params.id));
    await pool.query('UPDATE vendor_messages SET read_by_other_at = now() WHERE thread_id = $1 AND from_staff AND read_by_other_at IS NULL', [t.id]);
    return { thread: { id: t.id, subject: t.subject, status: t.status }, messages: await messagesOf(t.id) };
  });

  app.post('/messages', rl(20, '1 hour'), async (req, reply) => {
    const b = z.object({ subject: z.string().trim().min(2).max(120), body }).parse(req.body);
    const id = await tx(async (c) => {
      const t = (await c.query('INSERT INTO vendor_threads(vendor_id, subject, created_by) VALUES ($1,$2,$3) RETURNING id', [vids(req)[0], b.subject, req.user!.id])).rows[0];
      await c.query('INSERT INTO vendor_messages(thread_id, author_user_id, from_staff, body) VALUES ($1,$2,false,$3)', [t.id, req.user!.id, b.body]);
      return t.id as string;
    });
    return reply.code(201).send({ id });
  });

  app.post<{ Params: { id: string } }>('/messages/:id/reply', rl(60, '1 hour'), async (req) => {
    const t = await own(req, uuid.parse(req.params.id));
    const b = z.object({ body }).parse(req.body);
    await tx(async (c) => {
      await c.query('INSERT INTO vendor_messages(thread_id, author_user_id, from_staff, body) VALUES ($1,$2,false,$3)', [t.id, req.user!.id, b.body]);
      await c.query(`UPDATE vendor_threads SET last_message_at = now(), status = 'open' WHERE id = $1`, [t.id]);
    });
    return { ok: true };
  });
};

/** Staff side (vendors.manage). */
export const adminMessageRoutes: FastifyPluginAsync = async (app) => {
  const perm = requirePerm('vendors.manage');
  const get = async (id: string) => { const t = (await pool.query('SELECT t.*, v.name AS vendor_name FROM vendor_threads t JOIN vendors v ON v.id = t.vendor_id WHERE t.id = $1', [id])).rows[0]; if (!t) throw notFound('Conversation not found'); return t; };

  app.get('/messages', { preHandler: perm }, async (req) => {
    const { status } = z.object({ status: z.enum(['open', 'closed']).optional() }).parse(req.query);
    return (await pool.query(`${THREADS} WHERE ($2::text IS NULL OR t.status = $2) ORDER BY (t.status = 'open') DESC, t.last_message_at DESC LIMIT 200`, [false, status ?? null])).rows;
  });
  app.get('/messages/unread', { preHandler: perm }, async () => ({ count: (await pool.query(
    `SELECT count(*)::int AS n FROM vendor_messages m WHERE NOT m.from_staff AND m.read_by_other_at IS NULL`)).rows[0].n }));

  app.get<{ Params: { id: string } }>('/messages/:id', { preHandler: perm }, async (req) => {
    const t = await get(uuid.parse(req.params.id));
    await pool.query('UPDATE vendor_messages SET read_by_other_at = now() WHERE thread_id = $1 AND NOT from_staff AND read_by_other_at IS NULL', [t.id]);
    return { thread: { id: t.id, subject: t.subject, status: t.status, vendor_id: t.vendor_id, vendor_name: t.vendor_name }, messages: await messagesOf(t.id) };
  });

  app.post('/messages', { preHandler: perm }, async (req, reply) => {
    const b = z.object({ vendor_id: uuid, subject: z.string().trim().min(2).max(120), body }).parse(req.body);
    if (!(await pool.query('SELECT 1 FROM vendors WHERE id = $1', [b.vendor_id])).rowCount) throw bad('no_vendor', 'Vendor not found.');
    const id = await tx(async (c) => {
      const t = (await c.query('INSERT INTO vendor_threads(vendor_id, subject, created_by) VALUES ($1,$2,$3) RETURNING id', [b.vendor_id, b.subject, req.user!.id])).rows[0];
      await c.query('INSERT INTO vendor_messages(thread_id, author_user_id, from_staff, body) VALUES ($1,$2,true,$3)', [t.id, req.user!.id, b.body]);
      await notifyVendorOwners(c, b.vendor_id, 'vendor_message', { subject: b.subject });
      await audit(req.user!.id, 'vendor_message.started', 'vendor', b.vendor_id, { subject: b.subject }, c);
      return t.id as string;
    });
    return reply.code(201).send({ id });
  });

  app.post<{ Params: { id: string } }>('/messages/:id/reply', { preHandler: perm }, async (req) => {
    const t = await get(uuid.parse(req.params.id));
    const b = z.object({ body }).parse(req.body);
    await tx(async (c) => {
      await c.query('INSERT INTO vendor_messages(thread_id, author_user_id, from_staff, body) VALUES ($1,$2,true,$3)', [t.id, req.user!.id, b.body]);
      await c.query('UPDATE vendor_threads SET last_message_at = now() WHERE id = $1', [t.id]);
      await notifyVendorOwners(c, t.vendor_id, 'vendor_message', { subject: t.subject });
    });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/messages/:id/status', { preHandler: perm }, async (req) => {
    const id = uuid.parse(req.params.id); const { status } = z.object({ status: z.enum(['open', 'closed']) }).parse(req.body);
    await get(id);
    await pool.query('UPDATE vendor_threads SET status = $2 WHERE id = $1', [id, status]);
    await audit(req.user!.id, `vendor_message.${status}`, 'vendor_thread', id);
    return { ok: true };
  });
};
