import type { PoolClient } from 'pg';
import type { Queryable } from '../lib/db-types.js';
import { bps } from '../lib/money.js';
import { getSetting } from '../lib/settings.js';
import { post } from './ledger.js';

type Kind = 'grant' | 'cashback' | 'referral' | 'gift_code' | 'redeem' | 'release' | 'refund' | 'adjust';

export async function creditBalance(c: Queryable, userId: string): Promise<number> {
  return (await c.query('SELECT COALESCE(sum(delta_cents), 0)::int AS b FROM credit_entries WHERE user_id = $1', [userId])).rows[0].b;
}

/** Money the company gives away (rewards, referrals, gift codes): an expense now and a liability to honour the credit later. */
export async function grantCredit(c: PoolClient, userId: string, cents: number, kind: Exclude<Kind, 'redeem' | 'release' | 'refund'>, o: { orderId?: string | null; note?: string; by?: string | null } = {}) {
  const r = await c.query(
    `INSERT INTO credit_entries(user_id, delta_cents, kind, order_id, note, created_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,
    [userId, cents, kind, o.orderId ?? null, o.note ?? null, o.by ?? null]);
  if (!r.rowCount) return false;
  await post(c, 'credit_grant', { type: 'credit', id: String(r.rows[0].id) }, [
    { account: 'credit_expense', amount: cents, orderId: o.orderId ?? null }, { account: 'store_credit_liability', amount: -cents, orderId: o.orderId ?? null }]);
  return true;
}

/** Take credit for an order. The caller has locked the user row, so two checkouts cannot spend the same credit twice. */
export async function redeemForOrder(c: PoolClient, userId: string, orderId: string, cents: number) {
  if (cents <= 0) return;
  await c.query(`INSERT INTO credit_entries(user_id, delta_cents, kind, order_id) VALUES ($1,$2,'redeem',$3)`, [userId, -cents, orderId]);
}

/** The order was never paid: put the credit back. Safe to call more than once. */
export async function releaseOrderCredit(c: PoolClient, orderId: string) {
  const o = (await c.query(`UPDATE orders SET credit_released = true WHERE id = $1 AND credit_cents > 0 AND NOT credit_released RETURNING user_id, credit_cents`, [orderId])).rows[0];
  if (o) await c.query(`INSERT INTO credit_entries(user_id, delta_cents, kind, order_id) VALUES ($1,$2,'release',$3)`, [o.user_id, o.credit_cents, orderId]);
}

/**
 * When an order is completed: cashback on what was actually delivered (net of refunds), and the one-off referral reward for a
 * friend's first completed order. Both are idempotent and both default to OFF.
 */
export async function awardOrderRewards(c: PoolClient, orderId: string) {
  const o = (await c.query('SELECT id, user_id FROM orders WHERE id = $1', [orderId])).rows[0];
  const base = (await c.query(
    `SELECT COALESCE(sum(s.subtotal_cents - s.discount_cents), 0)::int - COALESCE((SELECT sum(r.merchandise_cents - r.discount_cents) FROM refunds r WHERE r.order_id = $1 AND r.status = 'succeeded'), 0)::int AS net
       FROM suborders s WHERE s.order_id = $1 AND s.status IN ('delivered','collected')`, [orderId])).rows[0].net as number;
  if (base <= 0) return;

  const cb = await getSetting<number>('rewards.cashback_bps', c);
  if (cb > 0) {
    const cents = bps(base, cb);
    if (cents > 0) await grantCredit(c, o.user_id, cents, 'cashback', { orderId, note: 'Cashback on your order' });
  }

  const reward = await getSetting<number>('referral.reward_cents', c);
  if (reward > 0) {
    const min = await getSetting<number>('referral.min_order_cents', c);
    const max = await getSetting<number>('referral.max_per_user', c);
    const ref = (await c.query(
      `SELECT r.referrer_user FROM referrals r JOIN users u ON u.id = r.referred_user
        WHERE r.referred_user = $1 AND r.rewarded_at IS NULL AND u.email_verified_at IS NOT NULL FOR UPDATE OF r`, [o.user_id])).rows[0];
    const earlier = ref ? (await c.query(`SELECT count(*)::int AS n FROM orders WHERE user_id = $1 AND status = 'completed' AND id <> $2`, [o.user_id, orderId])).rows[0].n : 1;
    if (ref && earlier === 0 && base >= min) {
      const given = (await c.query('SELECT count(*)::int AS n FROM referrals WHERE referrer_user = $1 AND rewarded_at IS NOT NULL', [ref.referrer_user])).rows[0].n;
      await c.query('UPDATE referrals SET rewarded_at = now() WHERE referred_user = $1', [o.user_id]);   // spent either way: a capped referrer's friend is not retried
      if (given < max) {
        await grantCredit(c, ref.referrer_user, reward, 'referral', { orderId, note: 'A friend you invited had their first order' });
        await grantCredit(c, o.user_id, reward, 'referral', { orderId, note: 'Welcome credit from a friend’s invite' });
      }
    }
  }
}
