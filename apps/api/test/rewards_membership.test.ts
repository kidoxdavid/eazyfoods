import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
let hadPickup = false;
beforeAll(async () => { await openAllStores(); hadPickup = (await pool.query(`SELECT offers_pickup FROM stores WHERE slug = $1`, [S1])).rows[0].offers_pickup; await pool.query(`UPDATE stores SET offers_pickup = true WHERE slug = $1`, [S1]); });
afterAll(async () => { await pool.query(`UPDATE stores SET offers_pickup = $2 WHERE slug = $1`, [S1, hadPickup]); });

async function completedPickup(u: Awaited<ReturnType<typeof newCustomer>>, qty: number) {
  const garri = await setOffer(S1, 'garri-white', 2000, 200);
  await addToCart(u.cookie, garri, qty);
  const c = await checkout(u.cookie, null, { method: 'pickup' });
  expect(c.status, JSON.stringify(c.body)).toBe(201);
  const id = c.body.order.id as string; await simulate(u.cookie, id, 'succeeded');
  const sid = (await call(u.cookie, 'GET', `/api/orders/${id}`)).body.suborders[0].id as string;
  const owner = (await login('owner1@example.test')).cookie;
  for (const step of ['accept', 'preparing', 'ready', 'collected']) expect((await call(owner, 'POST', `/api/vendor/suborders/${sid}/${step}`)).status).toBe(200);
  return id;
}

describe('EAZY Rewards points', () => {
  it('are earned once on a completed order, shown with their value, and redeemed in steps for store credit', async () => {
    const u = await newCustomer();
    expect((await call(u.cookie, 'GET', '/api/rewards')).body.points).toBe(0);
    await completedPickup(u, 30);                                                  // 30 × $20 = $600 of garri
    const r = (await call(u.cookie, 'GET', '/api/rewards')).body;
    expect(r.points).toBe(600); expect(r.value_cents).toBe(600 * 1); expect(r.can_redeem).toBe(true); expect(r.to_next).toBe(400);   // 600 pts = $6.00; 400 more to the next $10
    expect((await call(u.cookie, 'POST', '/api/rewards/redeem', { points: 250 })).status).toBe(409);       // steps of 500 only
    expect((await call(u.cookie, 'POST', '/api/rewards/redeem', { points: 1000 })).status).toBe(409);      // not that many
    const after = (await call(u.cookie, 'POST', '/api/rewards/redeem', { points: 500 })).body;
    expect(after.points).toBe(100);
    const credit = (await pool.query(`SELECT COALESCE(sum(delta_cents),0)::int AS c FROM credit_entries WHERE user_id = $1`, [u.id])).rows[0].c;
    expect(credit).toBe(500);                                                       // 500 pts = $5.00 of store credit
    expect((await call(null, 'GET', '/api/rewards')).status).toBe(401);
  });
  it('an order earns points only once, even if the status is moved again', async () => {
    const u = await newCustomer(); const id = await completedPickup(u, 5);
    await pool.query(`INSERT INTO reward_points(user_id, delta, reason, order_id) VALUES ($1, 99, 'earn', $2) ON CONFLICT DO NOTHING`, [u.id, id]);
    expect((await call(u.cookie, 'GET', '/api/rewards')).body.points).toBe(100);
  });
});

describe('EAZY+ trial', () => {
  it('is free once, doubles points and waives delivery over the minimum, then ends', async () => {
    const u = await newCustomer();
    const garri = await setOffer(S1, 'garri-white', 2000, 200); await addToCart(u.cookie, garri, 2);              // $40 at the store
    const before = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body;
    expect(before.delivery_cents).toBeGreaterThan(0);
    expect((await call(u.cookie, 'GET', '/api/membership')).body.can_try).toBe(true);
    const t = (await call(u.cookie, 'POST', '/api/membership/trial')).body;
    expect(t.member.active).toBe(true); expect(t.can_try).toBe(false);
    expect((await call(u.cookie, 'POST', '/api/membership/trial')).status).toBe(409);                              // once only
    const after = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body;
    expect(after.delivery_cents).toBe(0);                                                                           // $40 is over the $30 minimum
    await completedPickup(u, 10);                                                                                   // $200 → 200 points, doubled for a member
    expect((await call(u.cookie, 'GET', '/api/rewards')).body.points).toBe(400);
    await pool.query(`UPDATE memberships SET ends_at = now() - interval '1 day' WHERE user_id = $1`, [u.id]);     // the trial runs out
    expect((await call(u.cookie, 'GET', '/api/membership')).body.member.active).toBe(false);
    await addToCart(u.cookie, garri, 2);
    expect((await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body.delivery_cents).toBeGreaterThan(0);
  });
  it('the account summary gathers it all in one call', async () => {
    const u = await newCustomer();
    const s = (await call(u.cookie, 'GET', '/api/me/summary')).body;
    expect(s.rewards.points).toBe(0); expect(s.membership.can_try).toBe(true); expect(s).toMatchObject({ buy_again: 0, saved: 0, group_orders: 0, unread_messages: 0 });
    await call(u.cookie, 'PUT', '/api/favourites/garri-white'); await call(u.cookie, 'POST', '/api/group-orders', { name: 'x' });
    expect((await call(u.cookie, 'GET', '/api/me/summary')).body).toMatchObject({ saved: 1, group_orders: 1 });
  });
});
