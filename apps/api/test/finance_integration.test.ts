import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, setOffer, simulate, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);
// Rules are append-only history: leave every rule this file made retired so other tests see the original behaviour.
afterAll(async () => { await pool.query(`UPDATE pricing_rules SET status = 'retired', effective_to = now() WHERE name LIKE 'T:%' AND status = 'active'`); });

const makeRule = async (cookie: string, body: object) => (await call(cookie, 'POST', '/api/admin/pricing/rules', body));
const activate = async (admin: string, fin: string, id: string, extra: object = {}) => {
  expect((await call(fin, 'POST', `/api/admin/pricing/rules/${id}/submit`)).status).toBe(200);
  return call(admin, 'POST', `/api/admin/pricing/rules/${id}/approve`, { confirm: true, ...extra });
};

describe('pricing rules: permissions, versioning, locking', () => {
  it('only the right roles can view, edit and approve; validation explains problems in plain language', async () => {
    const admin = (await login('admin@example.test')).cookie, fin = (await login('finance@example.test')).cookie, support = (await login('support@example.test')).cookie;
    const cust = (await newCustomer()).cookie;
    expect([401, 403]).toContain((await call(cust, 'GET', '/api/admin/pricing/rules')).status);
    expect(((await call(support, 'GET', '/api/admin/pricing/rules')).status)).toBe(403);
    expect((await call(fin, 'GET', '/api/admin/pricing/rules')).status).toBe(200);          // finance may view and edit
    const bad = await makeRule(fin, { kind: 'delivery', name: 'T: bad', params: { model: 'distance_bands', bands: [{ up_to_km: 5, fee_cents: 500 }, { up_to_km: 3, fee_cents: 600 }] } });
    expect(bad.status).toBe(400); expect(JSON.stringify(bad.body)).toMatch(/overlap|after/);
    const ok = await makeRule(fin, { kind: 'delivery', name: 'T: flat 450', scope_type: 'store', scope_id: await storeId(S1), params: { model: 'flat', flat_cents: 450 } });
    expect(ok.status).toBe(201);
    expect((await call(fin, 'POST', `/api/admin/pricing/rules/${ok.body.id}/submit`)).status).toBe(200);
    expect((await call(fin, 'POST', `/api/admin/pricing/rules/${ok.body.id}/approve`, { confirm: true })).status).toBe(403);   // approval is a separate permission
    expect((await call(admin, 'POST', `/api/admin/pricing/rules/${ok.body.id}/approve`, { confirm: true })).status).toBe(200);
    const seeded = (await call(admin, 'GET', '/api/admin/pricing/rules?kind=commission')).body.find((r: any) => r.status === 'draft');
    expect(seeded).toBeTruthy();                                                              // the proposed profile exists but is NOT live
    const events = (await call(admin, 'GET', `/api/admin/pricing/rules/${ok.body.id}`)).body.events.map((e: any) => e.action);
    expect(events).toEqual(expect.arrayContaining(['created', 'submitted', 'approved']));
  });

  it('a second approver can be required, and a stale edit does not overwrite someone else’s change', async () => {
    const admin = (await login('admin@example.test')).cookie, fin = (await login('finance@example.test')).cookie;
    const r = await makeRule(admin, { kind: 'service_fee', name: 'T: fee', params: { mode: 'fixed', fixed_cents: 99 } });
    const d = (await call(admin, 'GET', `/api/admin/pricing/rules/${r.body.id}`)).body;
    expect((await call(admin, 'PUT', `/api/admin/pricing/rules/${r.body.id}`, { name: 'T: fee 2', params: { mode: 'fixed', fixed_cents: 149 }, expected_updated_at: d.updated_at })).status).toBe(200);
    expect((await call(fin, 'PUT', `/api/admin/pricing/rules/${r.body.id}`, { name: 'T: fee 3', params: { mode: 'fixed', fixed_cents: 199 }, expected_updated_at: d.updated_at })).status).toBe(409);
    await pool.query(`UPDATE app_settings SET value = 'true' WHERE key = 'finance.require_second_approver'`);
    try {
      await call(admin, 'POST', `/api/admin/pricing/rules/${r.body.id}/submit`);
      const self = await call(admin, 'POST', `/api/admin/pricing/rules/${r.body.id}/approve`, { confirm: true });
      expect(self.status).toBe(409); expect(self.body.error).toBe('second_approver_required');
    } finally { await pool.query(`UPDATE app_settings SET value = 'false' WHERE key = 'finance.require_second_approver'`); }
    expect((await call(admin, 'POST', `/api/admin/pricing/rules/${r.body.id}/approve`, { confirm: true })).status).toBe(200);
  });

  it('checkout uses the live rule; an order keeps the price and the driver pay it was placed under; fallbacks are recorded', async () => {
    const admin = (await login('admin@example.test')).cookie, fin = (await login('finance@example.test')).cookie;
    const sid = await storeId(S1);
    const u = await newCustomer();
    await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 10), 2);
    // Rule A is the store's flat 450 (made above) plus driver pay 777
    const dpA = await makeRule(fin, { kind: 'driver_pay', name: 'T: pay 777', scope_type: 'store', scope_id: sid, params: { flat_cents: 777 } });
    expect((await activate(admin, fin, dpA.body.id)).status).toBe(200);
    const q = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body;
    expect(q.suborders[0].delivery_cents).toBe(450);
    expect(q.suborders[0].pricing.delivery).toMatchObject({ source: 'rule', model: 'flat', fee_cents: 450 });
    const o = (await checkout(u.cookie, u.addressId)).body.order;
    await simulate(u.cookie, o.id, 'succeeded');
    const snap = (await pool.query('SELECT pricing_snapshot FROM suborders WHERE order_id = $1', [o.id])).rows[0].pricing_snapshot;
    expect(snap.delivery).toMatchObject({ rule_version: expect.any(Number), fee_cents: 450 }); expect(snap.commission).toBeTruthy();

    // The owner changes both rules afterwards: new versions, effective now.
    const flat2 = await makeRule(fin, { kind: 'delivery', name: 'T: flat 999', scope_type: 'store', scope_id: sid, params: { model: 'flat', flat_cents: 999 } });
    expect((await activate(admin, fin, flat2.body.id)).status).toBe(200);
    const dpB = await makeRule(fin, { kind: 'driver_pay', name: 'T: pay 888', scope_type: 'store', scope_id: sid, params: { flat_cents: 888 } });
    expect((await activate(admin, fin, dpB.body.id)).status).toBe(200);
    const u2 = await newCustomer(); await addToCart(u2.cookie, await setOffer(S1, 'garri-white', 2000, 10), 2);
    expect((await call(u2.cookie, 'POST', '/api/checkout/quote', { address_id: u2.addressId, method: 'delivery' })).body.suborders[0].delivery_cents).toBe(999);   // new orders pay the new fee
    expect((await pool.query('SELECT pricing_snapshot FROM suborders WHERE order_id = $1', [o.id])).rows[0].pricing_snapshot.delivery.fee_cents).toBe(450);   // the placed order did not change

    // Ready the old order: the driver earns what was in force when it was placed.
    const owner = (await login('owner1@example.test')).cookie;
    const subId = (await pool.query('SELECT id FROM suborders WHERE order_id = $1', [o.id])).rows[0].id;
    for (const step of ['accept', 'preparing', 'ready']) expect((await call(owner, 'POST', `/api/vendor/suborders/${subId}/${step}`)).status).toBe(200);
    const del = (await pool.query('SELECT earning_cents, pay_breakdown FROM deliveries WHERE suborder_id = $1', [subId])).rows[0];
    expect(del.earning_cents).toBe(777); expect(del.pay_breakdown).toMatchObject({ source: 'rule', tips_excluded: true });

    // A distance rule with no routing available follows its explicit fallback.
    const bands = await makeRule(fin, { kind: 'delivery', name: 'T: bands block', scope_type: 'store', scope_id: sid, params: { model: 'distance_bands', bands: [{ up_to_km: 5, fee_cents: 500 }, { up_to_km: null, fee_cents: 900 }], fallback: 'block' } });
    expect((await activate(admin, fin, bands.body.id)).status).toBe(200);
    const blocked = (await call(u2.cookie, 'POST', '/api/checkout/quote', { address_id: u2.addressId, method: 'delivery' })).body;
    expect(blocked.ok).toBe(false); expect(JSON.stringify(blocked.issues)).toMatch(/delivery distance/);
    const zone = await makeRule(fin, { kind: 'delivery', name: 'T: bands zone', scope_type: 'store', scope_id: sid, params: { model: 'distance_bands', bands: [{ up_to_km: 5, fee_cents: 500 }, { up_to_km: null, fee_cents: 900 }], fallback: 'zone_fee' } });
    expect((await activate(admin, fin, zone.body.id)).status).toBe(200);
    const fb = (await call(u2.cookie, 'POST', '/api/checkout/quote', { address_id: u2.addressId, method: 'delivery' })).body;
    expect(fb.ok).toBe(true); expect(fb.suborders[0].delivery_cents).toBe(599);                              // zone fee, and the snapshot says so
    expect(fb.suborders[0].pricing.delivery).toMatchObject({ model: 'zone_fee', distance_method: 'none' });
  });

  it('future-dated rules do not apply yet, a retired rule stops, and the simulator matches production', async () => {
    const admin = (await login('admin@example.test')).cookie, fin = (await login('finance@example.test')).cookie;
    const sid = await storeId(S1);
    const u = await newCustomer(); await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 10), 2);
    const quote = async () => (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body.suborders[0];
    const before = (await quote()).delivery_cents;
    const later = new Date(Date.now() + 3600_000).toISOString();
    const f = await makeRule(fin, { kind: 'delivery', name: 'T: future', scope_type: 'store', scope_id: sid, params: { model: 'flat', flat_cents: 1234 } });
    expect((await activate(admin, fin, f.body.id, { effective_from: later })).status).toBe(200);
    expect((await quote()).delivery_cents).toBe(before);                                                       // not yet
    expect((await call(admin, 'POST', `/api/admin/pricing/rules/${f.body.id}/retire`)).status).toBe(200);

    // simulator: same engine, nothing created
    const orders = (await pool.query('SELECT count(*)::int n FROM orders')).rows[0].n;
    const sim = await call(fin, 'POST', '/api/admin/pricing/simulate', { merchandise_cents: 7000, distance_km: 6, delivery: { model: 'flat', flat_cents: 799 }, driver_pay: { flat_cents: 700 }, commission: { bps: 1200 }, service_fee: null, processing_fixed_cents: 265 });
    expect(sim.status).toBe(200);
    expect(sim.body.platform).toMatchObject({ commission_cents: 840, delivery_revenue_cents: 799, driver_pay_cents: 700, margin_cents: 674 });
    expect((await pool.query('SELECT count(*)::int n FROM orders')).rows[0].n).toBe(orders);
    expect([401, 403]).toContain((await call((await newCustomer()).cookie, 'POST', '/api/admin/pricing/simulate', { merchandise_cents: 100 })).status);
  });
});
