import { beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, ledgerSum, login, newCustomer, openAllStores, productId, setOffer, simulate, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);
const who = async (e: string) => (await login(e)).cookie;

async function paid(extra: object = {}, qty = 2) {
  const u = await newCustomer();
  const garri = await setOffer(S1, 'garri-white', 2000, 50);
  await addToCart(u.cookie, garri, qty);
  const c = await checkout(u.cookie, u.addressId, extra);
  expect(c.status, JSON.stringify(c.body)).toBe(201);
  const id = c.body.order.id as string;
  await simulate(u.cookie, id, 'succeeded');
  const order = (await call(u.cookie, 'GET', `/api/orders/${id}`)).body;
  return { u, id, order, sid: order.suborders[0].id as string, garri };
}

describe('driver tips', () => {
  it('are part of the total, held in tips_payable, and passed to the driver only on delivery', async () => {
    const { u, id, order, sid } = await paid({ tip_cents: 500 });
    expect(order.tip_cents).toBe(500);
    expect(order.total_cents).toBe(order.subtotal_cents - order.discount_cents + order.delivery_cents + order.tax_cents + 500);
    expect(await ledgerSum(id)).toBe(0);
    expect(await ledgerSum(id, 'cash_provider')).toBe(order.total_cents);
    expect(await ledgerSum(id, 'tips_payable')).toBe(-500);

    const owner = await who('owner1@example.test'), disp = await who('dispatcher@example.test'), driver = await who('driver@example.test');
    for (const s of ['accept', 'preparing', 'ready']) expect((await call(owner, 'POST', `/api/vendor/suborders/${sid}/${s}`)).status).toBe(200);
    const dispatch = (await call(disp, 'GET', '/api/admin/dispatch')).body;
    const job = dispatch.jobs.find((j: any) => j.order_number === order.order_number);
    await call(disp, 'POST', `/api/admin/deliveries/${job.id}/assign`, { driver_id: dispatch.drivers[0].id });
    const mine = (await call(u.cookie, 'GET', `/api/orders/${id}`)).body.suborders[0];
    expect(mine.driver_first_name).toBeTruthy();
    const dj = (await call(driver, 'GET', '/api/driver/jobs')).body.find((j: any) => j.order_number === order.order_number);
    await call(driver, 'POST', `/api/driver/jobs/${dj.id}/pickup`);
    const done = await call(driver, 'POST', `/api/driver/jobs/${dj.id}/deliver`, { code: mine.handover_code });
    expect(done.status).toBe(200);
    expect(done.body.tip_cents).toBe(500);
    expect(await ledgerSum(id)).toBe(0);
    expect(await ledgerSum(id, 'tips_payable')).toBe(0);                      // released to the driver
    expect(await ledgerSum(id, 'driver_payable')).toBe(-(450 + 500));
    const e = (await pool.query('SELECT amount_cents, tip_cents FROM driver_earnings WHERE delivery_id = $1', [dj.id])).rows[0];
    expect(e).toEqual({ amount_cents: 950, tip_cents: 500 });
  });
  it('are returned with the rest when the store rejects the order, and ignored for pickup or silly amounts', async () => {
    const { id, sid, order } = await paid({ tip_cents: 700 });
    const owner = await who('owner1@example.test');
    expect((await call(owner, 'POST', `/api/vendor/suborders/${sid}/reject`, { reason: 'Out of stock today' })).status).toBe(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(await ledgerSum(id)).toBe(0);
    expect(await ledgerSum(id, 'tips_payable')).toBe(0);
    expect(await ledgerSum(id, 'cash_provider')).toBe(0);                     // everything including the tip went back
    expect((await pool.query('SELECT tip_refunded FROM suborders WHERE id = $1', [sid])).rows[0].tip_refunded).toBe(true);
    expect(order.tip_cents).toBe(700);

    const u = await newCustomer();
    await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 50), 1);
    const q = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: null, method: 'pickup', tip_cents: 400 })).body;
    expect(q.tip_cents).toBe(0);
    const big = await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', tip_cents: 999999 });
    expect(big.status).toBe(400);
  });
});

describe('multi-buy pricing', () => {
  it('lets a store set price breaks, which the basket and the order use', async () => {
    const owner = await who('owner1@example.test');
    const offer = await setOffer(S1, 'garri-white', 2000, 50);
    const sid = await storeId(S1), pid = await productId('garri-white');
    const url = `/api/vendor/stores/${sid}/offers/${pid}/tiers`;
    expect((await call(owner, 'PUT', url, { tiers: [{ min_qty: 3, unit_price_cents: 2100 }] })).status).toBe(400);                       // not cheaper
    expect((await call(owner, 'PUT', url, { tiers: [{ min_qty: 3, unit_price_cents: 1800 }, { min_qty: 5, unit_price_cents: 1900 }] })).status).toBe(400);   // not cheaper than the break before
    expect((await call(null, 'PUT', url, { tiers: [] })).status).toBe(401);
    expect((await call(owner, 'PUT', url, { tiers: [{ min_qty: 3, unit_price_cents: 1800 }, { min_qty: 5, unit_price_cents: 1600 }] })).status).toBe(200);

    const u = await newCustomer();
    let cart = (await addToCart(u.cookie, offer, 2)).body;
    expect(cart.stores[0].items[0].unit_price_cents).toBe(2000);
    cart = (await addToCart(u.cookie, offer, 3)).body;
    expect(cart.stores[0].items[0].unit_price_cents).toBe(1800);
    expect(cart.subtotal_cents).toBe(5400);
    expect(cart.stores[0].items[0].price_changed).toBe(false);
    cart = (await addToCart(u.cookie, offer, 5)).body;
    expect(cart.subtotal_cents).toBe(8000);
    const c = await checkout(u.cookie, u.addressId);
    expect(c.status).toBe(201);
    const line = (await pool.query('SELECT unit_price_cents, quantity, line_total_cents FROM order_lines l JOIN suborders s ON s.id = l.suborder_id WHERE s.order_id = $1', [c.body.order.id])).rows[0];
    expect(line).toEqual({ unit_price_cents: 1600, quantity: 5, line_total_cents: 8000 });
    // cards show the break when that store is the one the card adds from (the cheapest in stock)
    await pool.query(`UPDATE store_offers SET is_active = false WHERE product_id = $1 AND id <> $2`, [pid, offer]);
    expect((await call(null, 'GET', '/api/search?q=garri')).body.results.find((r: any) => r.slug === 'garri-white').multibuy).toEqual({ min_qty: 3, unit_price_cents: 1800 });
    expect((await call(null, 'GET', '/api/products/garri-white')).body.offers.find((o: any) => o.offer_id === offer).tiers).toHaveLength(2);
    // the flyer lists it
    const flyer = (await call(null, 'GET', '/api/flyer')).body;
    expect(flyer.stores.flatMap((s: any) => s.items).some((i: any) => i.slug === 'garri-white' && i.multibuy)).toBe(true);
    await pool.query(`UPDATE store_offers SET is_active = true WHERE product_id = $1`, [pid]);
    await call(owner, 'PUT', url, { tiers: [] });
  });
});

describe('substitution preferences', () => {
  it('"refund" blocks proposals, "closest" applies the store’s swap at once, "ask" still asks', async () => {
    const owner = await who('owner1@example.test');
    const swap = await setOffer(S1, 'plantain-chips-salted', 1500, 20);
    for (const [pref, expectStatus] of [['refund', 409], ['closest', 200], ['ask', 200]] as const) {
      const { u, order, sid, garri } = await paid({}, 2);
      void u;
      await pool.query(`UPDATE order_lines SET sub_pref = $2 WHERE suborder_id = $1`, [sid, pref]);
      await call(owner, 'POST', `/api/vendor/suborders/${sid}/accept`);
      const r = await call(owner, 'POST', `/api/vendor/suborders/${sid}/lines/${(await pool.query('SELECT id FROM order_lines WHERE suborder_id = $1', [sid])).rows[0].id}/substitute`, { offer_id: swap });
      expect(r.status).toBe(expectStatus);
      const line = (await pool.query('SELECT substitution_status FROM order_lines WHERE suborder_id = $1', [sid])).rows[0];
      expect(line.substitution_status).toBe(pref === 'closest' ? 'approved' : pref === 'ask' ? 'proposed' : 'none');
      void order; void garri;
    }
  });
  it('is chosen per item in the basket and copied to the order', async () => {
    const u = await newCustomer();
    const offer = await setOffer(S1, 'garri-white', 2000, 50);
    await addToCart(u.cookie, offer, 2);
    expect((await call(u.cookie, 'PUT', `/api/cart/items/${offer}/preference`, { sub_pref: 'sideways' })).status).toBe(400);
    expect((await call(u.cookie, 'PUT', `/api/cart/items/${offer}/preference`, { sub_pref: 'refund' })).body.stores[0].items[0].sub_pref).toBe('refund');
    const c = await checkout(u.cookie, u.addressId);
    expect((await call(u.cookie, 'GET', `/api/orders/${c.body.order.id}`)).body.suborders[0].lines[0].sub_pref).toBe('refund');
  });
});

describe('gifts', () => {
  it('carry a note to the store', async () => {
    const { sid } = await paid({ gift_message: 'Happy birthday Mum!' });
    const owner = await who('owner1@example.test');
    const o = (await call(owner, 'GET', '/api/vendor/orders')).body.find((x: any) => x.id === sid);
    expect(o.is_gift).toBe(true);
    expect(o.gift_message).toBe('Happy birthday Mum!');
  });
});

describe('product questions', () => {
  it('appear after a store answers; stores that do not sell the product cannot answer', async () => {
    const u = await newCustomer();
    await setOffer(S1, 'garri-white', 2000, 50);
    expect((await call(null, 'POST', '/api/products/garri-white/questions', { question: 'Is this fine ground?' })).status).toBe(401);
    expect((await call(u.cookie, 'POST', '/api/products/garri-white/questions', { question: 'hi' })).status).toBe(400);
    expect((await call(u.cookie, 'POST', '/api/products/garri-white/questions', { question: 'Is this fine ground?' })).status).toBe(201);
    expect((await call(null, 'GET', '/api/products/garri-white/questions')).body).toEqual([]);          // unanswered questions stay private
    const owner = await who('owner1@example.test');
    const open = (await call(owner, 'GET', '/api/questions/open')).body.find((q: any) => q.question === 'Is this fine ground?');
    expect(open).toBeTruthy();
    // owner3 does not sell it
    await pool.query(`UPDATE store_offers SET is_active = false WHERE product_id = (SELECT id FROM products WHERE slug = 'garri-white') AND store_id IN (SELECT s.id FROM stores s JOIN vendors v ON v.id = s.vendor_id JOIN user_roles r ON r.vendor_id = v.id JOIN users x ON x.id = r.user_id WHERE x.email = 'owner3@example.test')`);
    const other = await who('owner3@example.test');
    expect((await call(other, 'POST', `/api/questions/${open.id}/answer`, { answer: 'Sure.' })).status).toBe(404);
    expect((await call(owner, 'POST', `/api/questions/${open.id}/answer`, { answer: 'Medium grind, good for eba.' })).status).toBe(200);
    const shown = (await call(null, 'GET', '/api/products/garri-white/questions')).body;
    expect(shown.find((q: any) => q.id === open.id).answer).toBe('Medium grind, good for eba.');
    expect(shown.find((q: any) => q.id === open.id).first_name).toBeTruthy();
  });
});

describe('frequently bought together', () => {
  it('needs at least three different paid orders before it suggests anything', async () => {
    const offerA = await setOffer(S1, 'shito-black-pepper-sauce', 1800, 100), offerB = await setOffer(S1, 'plantain-chips-salted', 1500, 100);
    const together = async () => (await call(null, 'GET', '/api/products/shito-black-pepper-sauce/together')).body.map((c: any) => c.slug) as string[];
    const pairs = async () => (await pool.query(
      `SELECT count(*)::int AS n FROM (SELECT s.order_id FROM order_lines l JOIN suborders s ON s.id = l.suborder_id JOIN orders o ON o.id = s.order_id
        WHERE o.payment_status IN ('paid','partially_refunded') AND l.product_id IN (SELECT id FROM products WHERE slug IN ('shito-black-pepper-sauce','plantain-chips-salted'))
        GROUP BY s.order_id HAVING count(DISTINCT l.product_id) = 2) x`)).rows[0].n as number;
    const buy = async () => {
      const u = await newCustomer();
      await addToCart(u.cookie, offerA, 2); await addToCart(u.cookie, offerB, 2);
      const c = await checkout(u.cookie, u.addressId);
      expect(c.status, JSON.stringify(c.body)).toBe(201);
      await simulate(u.cookie, c.body.order.id, 'succeeded');
    };
    while ((await pairs()) < 2) await buy();
    if ((await pairs()) === 2) expect(await together()).not.toContain('plantain-chips-salted');
    while ((await pairs()) < 3) await buy();
    const t = await together();
    expect(t).toContain('plantain-chips-salted');
    expect(t).not.toContain('shito-black-pepper-sauce');
  });
});
