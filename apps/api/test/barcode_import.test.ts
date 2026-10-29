import { afterEach, describe, expect, it, vi } from 'vitest';
import { call, login, openAllStores, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
const asVendor = (c: string, m: string, u: string, p?: unknown) => call(c, m, u, p, { 'x-area': 'vendor' });
afterEach(() => vi.unstubAllGlobals());

// Only the outbound lookup is faked; requests to the app itself go through call() and never use fetch.
const fakeOff = (body: unknown, ok = true) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body }) as Response));

describe('barcode suggestions and bulk product creation', () => {
  it('suggests a new product from the public database, and never blocks when it is down', async () => {
    await openAllStores();
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    fakeOff({ status: 1, product: { product_name: 'Test Jollof Mix', brands: 'Acme, Other', quantity: '400 g', generic_name: 'Seasoning', image_front_url: 'https://images.example/x.jpg' } });
    const hit = await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode/suggest?code=5000112637922`);
    expect(hit.body).toMatchObject({ found: true, suggestion: { name: 'Test Jollof Mix', brand: 'Acme', quantity: '400 g' } });
    fakeOff({ status: 0 });
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode/suggest?code=5000112637922`)).body.found).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode/suggest?code=5000112637922`)).body.found).toBe(false);
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode/suggest?code=abc`)).status).toBe(400);
    // A code already in the catalogue is reported as existing, not looked up.
    const code = (await pool.query(`SELECT barcode FROM products WHERE barcode IS NOT NULL LIMIT 1`)).rows[0]?.barcode;
    if (code) expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode/suggest?code=${code}`)).body).toMatchObject({ found: false, exists: true });
  });

  it('CSV import creates new products from name + barcode, checks first, and rejects bad or repeated rows', async () => {
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    const csv = ['barcode,sku,slug,name,unit,price,stock,active',
      '7770001110001,,,Bulk Import Alpha 500g,500 g,6.50,12,yes',
      '7770001110002,,,Bulk Import Beta,,3.25,4,yes',
      '7770001110001,,,Bulk Import Alpha Again,,6.50,1,yes',
      '12ab,,,Bad Code Item,,5,1,yes',
      '7770001110003,,,,,5,1,yes'].join('\n');
    const dry = await asVendor(owner, 'POST', `/api/vendor/stores/${sid}/import`, { csv, dry_run: true });
    expect(dry.body).toMatchObject({ succeeded: 2, created: 2, failed: 3 });
    expect((await pool.query(`SELECT 1 FROM products WHERE barcode LIKE '777000111%'`)).rowCount).toBe(0);
    const real = await asVendor(owner, 'POST', `/api/vendor/stores/${sid}/import`, { csv });
    expect(real.status).toBe(201); expect(real.body).toMatchObject({ succeeded: 2, created: 2 });
    const rows = (await pool.query(`SELECT p.name, o.price_cents, o.stock_on_hand FROM products p JOIN store_offers o ON o.product_id=p.id AND o.store_id=$1 WHERE p.barcode LIKE '777000111%' ORDER BY p.barcode`, [sid])).rows;
    expect(rows).toEqual([{ name: 'Bulk Import Alpha 500g', price_cents: 650, stock_on_hand: 12 }, { name: 'Bulk Import Beta', price_cents: 325, stock_on_hand: 4 }]);
    // Scanning the new barcode now finds it in this store.
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/barcode?code=7770001110001`)).status).toBe(200);
  });
});

import { runLowStockAlerts } from '../src/services/alerts.js';
describe('low-stock emails', () => {
  it('sends one digest per vendor, not again until restocked, and respects the switch', async () => {
    await openAllStores();
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    const pid = (await pool.query(`SELECT p.id FROM products p JOIN store_offers o ON o.product_id=p.id WHERE o.store_id=$1 AND p.slug='garri-white'`, [sid])).rows[0].id;
    const vendor = (await pool.query('SELECT vendor_id FROM stores WHERE id=$1', [sid])).rows[0].vendor_id;
    // Everything else is fine; this one item runs low.
    await pool.query(`UPDATE store_offers SET low_stock_notified_at = now() WHERE store_id=$1`, [sid]);
    await pool.query(`UPDATE store_offers SET low_stock_notified_at = NULL, is_active = true, stock_on_hand = 2, stock_reserved = 0, low_stock_threshold = 3 WHERE store_id=$1 AND product_id=$2`, [sid, pid]);
    await pool.query(`DELETE FROM notifications WHERE template='vendor_low_stock'`);
    await pool.query(`UPDATE vendors SET low_stock_emails = true WHERE id=$1`, [vendor]);
    await runLowStockAlerts();
    const first = (await pool.query(`SELECT body FROM notifications WHERE template='vendor_low_stock' AND body LIKE '%2 left%'`)).rowCount ?? 0;
    expect(first).toBeGreaterThan(0);
    const before = (await pool.query(`SELECT count(*)::int n FROM notifications WHERE template='vendor_low_stock'`)).rows[0].n;
    await runLowStockAlerts();                                                    // nothing new: no repeat
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE template='vendor_low_stock'`)).rows[0].n).toBe(before);
    await pool.query(`UPDATE store_offers SET stock_on_hand = 50 WHERE store_id=$1 AND product_id=$2`, [sid, pid]);
    await runLowStockAlerts();                                                    // restocked: re-armed
    await pool.query(`UPDATE store_offers SET stock_on_hand = 1 WHERE store_id=$1 AND product_id=$2`, [sid, pid]);
    await runLowStockAlerts();
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE template='vendor_low_stock'`)).rows[0].n).toBe(before + 1);
    // Switched off: nothing more is sent.
    expect((await asVendor(owner, 'PUT', '/api/vendor/low-stock-emails', { enabled: false })).body).toEqual({ enabled: false });
    await pool.query(`UPDATE store_offers SET low_stock_notified_at = NULL WHERE store_id=$1 AND product_id=$2`, [sid, pid]);
    await runLowStockAlerts();
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE template='vendor_low_stock'`)).rows[0].n).toBe(before + 1);
    await asVendor(owner, 'PUT', '/api/vendor/low-stock-emails', { enabled: true });
  });
});
