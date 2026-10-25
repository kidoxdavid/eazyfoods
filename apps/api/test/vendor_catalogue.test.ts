import { describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, setOffer, simulate, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
const asVendor = (c: string, m: string, u: string, p?: unknown) => call(c, m, u, p, { 'x-area': 'vendor' });

describe('vendor product list (original portal shape)', () => {
  it('lists with images and original field names; creates, edits, duplicates and deletes', async () => {
    await openAllStores();
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    const list = (await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/catalogue`)).body;
    expect(list.length).toBeGreaterThan(3);
    expect(list[0]).toHaveProperty('stock_quantity'); expect(list[0]).toHaveProperty('status'); expect(list[0]).toHaveProperty('price');

    const make = async (name: string) => (await asVendor(owner, 'POST', `/api/vendor/stores/${sid}/catalogue`, { name, price: 12.5, sale_price: 9.99, stock_quantity: 5, low_stock_threshold: 2, sku: 'ZZ-1', unit: 'bottle', track_expiry: true, expiry_date: '2030-01-01', status: 'active' }));
    const c1 = await make('Zzz Sauce One');
    expect(c1.status).toBe(201); expect(c1.body).toMatchObject({ price: 12.5, sale_price: 9.99, stock_quantity: 5, unit: 'bottle', owned: true, pending_review: true });
    const pid = c1.body.id;
    const up = await asVendor(owner, 'PUT', `/api/vendor/stores/${sid}/catalogue/${pid}`, { name: 'Zzz Sauce One+', price: 15, stock_quantity: 8, status: 'hidden', low_stock_threshold: 2 });
    expect(up.status).toBe(200); expect(up.body).toMatchObject({ name: 'Zzz Sauce One+', price: 15, sale_price: null, stock_quantity: 8, status: 'hidden' });
    const code = (await asVendor(owner, 'POST', `/api/vendor/stores/${sid}/catalogue/${pid}/barcode`)).body.barcode;
    expect(code).toMatch(/^\d{13}$/);
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode?code=${code}`)).body.id).toBe(pid);
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/catalogue/expiring`)).status).toBe(200);

    const del = await asVendor(owner, 'DELETE', `/api/vendor/stores/${sid}/catalogue/${pid}`);
    expect(del.status).toBe(200); expect(del.body.deleted).toBe(true);
    expect((await pool.query('SELECT 1 FROM products WHERE id=$1', [pid])).rowCount).toBe(0);
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/catalogue/${pid}`)).status).toBe(404);
  });

  it('hides (not deletes) a product that has orders, and a shared product only loses this store’s listing', async () => {
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    const u = await newCustomer();
    const offerId = await setOffer(S1, 'garri-white', 2000, 10);
    await addToCart(u.cookie, offerId, 2);
    const o = (await checkout(u.cookie, u.addressId)).body.order; await simulate(u.cookie, o.id, 'succeeded');
    const pid = (await pool.query('SELECT id FROM products WHERE slug=$1', ['garri-white'])).rows[0].id;
    const del = await asVendor(owner, 'DELETE', `/api/vendor/stores/${sid}/catalogue/${pid}`);
    expect(del.body).toMatchObject({ deleted: false, hidden: true });
    expect((await pool.query('SELECT is_active FROM store_offers WHERE store_id=$1 AND product_id=$2', [sid, pid])).rows[0].is_active).toBe(false);
    expect((await pool.query('SELECT 1 FROM products WHERE id=$1', [pid])).rowCount).toBe(1);
    const other = (await login('owner2@example.test')).cookie;
    expect([401, 403, 404]).toContain((await asVendor(other, 'DELETE', `/api/vendor/stores/${sid}/catalogue/${pid}`)).status);   // another vendor cannot touch it
  });
});
