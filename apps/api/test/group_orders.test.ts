import { describe, expect, it } from 'vitest';
import { call, newCustomer, setOffer, openAllStores } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';

describe('group orders', () => {
  it('a starter shares a link, friends add their own items, the starter moves it all to their basket and closes it', async () => {
    await openAllStores();
    const a = await newCustomer(), b = await newCustomer(), c = await newCustomer();
    const garri = await setOffer(S1, 'garri-white', 2000, 50), chips = await setOffer(S1, 'plantain-chips-salted', 1500, 50);
    const made = await call(a.cookie, 'POST', '/api/group-orders', { name: 'Sunday party' });
    expect(made.status).toBe(200); const token = made.body.token; expect(made.body.is_owner).toBe(true); expect(made.body.open).toBe(true);
    // friends add their own items
    expect((await call(b.cookie, 'PUT', `/api/group-orders/${token}/items/${garri}`, { quantity: 2 })).body.my_item_count).toBe(2);
    await call(c.cookie, 'PUT', `/api/group-orders/${token}/items/${garri}`, { quantity: 1 });
    await call(c.cookie, 'PUT', `/api/group-orders/${token}/items/${chips}`, { quantity: 3 });
    const seen = (await call(a.cookie, 'GET', `/api/group-orders/${token}`)).body;
    expect(seen.item_count).toBe(6); expect(seen.total_cents).toBe(2000 * 3 + 1500 * 3); expect(seen.people.length).toBe(2); expect(seen.is_owner).toBe(true);
    expect((await call(b.cookie, 'GET', `/api/group-orders/${token}`)).body.items.filter((i: any) => i.mine).length).toBe(1);
    // taking an item out
    expect((await call(c.cookie, 'PUT', `/api/group-orders/${token}/items/${chips}`, { quantity: 0 })).body.item_count).toBe(3);
    expect((await call(c.cookie, 'PUT', `/api/group-orders/${token}/items/${chips}`, { quantity: 3 })).status).toBe(200);
    // only the starter can check out; a stranger gets nothing for a made-up link
    expect((await call(b.cookie, 'POST', `/api/group-orders/${token}/to-basket`)).status).toBe(409);
    expect((await call(b.cookie, 'GET', '/api/group-orders/nope')).status).toBe(404);
    // the starter moves it into their basket
    await call(a.cookie, 'PUT', `/api/cart/items/${garri}`, { quantity: 1 });
    const moved = await call(a.cookie, 'POST', `/api/group-orders/${token}/to-basket`);
    expect(moved.body.moved).toBe(2);
    const cart = (await call(a.cookie, 'GET', '/api/cart')).body.stores.flatMap((s: any) => s.items);
    expect(cart.find((i: any) => i.offer_id === garri).quantity).toBe(1 + 3); expect(cart.find((i: any) => i.offer_id === chips).quantity).toBe(3);
    // closed: nobody can add any more
    expect((await call(b.cookie, 'PUT', `/api/group-orders/${token}/items/${chips}`, { quantity: 1 })).status).toBe(409);
    expect((await call(a.cookie, 'GET', '/api/group-orders')).body.length).toBe(0);
  });
  it('closes at its deadline, and the starter can close it early', async () => {
    const a = await newCustomer(), b = await newCustomer();
    const garri = await setOffer(S1, 'garri-white', 2000, 50);
    expect((await call(a.cookie, 'POST', '/api/group-orders', { name: 'Past', deadline: new Date(Date.now() - 3600_000).toISOString() })).status).toBe(400);
    const g = (await call(a.cookie, 'POST', '/api/group-orders', { name: 'Soon', deadline: new Date(Date.now() + 3600_000).toISOString() })).body;
    expect((await call(b.cookie, 'PUT', `/api/group-orders/${g.token}/items/${garri}`, { quantity: 1 })).status).toBe(200);
    await pool.query(`UPDATE group_orders SET deadline = now() - interval '1 minute' WHERE token = $1`, [g.token]);
    expect((await call(b.cookie, 'GET', `/api/group-orders/${g.token}`)).body.open).toBe(false);
    expect((await call(b.cookie, 'PUT', `/api/group-orders/${g.token}/items/${garri}`, { quantity: 2 })).status).toBe(409);
    const h = (await call(a.cookie, 'POST', '/api/group-orders', { name: 'Early' })).body;
    expect((await call(b.cookie, 'POST', `/api/group-orders/${h.token}/close`)).status).toBe(404);   // not theirs
    expect((await call(a.cookie, 'POST', `/api/group-orders/${h.token}/close`)).body.open).toBe(false);
    expect((await call(a.cookie, 'POST', '/api/group-orders', { name: '' })).status).toBe(400);
  });
  it('needs a signed-in person', async () => {
    expect((await call(null, 'GET', '/api/group-orders/anything')).status).toBe(401);
  });
});
