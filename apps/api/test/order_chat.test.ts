import { beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);

async function paid() {
  const u = await newCustomer();
  const garri = await setOffer(S1, 'garri-white', 2000, 50);
  await addToCart(u.cookie, garri, 2);
  const c = await checkout(u.cookie, u.addressId);
  const id = c.body.order.id as string;
  await simulate(u.cookie, id, 'succeeded');
  const order = (await call(u.cookie, 'GET', `/api/orders/${id}`)).body;
  return { u, id, sid: order.suborders[0].id as string, number: order.order_number as string };
}

describe('order chat', () => {
  it('the customer and the store write to each other about one order; unread counts and emails follow', async () => {
    const { u, sid, number } = await paid();
    const owner = (await login('owner1@example.test')).cookie;
    expect((await call(u.cookie, 'GET', `/api/orders/suborders/${sid}/messages`)).body.messages).toEqual([]);
    const a = await call(u.cookie, 'POST', `/api/orders/suborders/${sid}/messages`, { body: 'Please ring the bell twice.' });
    expect(a.status).toBe(200); expect(a.body.messages.length).toBe(1);
    // the store sees it as unread, reads it, replies
    expect((await call(owner, 'GET', '/api/vendor/orders-unread-messages')).body.find((x: any) => x.suborder_id === sid)?.unread).toBe(1);
    const seen = await call(owner, 'GET', `/api/vendor/suborders/${sid}/messages`);
    expect(seen.body.messages[0].body).toBe('Please ring the bell twice.'); expect(seen.body.messages[0].sender).toBe('customer');
    expect((await call(owner, 'GET', '/api/vendor/orders-unread-messages')).body.find((x: any) => x.suborder_id === sid)).toBeUndefined();
    const r = await call(owner, 'POST', `/api/vendor/suborders/${sid}/messages`, { body: 'Will do!' });
    expect(r.body.messages.map((m: any) => m.sender)).toEqual(['customer', 'store']);
    expect((await call(u.cookie, 'GET', `/api/orders/suborders/${sid}/messages`)).body.messages.length).toBe(2);
    // emails were queued for both sides
    const mails = (await pool.query(`SELECT template FROM notifications WHERE vars->>'order_number' = $1 AND template LIKE 'order_message%'`, [number])).rows.map((x) => x.template);
    expect(mails).toContain('order_message_customer'); expect(mails).toContain('order_message_store');
  });
  it('only the people in the order can see or write', async () => {
    const { u, sid } = await paid();
    const other = await newCustomer(); const otherStore = (await login('owner2@example.test').catch(() => ({ cookie: '' }))).cookie;
    expect((await call(other.cookie, 'GET', `/api/orders/suborders/${sid}/messages`)).status).toBe(404);
    expect((await call(other.cookie, 'POST', `/api/orders/suborders/${sid}/messages`, { body: 'hi' })).status).toBe(404);
    if (otherStore) expect([403, 404]).toContain((await call(otherStore, 'GET', `/api/vendor/suborders/${sid}/messages`)).status);
    expect((await call(null, 'GET', `/api/orders/suborders/${sid}/messages`)).status).toBe(401);
    expect((await call(u.cookie, 'POST', `/api/orders/suborders/${sid}/messages`, { body: '   ' })).status).toBe(400);
    expect((await call(u.cookie, 'POST', `/api/orders/suborders/${sid}/messages`, { body: 'x'.repeat(601) })).status).toBe(400);
  });
  it('closes three days after the order ends', async () => {
    const { u, sid } = await paid();
    await pool.query(`UPDATE suborders SET status = 'delivered', completed_at = now() - interval '4 days' WHERE id = $1`, [sid]);
    const g = await call(u.cookie, 'GET', `/api/orders/suborders/${sid}/messages`);
    expect(g.body.open).toBe(false);
    expect((await call(u.cookie, 'POST', `/api/orders/suborders/${sid}/messages`, { body: 'late' })).status).toBe(409);
  });
});
