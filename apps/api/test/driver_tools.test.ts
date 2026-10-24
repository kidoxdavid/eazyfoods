import { beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { clearFeatureCache } from '../src/services/features.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);
const who = async (e: string) => (await login(e)).cookie;

async function readyOrder() {
  const u = await newCustomer();
  const garri = await setOffer(S1, 'garri-white', 2000, 10);
  await addToCart(u.cookie, garri, 2);
  const o = (await checkout(u.cookie, u.addressId, { tip_cents: 300 })).body.order;
  await simulate(u.cookie, o.id, 'succeeded');
  const order = (await call(u.cookie, 'GET', `/api/orders/${o.id}`)).body;
  const sid = order.suborders[0].id as string;
  const owner = await who('owner1@example.test');
  for (const step of ['accept', 'preparing', 'ready']) await call(owner, 'POST', `/api/vendor/suborders/${sid}/${step}`);
  const did = (await pool.query('SELECT id FROM deliveries WHERE suborder_id=$1', [sid])).rows[0].id as string;
  return { u, order, sid, did };
}

async function freshDriver() {
  const c = await newCustomer();
  expect((await call(c.cookie, 'POST', '/api/driver/apply', { phone: '5875550177', vehicle: 'Car' })).status).toBe(201);
  const admin = await who('admin@example.test');
  const did = (await pool.query('SELECT id FROM drivers WHERE user_id=$1', [c.id])).rows[0].id;
  await call(admin, 'PATCH', `/api/admin/drivers/${did}`, { licence_verified: true, background_check_verified: true });
  expect((await call(admin, 'PATCH', `/api/admin/drivers/${did}`, { status: 'approved' })).status).toBe(200);
  await call(c.cookie, 'PUT', '/api/driver/availability', { available: true });
  return c.cookie;
}

describe('driver tools', () => {
  it('lists open deliveries without street or name, accepts atomically, shares location only when opted in, rates', async () => {
    const driver = await freshDriver();
    const { u, order, did } = await readyOrder();

    const open = (await call(driver, 'GET', '/api/driver/available')).body;
    const mine = open.jobs.find((j: any) => j.id === did);
    expect(mine).toBeTruthy();
    expect(mine.tip_cents).toBe(300);
    expect(JSON.stringify(mine)).not.toMatch(/Test User|line1|phone|recipient/);
    expect(mine.dropoff_area).toMatch(/^T2A$/);
    expect(mine.dropoff).toBeUndefined();

    const a = await call(driver, 'POST', `/api/driver/jobs/${did}/accept`);
    expect(a.status).toBe(200);
    expect((await call(driver, 'POST', `/api/driver/jobs/${did}/accept`)).status).toBe(409);   // already taken

    // not sharing: nothing is stored
    expect((await call(driver, 'POST', `/api/driver/jobs/${did}/location`, { lat: 51.05, lng: -114.07 })).body.shared).toBe(false);
    await call(driver, 'PUT', '/api/driver/profile', { phone: '5875550100', vehicle: 'Car', nav_app: 'waze', share_location: true });
    expect((await call(driver, 'GET', '/api/driver/me')).body.nav_app).toBe('waze');
    await call(driver, 'POST', `/api/driver/jobs/${did}/pickup`);
    expect((await call(driver, 'POST', `/api/driver/jobs/${did}/location`, { lat: 51.05, lng: -114.07, accuracy_m: 12 })).body.shared).toBe(true);

    const seen = (await call(u.cookie, 'GET', `/api/orders/${order.id}`)).body.suborders[0];
    expect(seen.driver_location).toMatchObject({ lat: 51.05, lng: -114.07 });
    expect(seen.can_rate_driver).toBe(false);

    const code = seen.handover_code;
    expect((await call(driver, 'POST', `/api/driver/jobs/${did}/deliver`, { code })).status).toBe(200);
    expect((await pool.query('SELECT 1 FROM delivery_locations WHERE delivery_id=$1', [did])).rowCount).toBe(0);
    const after = (await call(u.cookie, 'GET', `/api/orders/${order.id}`)).body.suborders[0];
    expect(after.driver_location).toBeUndefined();
    expect(after.can_rate_driver).toBe(true);

    expect((await call(u.cookie, 'POST', `/api/orders/${order.id}/suborders/${after.id}/driver-rating`, { rating: 5, comment: 'Great' })).status).toBe(201);
    expect((await call(u.cookie, 'POST', `/api/orders/${order.id}/suborders/${after.id}/driver-rating`, { rating: 1 })).status).toBe(409);
    const ratings = (await call(driver, 'GET', '/api/driver/ratings')).body;
    expect(ratings.count).toBeGreaterThanOrEqual(1);
    expect(ratings.average).toBeNull();   // k-anonymity: no average below 3 ratings
    await call(driver, 'PUT', '/api/driver/profile', { phone: '5875550100', vehicle: 'Car', nav_app: 'google', share_location: false });
  });

  it('hands back a job, caps active jobs at 3, and exposes dashboard, performance and support', async () => {
    const driver = await freshDriver();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await readyOrder()).did);
    for (const id of ids.slice(0, 3)) expect((await call(driver, 'POST', `/api/driver/jobs/${id}/accept`)).status).toBe(200);
    expect((await call(driver, 'POST', `/api/driver/jobs/${ids[3]}/accept`)).status).toBe(409);
    expect((await call(driver, 'POST', `/api/driver/jobs/${ids[0]}/release`)).status).toBe(200);
    expect((await call(driver, 'POST', `/api/driver/jobs/${ids[3]}/accept`)).status).toBe(200);

    const dash = (await call(driver, 'GET', '/api/driver/dashboard')).body;
    expect(dash.active.length).toBe(3);
    expect(dash.available_count).toBeGreaterThanOrEqual(1);
    expect((await call(driver, 'GET', '/api/driver/performance')).status).toBe(200);
    expect((await call(driver, 'POST', '/api/driver/support', { subject: 'Question', message: 'How do payouts work exactly?' })).status).toBe(201);
    expect((await call(driver, 'GET', '/api/driver/support')).body.length).toBeGreaterThanOrEqual(1);

    // a customer cannot use any of it
    const u = await newCustomer();
    expect([401, 403]).toContain((await call(u.cookie, 'GET', '/api/driver/available')).status);
    for (const id of ids) await pool.query(`UPDATE deliveries SET driver_id=NULL, status='failed' WHERE id=$1`, [id]);
  });

  it('self-assign can be switched off in the control centre', async () => {
    const driver = await freshDriver();
    await pool.query(`UPDATE feature_flags SET enabled=false WHERE key='driver.self_assign'`);
    clearFeatureCache();
    try {
      const { did } = await readyOrder();
      expect((await call(driver, 'GET', '/api/driver/available')).body.jobs).toEqual([]);
      expect((await call(driver, 'POST', `/api/driver/jobs/${did}/accept`)).status).toBe(403);
    } finally { await pool.query(`UPDATE feature_flags SET enabled=true WHERE key='driver.self_assign'`); clearFeatureCache(); }
  });
});
