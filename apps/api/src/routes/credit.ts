import { requireFeature } from '../services/features.js';
import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { config } from '../config.js';
import { audit } from '../lib/auth.js';
import { bad, conflict, notFound } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { requireLogin, requirePerm } from '../lib/permissions.js';
import { rl } from '../lib/ratelimit.js';
import { creditBalance, grantCredit } from '../services/credit.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I
const newCode = (len: number) => Array.from(randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join('');
const giftCode = () => `EAZY-${newCode(4)}-${newCode(4)}`;

/** Store credit for the signed-in customer: balance, history, invite link, gift codes. */
export const creditRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  app.get('/me/credit', async (req) => {
    const uid = req.user!.id;
    const [cashback, reward, min] = await Promise.all([getSetting<number>('rewards.cashback_bps'), getSetting<number>('referral.reward_cents'), getSetting<number>('referral.min_order_cents')]);
    let code = (await pool.query('SELECT referral_code FROM users WHERE id = $1', [uid])).rows[0].referral_code as string | null;
    if (!code && reward > 0) {
      for (let i = 0; i < 5 && !code; i++) {
        const c = newCode(7);
        const r = await pool.query('UPDATE users SET referral_code = $2 WHERE id = $1 AND referral_code IS NULL RETURNING referral_code', [uid, c]).catch(() => null);   // unique clash: try another
        code = r?.rows[0]?.referral_code ?? (await pool.query('SELECT referral_code FROM users WHERE id = $1', [uid])).rows[0].referral_code;
      }
    }
    const entries = (await pool.query('SELECT id, delta_cents, kind, note, created_at, order_id FROM credit_entries WHERE user_id = $1 ORDER BY id DESC LIMIT 50', [uid])).rows;
    const inv = (await pool.query(`SELECT count(*)::int AS invited, count(*) FILTER (WHERE rewarded_at IS NOT NULL)::int AS rewarded FROM referrals WHERE referrer_user = $1`, [uid])).rows[0];
    return {
      balance_cents: await creditBalance(pool, uid), entries,
      program: { cashback_bps: cashback, referral_reward_cents: reward, referral_min_order_cents: min },
      referral: reward > 0 && code ? { code, link: `${config.WEB_ORIGIN.replace(/\/$/, '')}/register?ref=${code}`, ...inv } : null,
    };
  });

  // Gift codes are guessable only by luck (about 40 bits), and attempts are rate limited per person.
  app.post('/me/credit/redeem', rl(5, '1 hour'), async (req) => {
    await requireFeature('shop.store_credit');
    const { code } = z.object({ code: z.string().trim().min(6).max(30) }).parse(req.body);
    const norm = code.toUpperCase().replace(/\s+/g, '');
    return tx(async (c) => {
      const g = (await c.query(`UPDATE gift_codes SET redeemed_by = $2, redeemed_at = now() WHERE code = $1 AND redeemed_at IS NULL AND (expires_at IS NULL OR expires_at > now()) RETURNING amount_cents`, [norm, req.user!.id])).rows[0];
      if (!g) throw bad('invalid_code', 'That code is not valid, has expired, or was already used.');
      await grantCredit(c, req.user!.id, g.amount_cents, 'gift_code', { note: `Gift code ${norm.slice(0, 7)}…` });
      return { ok: true, added_cents: g.amount_cents, balance_cents: await creditBalance(c, req.user!.id) };
    });
  });
};

/** Marketing: programme settings, gift codes, one-off credit. Every action is audited. */
export const creditAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requirePerm('marketing.manage'));
  const int = (min: number, max: number) => z.number().int().min(min).max(max);

  app.get('/rewards', async () => ({
    cashback_bps: await getSetting<number>('rewards.cashback_bps'), referral_reward_cents: await getSetting<number>('referral.reward_cents'),
    referral_min_order_cents: await getSetting<number>('referral.min_order_cents'), referral_max_per_user: await getSetting<number>('referral.max_per_user'),
    liability_cents: (await pool.query(`SELECT COALESCE(-sum(amount_cents), 0)::bigint AS n FROM ledger_entries WHERE account = 'store_credit_liability'`)).rows[0].n * 1,
    given_30d_cents: (await pool.query(`SELECT COALESCE(sum(delta_cents), 0)::int AS n FROM credit_entries WHERE delta_cents > 0 AND kind IN ('grant','cashback','referral','gift_code') AND created_at > now() - interval '30 days'`)).rows[0].n,
  }));
  app.put('/rewards', async (req) => {
    const b = z.object({ cashback_bps: int(0, 1000), referral_reward_cents: int(0, 5000), referral_min_order_cents: int(0, 50000), referral_max_per_user: int(0, 100) }).parse(req.body);
    const map: Record<string, number> = { 'rewards.cashback_bps': b.cashback_bps, 'referral.reward_cents': b.referral_reward_cents, 'referral.min_order_cents': b.referral_min_order_cents, 'referral.max_per_user': b.referral_max_per_user };
    await tx(async (c) => { for (const [k, v] of Object.entries(map)) await c.query('UPDATE app_settings SET value = $2::jsonb, updated_at = now() WHERE key = $1', [k, JSON.stringify(v)]); await audit(req.user!.id, 'rewards.settings', 'settings', 'rewards', b, c); });
    return { ok: true };
  });

  app.get('/gift-codes', async () => (await pool.query(
    `SELECT g.code, g.amount_cents, g.note, g.expires_at, g.created_at, g.redeemed_at, u.email AS redeemed_by_email FROM gift_codes g LEFT JOIN users u ON u.id = g.redeemed_by ORDER BY g.created_at DESC LIMIT 200`)).rows);
  app.post('/gift-codes', async (req, reply) => {
    const b = z.object({ amount_cents: int(100, 50000), count: int(1, 50).default(1), note: z.string().max(200).optional(), expires_at: z.string().datetime().optional() }).parse(req.body);
    const codes: string[] = [];
    await tx(async (c) => {
      for (let i = 0; i < b.count; i++) {
        const code = giftCode();
        await c.query('INSERT INTO gift_codes(code, amount_cents, note, expires_at, created_by) VALUES ($1,$2,$3,$4,$5)', [code, b.amount_cents, b.note ?? null, b.expires_at ?? null, req.user!.id]);
        codes.push(code);
      }
      await audit(req.user!.id, 'giftcodes.create', 'gift_code', codes[0], { count: b.count, amount_cents: b.amount_cents }, c);
    });
    return reply.code(201).send({ codes });
  });

  // Goodwill credit to one customer (for example after a bad experience).
  app.post('/credit/grant', async (req) => {
    const b = z.object({ email: z.string().email(), amount_cents: int(100, 20000), note: z.string().min(3).max(200) }).parse(req.body);
    const u = (await pool.query('SELECT id FROM users WHERE email = $1 AND disabled_at IS NULL', [b.email.toLowerCase()])).rows[0];
    if (!u) throw notFound('No customer with that email.');
    if (u.id === req.user!.id) throw conflict('self_grant', 'You cannot give credit to your own account.');
    await tx(async (c) => { await grantCredit(c, u.id, b.amount_cents, 'grant', { note: b.note, by: req.user!.id }); await audit(req.user!.id, 'credit.grant', 'user', u.id, b, c); });
    return { ok: true };
  });
};
