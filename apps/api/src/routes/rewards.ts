import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { requireLogin } from '../lib/permissions.js';
import { conflict } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { featureOn, requireFeature } from '../services/features.js';
import { grantCredit } from '../services/credit.js';

const balance = async (userId: string) => (await pool.query('SELECT COALESCE(sum(delta), 0)::int AS p FROM reward_points WHERE user_id = $1', [userId])).rows[0].p as number;
const membership = async (userId: string) => (await pool.query(`SELECT status, started_at, ends_at, (status IN ('trial','active') AND ends_at > now()) AS active FROM memberships WHERE user_id = $1`, [userId])).rows[0] ?? null;

async function rewardsView(userId: string) {
  const [points, perCredit, step] = [await balance(userId), await getSetting<number>('rewards.points_per_credit_dollar'), await getSetting<number>('rewards.redeem_step_points')];
  const next = (Math.floor(points / step) + 1) * step;
  return {
    points, step, points_per_credit_dollar: perCredit, value_cents: Math.floor((points / perCredit) * 100),
    step_value_cents: Math.floor((step / perCredit) * 100), can_redeem: points >= step, next_at: next, to_next: next - points, next_reward_cents: Math.floor((next / perCredit) * 100),
    progress: Math.round(((points % step) / step) * 100),
  };
}
async function membershipView(userId: string) {
  const m = await membership(userId);
  const [trial, min, mult, price] = [await getSetting<number>('membership.trial_days'), await getSetting<number>('membership.free_delivery_min_cents'), await getSetting<number>('membership.points_multiplier'), await getSetting<number>('membership.price_cents')];
  return { member: m ? { status: m.active ? m.status : 'ended', ends_at: m.ends_at, active: !!m.active } : null, can_try: !m, trial_days: trial, free_delivery_min_cents: min, points_multiplier: mult, price_cents: price };
}

export const rewardsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  app.get('/rewards', async (req) => { await requireFeature('shop.points'); return { ...(await rewardsView(req.user!.id)), history: (await pool.query(`SELECT delta, reason, note, created_at FROM reward_points WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [req.user!.id])).rows }; });

  // Points become store credit: every full step (500 points by default) is worth the step divided by the points-per-dollar rate.
  app.post('/rewards/redeem', async (req) => {
    await requireFeature('shop.points');
    const { points } = z.object({ points: z.number().int().positive().max(1_000_000) }).parse(req.body);
    const step = await getSetting<number>('rewards.redeem_step_points'), perCredit = await getSetting<number>('rewards.points_per_credit_dollar');
    if (points % step !== 0) throw conflict('bad_amount', `Redeem in steps of ${step} points.`);
    await tx(async (c) => {
      await c.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user!.id]);       // two taps cannot spend the same points twice
      const have = (await c.query('SELECT COALESCE(sum(delta), 0)::int AS p FROM reward_points WHERE user_id = $1', [req.user!.id])).rows[0].p as number;
      if (points > have) throw conflict('not_enough', 'You do not have that many points.');
      await c.query(`INSERT INTO reward_points(user_id, delta, reason, note) VALUES ($1,$2,'redeem','Redeemed for store credit')`, [req.user!.id, -points]);
      await grantCredit(c, req.user!.id, Math.floor((points / perCredit) * 100), 'cashback', { note: `Redeemed ${points} EAZY Rewards points` });
    });
    return rewardsView(req.user!.id);
  });

  app.get('/membership', async (req) => { await requireFeature('shop.membership'); return membershipView(req.user!.id); });
  // A free trial. Paid billing is not switched on yet, so nothing is charged and it simply ends.
  app.post('/membership/trial', async (req) => {
    await requireFeature('shop.membership');
    const days = await getSetting<number>('membership.trial_days');
    const r = await pool.query(`INSERT INTO memberships(user_id, status, ends_at) VALUES ($1,'trial', now() + make_interval(days => $2)) ON CONFLICT DO NOTHING RETURNING user_id`, [req.user!.id, days]);
    if (!r.rowCount) throw conflict('already_tried', 'You have already used your free trial.');
    return membershipView(req.user!.id);
  });

  // One call for the account page.
  app.get('/me/summary', async (req) => {
    const u = req.user!.id;
    const [pts, mem, buyAgain, saved, groups, unread] = await Promise.all([
      (await featureOn('shop.points')) ? rewardsView(u) : null,
      (await featureOn('shop.membership')) ? membershipView(u) : null,
      pool.query(`SELECT count(DISTINCT ol.product_id)::int AS n FROM order_lines ol JOIN suborders s ON s.id = ol.suborder_id JOIN orders o ON o.id = s.order_id WHERE o.user_id = $1 AND s.status IN ('delivered','collected')`, [u]),
      pool.query('SELECT count(*)::int AS n FROM favourites WHERE user_id = $1', [u]),
      pool.query(`SELECT count(*)::int AS n FROM group_orders WHERE owner_id = $1 AND status = 'open'`, [u]),
      pool.query(`SELECT count(*)::int AS n FROM order_messages m JOIN suborders s ON s.id = m.suborder_id JOIN orders o ON o.id = s.order_id WHERE o.user_id = $1 AND m.sender = 'store' AND m.customer_read_at IS NULL`, [u]),
    ]);
    return { rewards: pts, membership: mem, buy_again: buyAgain.rows[0].n, saved: saved.rows[0].n, group_orders: groups.rows[0].n, unread_messages: unread.rows[0].n };
  });
};
