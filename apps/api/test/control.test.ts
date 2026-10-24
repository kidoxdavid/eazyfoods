import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, productId, setOffer, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { clearFeatureCache } from '../src/services/features.js';

const S1 = 'demo-calgary-west-african-market';
let admin: string, owner1: string;
beforeAll(async () => { await openAllStores(); admin = (await login('admin@example.test')).cookie; owner1 = (await login('owner1@example.test')).cookie; });
afterAll(async () => {
  await pool.query('UPDATE feature_flags SET enabled = true');
  await pool.query(`UPDATE vendors SET capabilities = '{}'`);
  await pool.query(`UPDATE app_settings SET value = '{"promotions":true,"ads":true,"multibuy":true,"csv_import":true,"storefront":true,"schedule":true,"questions":true,"messages":true}' WHERE key = 'vendor.default_capabilities'`);
  await pool.query(`UPDATE portal_config SET hidden_nav = '{}', notice = NULL`);
  clearFeatureCache();
});
const flip = async (key: string, enabled: boolean) => { const r = await call(admin, 'PUT', `/api/admin/control/features/${key}`, { enabled }); expect(r.status).toBe(200); };

describe('access', () => {
  it('only admins and owners can use the control centre', async () => {
    for (const e of ['support@example.test', 'marketing@example.test', 'owner1@example.test', 'customer@example.test']) expect([401, 403]).toContain((await call((await login(e)).cookie, 'GET', '/api/admin/control/features')).status);
    expect((await call(null, 'GET', '/api/admin/control/features')).status).toBe(401);
    expect((await call(admin, 'GET', '/api/admin/control/features')).status).toBe(200);
    expect((await call(admin, 'PUT', '/api/admin/control/features/no.such.thing', { enabled: false })).status).toBe(404);
  });
  it('anyone can read which switches are on, and every change is audited', async () => {
    await flip('shop.flyer', false);
    expect((await call(null, 'GET', '/api/features')).body['shop.flyer']).toBe(false);
    await flip('shop.flyer', true);
    expect((await pool.query(`SELECT count(*)::int n FROM audit_log WHERE action = 'feature.toggle'`)).rows[0].n).toBeGreaterThanOrEqual(2);
  });
});

describe('shop switches really switch things off', () => {
  it('tips, gift notes and credit are ignored when off', async () => {
    const u = await newCustomer(); await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 80), 2);
    await call((await login('marketing@example.test')).cookie, 'POST', '/api/marketing/credit/grant', { email: u.email, amount_cents: 1000, note: 'test' });
    const q = async (b: object = {}) => (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', tip_cents: 500, use_credit: true, ...b })).body;
    expect((await q()).tip_cents).toBe(500);
    expect((await q()).credit_applied_cents).toBe(1000);
    await flip('shop.tips', false); await flip('shop.store_credit', false); await flip('shop.gift_notes', false);
    const off = await q();
    expect(off.tip_cents).toBe(0); expect(off.credit_applied_cents).toBe(0);
    const c = await checkout(u.cookie, u.addressId, { tip_cents: 500, gift_message: 'hello there', use_credit: true });
    const o = (await pool.query('SELECT tip_cents, credit_cents, is_gift, gift_message FROM orders WHERE id = $1', [c.body.order.id])).rows[0];
    expect(o).toEqual({ tip_cents: 0, credit_cents: 0, is_gift: false, gift_message: null });
    expect((await call(u.cookie, 'POST', '/api/me/credit/redeem', { code: 'EAZY-AAAA-AAAA' })).status).toBe(403);
  });
  it('multi-buy prices stop applying, and the flyer, questions, lists and alerts go away', async () => {
    const offer = await setOffer(S1, 'garri-white', 2000, 80);
    const sid = await storeId(S1), pid = await productId('garri-white');
    expect((await call(owner1, 'PUT', `/api/vendor/stores/${sid}/offers/${pid}/tiers`, { tiers: [{ min_qty: 2, unit_price_cents: 1500 }] })).status).toBe(200);
    const u = await newCustomer();
    expect((await call(u.cookie, 'PUT', `/api/cart/items/${offer}`, { quantity: 3 })).body.subtotal_cents).toBe(4500);
    await flip('shop.multibuy', false);
    expect((await call(u.cookie, 'GET', '/api/cart')).body.subtotal_cents).toBe(6000);
    expect((await call(owner1, 'PUT', `/api/vendor/stores/${sid}/offers/${pid}/tiers`, { tiers: [] })).status).toBe(200);
    await flip('shop.flyer', false); await flip('shop.questions', false); await flip('shop.lists', false); await flip('shop.alerts', false); await flip('shop.compare_stores', false); await flip('shop.frequently_bought', false);
    expect((await call(null, 'GET', '/api/flyer')).status).toBe(403);
    expect((await call(null, 'GET', '/api/products/garri-white/questions')).body).toEqual([]);
    expect((await call(u.cookie, 'POST', '/api/products/garri-white/questions', { question: 'Is it fine?' })).status).toBe(403);
    expect((await call(u.cookie, 'GET', '/api/lists')).status).toBe(403);
    expect((await call(u.cookie, 'GET', '/api/alerts')).status).toBe(403);
    expect((await call(null, 'GET', '/api/stores-compare?postal=T2A0A1')).status).toBe(404);
    expect((await call(null, 'GET', '/api/products/garri-white/together')).body).toEqual([]);
    await pool.query('UPDATE feature_flags SET enabled = true'); clearFeatureCache();
    expect((await call(u.cookie, 'GET', '/api/lists')).status).toBe(200);
  });
  it('substitution choices fall back to asking when off, and pre-orders are refused', async () => {
    const u = await newCustomer(); const offer = await setOffer(S1, 'garri-white', 2000, 80); await addToCart(u.cookie, offer, 2);
    await call(u.cookie, 'PUT', `/api/cart/items/${offer}/preference`, { sub_pref: 'refund' });
    await flip('shop.substitution_prefs', false);
    const c = await checkout(u.cookie, u.addressId);
    expect((await pool.query('SELECT sub_pref FROM order_lines l JOIN suborders s ON s.id = l.suborder_id WHERE s.order_id = $1', [c.body.order.id])).rows[0].sub_pref).toBe('ask');
    expect((await call(u.cookie, 'PUT', `/api/cart/items/${offer}/preference`, { sub_pref: 'closest' })).status).toBe(403);
  });
});

describe('vendor capabilities', () => {
  const caps = () => call(admin, 'GET', '/api/admin/control/vendor-capabilities');
  it('a default can be turned off for everyone, and a single vendor can be overridden either way', async () => {
    const sid = await storeId(S1);
    const promo = (c: string) => call(c, 'POST', `/api/vendor/stores/${sid}/promotions`, { product_id: '00000000-0000-0000-0000-000000000000', sale_price_cents: 100, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 864e5).toISOString() });
    expect((await promo(owner1)).status).not.toBe(403);                                      // allowed (fails later on the made-up product)
    expect((await call(admin, 'PUT', '/api/admin/control/vendor-capabilities/defaults', { promotions: false })).status).toBe(200);
    const r = await promo(owner1);
    expect(r.status).toBe(403); expect(r.body.message).toMatch(/not enabled/i);
    const v1 = (await caps()).body.vendors.find((v: any) => v.id === (null as any) || v.effective.promotions === false);
    expect(v1).toBeTruthy();
    const vendorId = (await pool.query('SELECT vendor_id FROM stores WHERE id = $1', [sid])).rows[0].vendor_id;
    expect((await call(admin, 'PUT', `/api/admin/control/vendor-capabilities/${vendorId}`, { promotions: true })).status).toBe(200);
    expect((await promo(owner1)).status).not.toBe(403);                                      // this vendor is allowed again
    expect((await call(owner1, 'GET', '/api/vendor/capabilities')).body.promotions).toBe(true);
    expect((await call(admin, 'PUT', `/api/admin/control/vendor-capabilities/${vendorId}`, { promotions: null })).status).toBe(200);
    expect((await call(owner1, 'GET', '/api/vendor/capabilities')).body.promotions).toBe(false);   // back to the default
    expect((await call(admin, 'PUT', `/api/admin/control/vendor-capabilities/${vendorId}`, { flying: true })).status).toBe(400);
  });
  it('other capabilities block their own actions only', async () => {
    const sid = await storeId(S1), pid = await productId('garri-white');
    await call(admin, 'PUT', '/api/admin/control/vendor-capabilities/defaults', { promotions: true, multibuy: false, csv_import: false, ads: false, storefront: false });
    expect((await call(owner1, 'PUT', `/api/vendor/stores/${sid}/offers/${pid}/tiers`, { tiers: [] })).status).toBe(403);
    expect((await call(owner1, 'POST', `/api/vendor/stores/${sid}/import`, { csv: 'a', dry_run: true })).status).toBe(403);
    expect((await call(owner1, 'PUT', `/api/vendor/stores/${sid}/branding`, {})).status).toBe(403);
    expect((await call(owner1, 'POST', '/api/vendor/ads', {})).status).toBe(403);
    expect((await call(owner1, 'GET', `/api/vendor/stores/${sid}/offers`)).status).toBe(200);   // everything else still works
  });
});

describe('portal customisation', () => {
  it('menu items can be hidden and a notice shown for one area; the control centre itself cannot be hidden', async () => {
    expect((await call(admin, 'PUT', '/api/admin/control/portals/vendor', { hidden_nav: ['/vendor/ads'], notice: 'Holiday hours: payouts pause Dec 24 to 26', notice_tone: 'warn' })).status).toBe(200);
    const cfg = (await call(owner1, 'GET', '/api/portal-config/vendor')).body;
    expect(cfg.hidden_nav).toEqual(['/vendor/ads']);
    expect(cfg.notice).toMatch(/Holiday/);
    expect((await call(null, 'GET', '/api/portal-config/vendor')).status).toBe(401);
    expect((await call(admin, 'PUT', '/api/admin/control/portals/admin', { hidden_nav: ['/admin/control'], notice: null })).status).toBe(400);
    expect((await call(admin, 'PUT', '/api/admin/control/portals/nowhere', { hidden_nav: [], notice: null })).status).toBe(400);
  });
  it('platform switches flip the existing yes/no settings', async () => {
    const before = (await call(admin, 'GET', '/api/admin/control/platform')).body;
    expect(before.map((x: any) => x.key)).toContain('kitchens.enabled');
    expect((await call(admin, 'PUT', '/api/admin/control/platform/kitchens.enabled', { enabled: false })).status).toBe(200);
    expect((await pool.query(`SELECT value FROM app_settings WHERE key = 'kitchens.enabled'`)).rows[0].value).toBe(false);
    expect((await call(admin, 'PUT', '/api/admin/control/platform/kitchens.enabled', { enabled: true })).status).toBe(200);
    expect((await call(admin, 'PUT', '/api/admin/control/platform/currency', { enabled: false })).status).toBe(404);
  });
});

describe('admin opens a vendor portal', () => {
  it('works as that vendor until they exit; only admins can; it is audited and never outlives the session', async () => {
    const vid = (await pool.query('SELECT vendor_id FROM stores WHERE slug = $1', [S1])).rows[0].vendor_id;
    const support = (await login('support@example.test')).cookie;
    expect((await call(support, 'POST', `/api/admin/control/act-as/${vid}`)).status).toBe(403);
    // a non-admin cannot gain anything even if the flag is forced in the database
    const sup = (await pool.query(`SELECT id FROM users WHERE email = 'support@example.test'`)).rows[0].id;
    await pool.query('UPDATE sessions SET acting_vendor_id = $2 WHERE user_id = $1', [sup, vid]);
    expect((await call(support, 'GET', '/api/vendor/stores')).body).toEqual([]);
    await pool.query('UPDATE sessions SET acting_vendor_id = NULL WHERE user_id = $1', [sup]);

    expect((await call(admin, 'GET', '/api/vendor/stores')).body).toEqual([]);                  // an admin is not a vendor by default
    expect((await call(admin, 'POST', `/api/admin/control/act-as/${vid}`)).status).toBe(200);
    expect((await call(admin, 'GET', '/api/auth/me')).body.acting_vendor.id).toBe(vid);
    const stores = (await call(admin, 'GET', '/api/vendor/stores')).body;
    expect(stores.some((s: any) => s.slug === S1)).toBe(true);
    expect((await call(admin, 'GET', '/api/vendor/orders')).status).toBe(200);
    expect((await call(admin, 'GET', '/api/vendor/capabilities')).status).toBe(200);
    expect((await call(admin, 'DELETE', '/api/admin/control/act-as')).status).toBe(200);
    expect((await call(admin, 'GET', '/api/vendor/stores')).body).toEqual([]);
    expect((await call(admin, 'GET', '/api/auth/me')).body.acting_vendor).toBeUndefined();
    const log = (await pool.query(`SELECT action FROM audit_log WHERE action LIKE 'act_as.%' ORDER BY id DESC LIMIT 2`)).rows.map((r) => r.action);
    expect(log).toEqual(['act_as.stop', 'act_as.start']);
  });
});
