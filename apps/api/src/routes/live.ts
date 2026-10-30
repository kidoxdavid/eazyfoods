import type { FastifyPluginAsync } from 'fastify';
import { subscribe, topicsFor } from '../services/live.js';

const PER_USER = 12;   // tabs and devices one person may have connected at once
const perUser = new Map<string, Set<{ end: () => void }>>();

export const liveRoutes: FastifyPluginAsync = async (app) => {
  /** A stream of "something you can see has changed" messages. Pages refresh themselves when one arrives. */
  app.get('/api/live', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'unauthorized' });
    const uid = req.user.id;
    reply.hijack();
    const res = reply.raw;
    // A person's newest tabs win: when there are too many, the oldest stream is closed (it reconnects by itself if that tab is still open).
    const mine = perUser.get(uid) ?? new Set(); perUser.set(uid, mine);
    const me = { end: () => { try { res.end(); } catch { /* already closed */ } } };
    while (mine.size >= PER_USER) { const oldest = mine.values().next().value!; mine.delete(oldest); oldest.end(); }
    mine.add(me);
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 3000\n: connected\n\n');
    const topics = topicsFor(req.user);
    const off = subscribe(topics, (hit) => res.write(`data: ${JSON.stringify({ t: hit })}\n\n`));
    const beat = setInterval(() => { try { res.write(': keep-alive\n\n'); } catch { /* closing */ } }, 25_000);
    const done = () => { clearInterval(beat); off(); mine.delete(me); };
    req.raw.on('close', done);
  });
};
