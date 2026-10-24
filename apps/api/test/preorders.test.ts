import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, simulate, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';

const K1 = 'demo-mama-ngozi-kitchen';
const dish = async () => (await pool.query(`SELECT o.id FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE s.slug = $1 AND p.name ILIKE 'Jollof%'`, [K1])).rows[0].id as string;
const edmonton = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

async function ready() {
  const offer = await dish();
  await pool.query('UPDATE store_offers SET stock_on_hand = 50, stock_reserved = 0, price_cents = 2500, is_active = true WHERE id = $1', [offer]);
  await pool.query('UPDATE stores SET slot_capacity = 3, preorders_enabled = true, preorder_lead_minutes = 120, preorder_max_days = 7, slot_minutes = 60 WHERE slug = $1', [K1]);
  await pool.query('DELETE FROM store_closures');
  return offer;
}
beforeEach(async () => { await openAllStores(); await ready(); });
afterEach(async () => { await openAllStores(); await pool.query('DELETE FROM store_closures'); await pool.query('UPDATE stores SET slot_capacity = 3 WHERE slug = $1', [K1]); });

const slots = async () => (await call(null, 'GET', `/api/slots/${K1}`)).body;

describe('slot availability', () => {
  it('offers whole-hour slots past the lead time and inside the horizon', async () => {
    const r = await slots();
    expect(r.enabled).toBe(true); expect(r.slots.length).toBeGreaterThan(20);
    const first = new Date(r.slots[0].start), last = new Date(r.slots[r.slots.length - 1].start);
    expect(first.getTime()).toBeGreaterThanOrEqual(Date.now() + 119 * 60_000);
    expect(first.getUTCMinutes() % 30).toBe(0);
    expect(last.getTime()).toBeLessThanOrEqual(Date.now() + 8 * 864e5);
    expect(r.slots.every((s: any) => s.remaining === 3)).toBe(true);
  });

  it('skips closure days; stores without pre-orders offer none', async () => {
    const chef = (await login('chef1@example.test')).cookie;
    const sid = await storeId(K1);
    const tomorrow = edmonton(new Date(Date.now() + 864e5));
    const cur = (await call(chef, 'GET', `/api/vendor/stores/${sid}/schedule`)).body;
    const put = await call(chef, 'PUT', `/api/vendor/stores/${sid}/schedule`, { ...cur, closures: [{ on_date: tomorrow, reason: 'Family event' }] });
    expect(put.status).toBe(200);
    const r = await slots();
    expect(r.slots.some((s: any) => edmonton(new Date(s.start)) === tomorrow)).toBe(false);
    expect(r.slots.some((s: any) => edmonton(new Date(s.start)) === edmonton(new Date(Date.now() + 2 * 864e5)))).toBe(true);
    expect((await call(null, 'GET', '/api/slots/demo-calgary-west-african-market')).body).toEqual({ enabled: false, slots: [] });
  });

  it('only the owner can change a schedule, and values are bounded', async () => {
    const other = (await login('chef2@example.test')).cookie, chef = (await login('chef1@example.test')).cookie, sid = await storeId(K1);
    const body = { preorders_enabled: true, preorder_lead_minutes: 120, preorder_max_days: 7, slot_minutes: 60, slot_capacity: 3, closures: [] };
    expect((await call(other, 'PUT', `/api/vendor/stores/${sid}/schedule`, body)).status).toBe(403);
    expect((await call(chef, 'PUT', `/api/vendor/stores/${sid}/schedule`, { ...body, slot_minutes: 45 })).status).toBe(400);
    expect((await call(chef, 'PUT', `/api/vendor/stores/${sid}/schedule`, { ...body, slot_capacity: 0 })).status).toBe(400);
    expect((await call(chef, 'PUT', `/api/vendor/stores/${sid}/schedule`, { ...body, preorder_max_days: 60 })).status).toBe(400);
  });
});

describe('ordering for a slot', () => {
  it('a closed kitchen takes an order for a later slot; the order carries the slot and the promise', async () => {
    const offer = await dish();
    const dow = Number((await pool.query(`SELECT extract(dow FROM (now() AT TIME ZONE 'America/Edmonton'))::int AS d`)).rows[0].d);
    await pool.query(`DELETE FROM store_hours WHERE store_id = (SELECT id FROM stores WHERE slug = $1) AND dow = $2`, [K1, dow]);   // closed today only
    const u = await newCustomer();
    await addToCart(u.cookie, offer, 1);
    const q0 = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body;
    expect(q0.issues.map((i: any) => i.type)).toContain('store_closed');
    const slot = (await slots()).slots[0];
    const q1 = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', slots: { [K1]: slot.start } })).body;
    expect(q1.issues).toEqual([]); expect(q1.ok).toBe(true);
    expect(new Date(q1.suborders[0].scheduled_for).toISOString()).toBe(slot.start);
    const c = await checkout(u.cookie, u.addressId, { slots: { [K1]: slot.start } });
    expect(c.status).toBeLessThan(300);
    const orderId = c.body.order.id;
    expect((await simulate(u.cookie, orderId, 'succeeded')).status).toBe(200);
    const s = (await pool.query('SELECT scheduled_for, scheduled_until, promised_at, status FROM suborders WHERE order_id = $1', [orderId])).rows[0];
    expect(s.status).toBe('placed');
    expect(new Date(s.scheduled_for).toISOString()).toBe(slot.start);
    expect(new Date(s.promised_at).toISOString()).toBe(new Date(s.scheduled_until).toISOString());
    const view = (await call(u.cookie, 'GET', `/api/orders/${orderId}`)).body;
    expect(view.suborders[0].scheduled_for).toBeTruthy();
    const chef = (await login('chef1@example.test')).cookie;
    const vo = (await call(chef, 'GET', '/api/vendor/orders')).body.find((o: any) => o.order_number === view.order_number);
    expect(vo.scheduled_for).toBeTruthy();
  });

  it('rejects slots that are invalid, unavailable or from a store without pre-orders', async () => {
    const offer = await dish();
    const u = await newCustomer();
    await addToCart(u.cookie, offer, 1);
    const q = async (slots: object) => (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', slots })).body;
    expect((await q({ [K1]: new Date(Date.now() + 30 * 60_000).toISOString() })).issues.map((i: any) => i.type)).toContain('slot_unavailable');      // inside the lead time
    expect((await q({ [K1]: '2031-01-01T12:00:00.000Z' })).issues.map((i: any) => i.type)).toContain('slot_unavailable');                           // beyond the horizon
    const bad = await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', slots: { [K1]: 'tomorrow' } });
    expect(bad.status).toBe(400);
    const u2 = await newCustomer();
    await addToCart(u2.cookie, (await pool.query(`SELECT o.id FROM store_offers o JOIN stores s ON s.id = o.store_id WHERE s.slug = 'demo-calgary-west-african-market' AND o.stock_on_hand > 5 LIMIT 1`)).rows[0].id, 4);
    const q2 = (await call(u2.cookie, 'POST', '/api/checkout/quote', { address_id: u2.addressId, method: 'delivery', slots: { 'demo-calgary-west-african-market': (await slots()).slots[0].start } })).body;
    expect(q2.issues.map((i: any) => i.type)).toContain('preorder_unavailable');
  });

  it('a slot cannot be over-booked', async () => {
    const offer = await dish();
    await pool.query('UPDATE stores SET slot_capacity = 1 WHERE slug = $1', [K1]);
    const slot = (await slots()).slots[0];
    const a = await newCustomer(), b = await newCustomer();
    for (const u of [a, b]) await addToCart(u.cookie, offer, 1);
    const [ra, rb] = await Promise.all([a, b].map((u) => checkout(u.cookie, u.addressId, { slots: { [K1]: slot.start } })));
    const statuses = [ra.status, rb.status].sort();
    expect(statuses[0]).toBeLessThan(300);       // one booking wins
    expect(statuses[1]).toBe(409);               // the other is told the slot is gone
    const left = (await slots()).slots.find((s: any) => s.start === slot.start);
    expect(left).toBeUndefined();
  });
});
