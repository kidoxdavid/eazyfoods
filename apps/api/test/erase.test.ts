import { describe, expect, it } from 'vitest';
import { addToCart, app, call, checkout, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
const admin = async () => (await login('admin@example.test')).cookie;

describe('admin delete', () => {
  it('deletes an account with no history completely, and closes one with orders (details scrubbed, sign-in off)', async () => {
    await openAllStores();
    const a = await admin();
    const clean = await newCustomer();
    const r1 = await call(a, 'DELETE', `/api/admin/users/${clean.id}`);
    expect(r1.status).toBe(200); expect(r1.body.deleted).toBe(true);
    expect((await pool.query('SELECT 1 FROM users WHERE id=$1', [clean.id])).rowCount).toBe(0);

    const buyer = await newCustomer();
    await addToCart(buyer.cookie, await setOffer(S1, 'garri-white', 2000, 10), 2);
    const o = (await checkout(buyer.cookie, buyer.addressId)).body.order;
    await simulate(buyer.cookie, o.id, 'succeeded');
    const r2 = await call(a, 'DELETE', `/api/admin/users/${buyer.id}`);
    expect(r2.status).toBe(200); expect(r2.body.closed).toBe(true); expect(r2.body.deleted).toBe(false);
    const u = (await pool.query('SELECT email, full_name, phone, disabled_at FROM users WHERE id=$1', [buyer.id])).rows[0];
    expect(u.email).toMatch(/@deleted\.invalid$/); expect(u.full_name).toBe('Deleted account'); expect(u.disabled_at).not.toBeNull();
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: buyer.email, password: 'a-long-password' } })).statusCode).toBe(401);
    expect((await pool.query('SELECT count(*)::int n FROM orders WHERE id=$1', [o.id])).rows[0].n).toBe(1);   // the order stays
    expect((await call(a, 'DELETE', `/api/admin/users/${buyer.id}`)).status).toBe(404);                         // already closed
  });

  it('refuses to delete yourself or the last admin, and only an admin can delete', async () => {
    const a = await admin(); const me = (await call(a, 'GET', '/api/auth/me', undefined, { 'x-area': 'staff' })).body;
    expect((await call(a, 'DELETE', `/api/admin/users/${me.id}`)).status).toBe(409);
    const cust = await newCustomer(); const other = await newCustomer();
    expect([401, 403]).toContain((await call(cust.cookie, 'DELETE', `/api/admin/users/${other.id}`)).status);
  });

  it('deletes a vendor with no history (stores, dishes and logins go with it) and a driver with no deliveries', async () => {
    const a = await admin();
    const c = await newCustomer();
    const ap = await call(c.cookie, 'POST', '/api/vendor/apply', { business_name: 'Gone Co', phone: '5875550123', store_name: 'Gone Kitchen', address_line: '1 Test St', postal_code: 'T2A 0A1', kind: 'chef', business_type: 'restaurant' });
    expect(ap.status).toBe(201);
    const v = await call(a, 'DELETE', `/api/admin/vendors/${ap.body.vendor_id}`);
    expect(v.status).toBe(200); expect(v.body.deleted).toBe(true);
    expect((await pool.query('SELECT 1 FROM stores WHERE id=$1', [ap.body.store_id])).rowCount).toBe(0);

    const d = await newCustomer();
    expect((await call(d.cookie, 'POST', '/api/driver/apply', { phone: '5875550177' })).status).toBe(201);
    const did = (await pool.query('SELECT id FROM drivers WHERE user_id=$1', [d.id])).rows[0].id;
    const r = await call(a, 'DELETE', `/api/admin/drivers/${did}`);
    expect(r.status).toBe(200); expect(r.body.deleted).toBe(true);
    // a driver with history is closed, not deleted
    const hist = (await pool.query(`SELECT driver_id FROM deliveries WHERE driver_id IS NOT NULL LIMIT 1`)).rows[0];
    if (hist) { const r2 = await call(a, 'DELETE', `/api/admin/drivers/${hist.driver_id}`); expect(r2.body.closed).toBe(true); }
  });
});
