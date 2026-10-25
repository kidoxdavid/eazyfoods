import { describe, expect, it } from 'vitest';
import { app, call, login, newCustomer, openAllStores, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { clearFeatureCache } from '../src/services/features.js';

const S1 = 'demo-calgary-west-african-market';
const as = (cookie: string, w: string, url: string) => call(cookie, 'GET', url, undefined, { 'x-area': w });

describe('vendors add their own products', () => {
  it('creates product, price and stock in one step; hidden until approved when review is on; live at once when off', async () => {
    await openAllStores();
    const owner = (await login('owner1@example.test')).cookie, cust = await newCustomer(), admin = (await login('admin@example.test')).cookie;
    const sid = await storeId(S1);
    const body = (name: string) => ({ name, price_cents: 899, stock: 7, category_slug: 'pantry', sold_by: 'unit' });
    const r = await call(owner, 'POST', `/api/vendor/stores/${sid}/products`, body('Zzz Review Pepper Sauce'));
    expect(r.status).toBe(201); expect(r.body.status).toBe('pending'); expect(r.body.needs_review).toBe(true);
    const list = (await call(owner, 'GET', `/api/vendor/stores/${sid}/offers`)).body;
    expect(list.find((o: any) => o.product_id === r.body.product_id)).toMatchObject({ price_cents: 899, stock_on_hand: 7, product_status: 'pending' });
    expect((await call(cust.cookie, 'GET', `/api/stores/${S1}`)).body.products.some((p: any) => p.name === 'Zzz Review Pepper Sauce')).toBe(false);
    expect((await as(admin, 'admin', '/api/admin/badges')).body['/admin/catalogue']).toBeGreaterThanOrEqual(1);   // the catalogue team sees it waiting
    expect([401, 403]).toContain((await call(cust.cookie, 'POST', `/api/vendor/stores/${sid}/products`, body('Nope'))).status);

    await pool.query(`UPDATE feature_flags SET enabled=false WHERE key='vendor.products_need_review'`); clearFeatureCache();
    try {
      const r2 = await call(owner, 'POST', `/api/vendor/stores/${sid}/products`, body('Zzz Instant Pepper Sauce'));
      expect(r2.body.status).toBe('published');
      expect((await call(cust.cookie, 'GET', `/api/stores/${S1}`)).body.products.some((p: any) => p.name === 'Zzz Instant Pepper Sauce')).toBe(true);
    } finally { await pool.query(`UPDATE feature_flags SET enabled=true WHERE key='vendor.products_need_review'`); clearFeatureCache(); }
  });
});

describe('waiting-for-you badges', () => {
  it('count pending vendors and driver applications for the admin, and nothing for the wrong window', async () => {
    const admin = (await login('admin@example.test')).cookie, c = await newCustomer();
    const before = (await as(admin, 'admin', '/api/admin/badges')).body;
    await call(c.cookie, 'POST', '/api/vendor/apply', { business_name: 'Badge Co', phone: '5875550123', store_name: 'Badge Shop', address_line: '1 Test St', postal_code: 'T2A 0A1' });
    const vid = (await pool.query(`SELECT vendor_id FROM stores WHERE name='Badge Shop'`)).rows[0].vendor_id;
    await pool.query(`UPDATE vendors SET status='submitted' WHERE id=$1`, [vid]);
    const d = await newCustomer(); await call(d.cookie, 'POST', '/api/driver/apply', { phone: '5875550177' });
    const after = (await as(admin, 'admin', '/api/admin/badges')).body;
    expect(after['/admin/vendors']).toBe((before['/admin/vendors'] ?? 0) + 1);
    expect(after['/admin/drivers']).toBe((before['/admin/drivers'] ?? 0) + 1);
    expect((await as(admin, 'vendor', '/api/vendor/badges')).status).toBe(401);      // the admin account is not signed in to the vendor window
    expect([401, 403]).toContain((await as(c.cookie, 'admin', '/api/admin/badges')).status);
  });
});

describe('store cards', () => {
  it('carry the store logo and cover image', async () => {
    await pool.query(`UPDATE stores SET cover_url='/uploads/${'a'.repeat(32)}.jpg', logo_url='/uploads/${'b'.repeat(32)}.png' WHERE slug=$1`, [S1]);
    try { expect((await call(null, 'GET', '/api/stores')).body.find((s: any) => s.slug === S1)).toMatchObject({ cover_url: expect.stringContaining('aaaa'), logo_url: expect.stringContaining('bbbb') }); }
    finally { await pool.query(`UPDATE stores SET cover_url=NULL, logo_url=NULL WHERE slug=$1`, [S1]); }
    void app;
  });
});
