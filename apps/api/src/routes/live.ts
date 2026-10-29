import type { FastifyPluginAsync } from 'fastify';
import { subscribe, topicsFor } from '../services/live.js';

const PER_USER = 8;   // tabs and devices one person may have connected at once
const perUser = new Map<string, number>();

export const liveRoutes: FastifyPluginAsync = async (app) => {
  /** A stream of "something you can see has changed" messages. Pages refresh themselves when one arrives. */
  app.get('/api/live', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'unauthorized' });
    const uid = req.user.id;
    if ((perUser.get(uid) ?? 0) >= PER_USER) return reply.code(429).send({ error: 'too_many_streams' });
    perUser.set(uid, (perUser.get(uid) ?? 0) + 1);
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 3000\n: connected\n\n');
    const topics = topicsFor(req.user);
    const off = subscribe(topics, (hit) => res.write(`data: ${JSON.stringify({ t: hit })}\n\n`));
    const beat = setInterval(() => { try { res.write(': keep-alive\n\n'); } catch { /* closing */ } }, 25_000);
    const done = () => { clearInterval(beat); off(); perUser.set(uid, Math.max(0, (perUser.get(uid) ?? 1) - 1)); };
    req.raw.on('close', done);
  });
};
