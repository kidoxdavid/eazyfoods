import type { Queryable } from '../lib/db-types.js';
import { getSetting } from '../lib/settings.js';
import { featureOn } from './features.js';

/** Is this person an EAZY+ member right now (a trial or paid membership that has not run out)? */
export async function isMember(c: Queryable, userId: string): Promise<boolean> {
  if (!(await featureOn('shop.membership', c))) return false;
  return !!(await c.query(`SELECT 1 FROM memberships WHERE user_id = $1 AND status IN ('trial','active') AND ends_at > now()`, [userId])).rowCount;
}

/** Points an order earns: whole points per dollar of what was actually delivered, doubled (by default) for members. */
export async function pointsFor(c: Queryable, userId: string, netCents: number): Promise<number> {
  if (!(await featureOn('shop.points', c))) return 0;
  const per = await getSetting<number>('rewards.points_per_dollar', c);
  if (per <= 0) return 0;
  const mult = (await isMember(c, userId)) ? await getSetting<number>('membership.points_multiplier', c) : 1;
  return Math.floor((netCents / 100) * per) * Math.max(1, mult);
}
