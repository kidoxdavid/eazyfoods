import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireLogin } from '../lib/permissions.js';
import { publicKey, pushToUsers } from '../services/push.js';
import { rl } from '../lib/ratelimit.js';

const AREAS = ['shop', 'vendor', 'kitchen', 'driver', 'admin', 'marketing', 'finance'] as const;

export const pushRoutes: FastifyPluginAsync = async (app) => {
  app.get('/push/key', async () => ({ key: await publicKey() }));

  app.post('/push/subscribe', { ...rl(30, '1 minute'), preHandler: requireLogin }, async (req, reply) => {
    const b = z.object({ subscription: z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }), area: z.enum(AREAS).default('shop') }).parse(req.body);
    // The same device can be re-registered by another person on a shared phone: the latest sign-in owns it.
    await pool.query(
      `INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth, area, user_agent) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4, area = $5, user_agent = $6, failures = 0`,
      [req.user!.id, b.subscription.endpoint, b.subscription.keys.p256dh, b.subscription.keys.auth, b.area, String(req.headers['user-agent'] ?? '').slice(0, 200)]);
    return reply.code(204).send();
  });

  app.post('/push/unsubscribe', { preHandler: requireLogin }, async (req, reply) => {
    const b = z.object({ endpoint: z.string().max(1000) }).parse(req.body);
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [b.endpoint, req.user!.id]);
    return reply.code(204).send();
  });

  // A test notification to your own devices in this app, so you can see it work before relying on it.
  app.post('/push/test', { ...rl(10, '1 minute'), preHandler: requireLogin }, async (req) => {
    const b = z.object({ area: z.enum(AREAS).default('shop') }).parse(req.body ?? {});
    const out = await pushToUsers([req.user!.id], { title: 'EAZyfoods notifications are on', body: 'You will get alerts here.', url: b.area === 'shop' ? '/' : `/${b.area}`, tag: 'test' }, { areas: [b.area], detail: true }) as { ok: boolean; status?: number; message?: string }[];
    // sent = devices the push company accepted; the rest say why not (so "nothing came" is never a mystery)
    return { sent: out.filter((o) => o.ok).length, devices: out.length, errors: out.filter((o) => !o.ok).map((o) => ({ status: o.status ?? null, message: o.message ?? '' })) };
  });
};
