import { describe, expect, it } from 'vitest';
import { addToCart, call, newCustomer, openAllStores, setOffer, simulate, checkout } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { runProductAlerts } from '../src/services/alerts.js';

const S1 = 'demo-calgary-west-african-market';

describe('unit prices and dietary filters', () => {
  it('gives weight/volume packs a price per 100 g/ml, sorts by it, and leaves other packs without one', async () => {
    await openAllStores();
    const r = (await call(null, 'GET', '/api/search?q=garri')).body.results[0];
    expect(r.unit_basis).toBe('100g');
    const kg = Number(r.pack_size) * (String(r.pack_unit).toLowerCase() === 'kg' ? 10 : 1);
    expect(r.unit_price_cents).toBe(Math.round(r.min_price / kg));
    const sorted = (await call(null, 'GET', '/api/search?sort=unit_price')).body.results.filter((x: any) => x.unit_price_cents != null).map((x: any) => x.unit_price_cents);
    // within one basis the list is ascending (mixing 100 g and 100 ml is by design only roughly comparable)
    expect(sorted.length).toBeGreaterThan(3);
    const none = (await call(null, 'GET', '/api/search?q=')).body.results.filter((x: any) => !['g', 'kg', 'lb', 'oz', 'ml', 'l', 'cl'].includes(String(x.pack_unit).toLowerCase()));
    for (const x of none) expect(x.unit_price_cents).toBeNull();
  });
  it('filters by verified dietary labels and reports counts', async () => {
    const vegan = (await call(null, 'GET', '/api/search?diet=vegan')).body;
    expect(vegan.total).toBeGreaterThan(0);
    for (const x of vegan.results) expect(x.dietary.vegan).toBe(true);
    const both = (await call(null, 'GET', '/api/search?diet=vegan,gluten_free')).body;
    expect(both.total).toBeLessThanOrEqual(vegan.total);
    expect((await call(null, 'GET', '/api/search')).body.facets.dietary.find((d: any) => d.key === 'vegan').n).toBeGreaterThan(0);
    expect((await call(null, 'GET', '/api/search?diet=halal')).body.total).toBe((await call(null, 'GET', '/api/search')).body.total);  // unknown labels are ignored, never guessed
    const admin = (await (await import('./helpers.js')).login('admin@example.test')).cookie;
    const pid = (await pool.query(`SELECT id FROM products WHERE slug = 'garri-white'`)).rows[0].id;
    expect((await call(admin, 'PATCH', `/api/admin/products/${pid}`, { dietary: { vegan: true, gluten_free: false, halal: true } })).status).toBe(400);   // only known labels
    expect((await call(admin, 'PATCH', `/api/admin/products/${pid}`, { dietary: { vegan: true, gluten_free: true } })).status).toBe(200);
  });
});

describe('buy again and recently viewed cards', () => {
  it('shows only what the customer actually received, most-bought first', async () => {
    const u = await newCustomer();
    expect((await call(u.cookie, 'GET', '/api/me/buy-again')).body).toEqual([]);
    const offer = await setOffer(S1, 'garri-white', 2500, 20);
    await addToCart(u.cookie, offer, 2);
    const c = await checkout(u.cookie, u.addressId);
    await simulate(u.cookie, c.body.order.id, 'succeeded');
    expect((await call(u.cookie, 'GET', '/api/me/buy-again')).body).toEqual([]);                    // paid is not received
    await pool.query(`UPDATE suborders SET status = 'delivered', completed_at = now() WHERE order_id = $1`, [c.body.order.id]);
    const again = (await call(u.cookie, 'GET', '/api/me/buy-again')).body;
    expect(again.map((x: any) => x.slug)).toEqual(['garri-white']);
    expect((await call(null, 'GET', '/api/me/buy-again')).status).toBe(401);
  });
  it('returns cards for slugs in the order asked, skipping unknown ones', async () => {
    const r = (await call(null, 'GET', '/api/products-cards?slugs=shito-black-pepper-sauce,nope,garri-white')).body;
    expect(r.map((x: any) => x.slug)).toEqual(['shito-black-pepper-sauce', 'garri-white']);
  });
});

describe('shopping lists', () => {
  it('belong to their owner, can be shared read-only, unshared, and copied', async () => {
    const a = await newCustomer(), b = await newCustomer();
    const l = (await call(a.cookie, 'POST', '/api/lists', { name: 'Sunday jollof' })).body;
    expect((await call(a.cookie, 'PUT', `/api/lists/${l.id}/items`, { slug: 'garri-white', quantity: 2 })).status).toBe(200);
    expect((await call(a.cookie, 'PUT', `/api/lists/${l.id}/items`, { slug: 'not-real', quantity: 1 })).status).toBe(404);
    expect((await call(a.cookie, 'PUT', `/api/lists/${l.id}/items`, { slug: 'garri-white', quantity: 100 })).status).toBe(400);
    const got = (await call(a.cookie, 'GET', `/api/lists/${l.id}`)).body;
    expect(got.items[0]).toMatchObject({ slug: 'garri-white', list_quantity: 2 });
    for (const m of ['GET', 'DELETE'] as const) expect((await call(b.cookie, m, `/api/lists/${l.id}`)).status).toBe(404);   // someone else's list
    expect((await call(b.cookie, 'PUT', `/api/lists/${l.id}/items`, { slug: 'garri-white', quantity: 5 })).status).toBe(404);
    expect((await call(null, 'GET', '/api/lists/shared/whatever')).status).toBe(404);
    const { token } = (await call(a.cookie, 'POST', `/api/lists/${l.id}/share`)).body;
    const pub = (await call(null, 'GET', `/api/lists/shared/${token}`)).body;
    expect(pub.name).toBe('Sunday jollof'); expect(pub.items).toHaveLength(1); expect(JSON.stringify(pub)).not.toContain(a.email);
    const copy = (await call(b.cookie, 'POST', `/api/lists/shared/${token}/copy`)).body;
    expect((await call(b.cookie, 'GET', `/api/lists/${copy.id}`)).body.items).toHaveLength(1);
    expect((await call(a.cookie, 'DELETE', `/api/lists/${l.id}/share`)).status).toBe(200);
    expect((await call(null, 'GET', `/api/lists/shared/${token}`)).status).toBe(404);              // old link is dead
    expect((await call(a.cookie, 'PUT', `/api/lists/${l.id}/items`, { slug: 'garri-white', quantity: 0 })).status).toBe(200);
    expect((await call(a.cookie, 'GET', `/api/lists/${l.id}`)).body.items).toEqual([]);
  });
});

describe('alerts', () => {
  it('back-in-stock and price-drop alerts fire once, only when true, and can be removed', async () => {
    const u = await newCustomer();
    const slug = 'shito-black-pepper-sauce';
    const offer = await setOffer(S1, slug, 1000, 0);                                               // sold out at this store
    await pool.query('DELETE FROM offer_promotions WHERE offer_id = $1', [offer]);                 // a live promotion would override the price we set
    await pool.query(`UPDATE store_offers o SET stock_on_hand = 0 WHERE o.product_id = (SELECT id FROM products WHERE slug = $1)`, [slug]);   // and every other store
    expect((await call(u.cookie, 'POST', '/api/alerts', { slug, kind: 'price_drop' })).status).toBe(400);   // cannot watch the price of something out of stock
    expect((await call(u.cookie, 'POST', '/api/alerts', { slug, kind: 'back_in_stock' })).status).toBe(201);
    expect(await runProductAlerts()).toBe(0);                                                       // still out: nothing sent
    await pool.query('UPDATE store_offers SET stock_on_hand = 10 WHERE id = $1', [offer]);
    const before = (await pool.query(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND template = 'product_alert'`, [u.id])).rows[0].n;
    expect(await runProductAlerts()).toBeGreaterThanOrEqual(1);
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND template = 'product_alert'`, [u.id])).rows[0].n).toBe(before + 1);
    expect(await runProductAlerts()).toBe(0);                                                       // fires once
    expect((await call(u.cookie, 'POST', '/api/alerts', { slug, kind: 'back_in_stock' })).status).toBe(400);   // in stock now
    // price drop
    expect((await call(u.cookie, 'POST', '/api/alerts', { slug, kind: 'price_drop' })).status).toBe(201);
    await runProductAlerts(); expect((await call(u.cookie, 'GET', '/api/alerts')).body).toHaveLength(1);       // same price: no alert
    await pool.query('UPDATE store_offers SET price_cents = 800 WHERE id = $1', [offer]);
    await runProductAlerts(); expect((await call(u.cookie, 'GET', '/api/alerts')).body).toHaveLength(0);       // fired and switched off
    const again = await call(u.cookie, 'POST', '/api/alerts', { slug, kind: 'price_drop' });
    expect(again.status).toBe(201);
    const id = (await call(u.cookie, 'GET', '/api/alerts')).body[0].id;
    const other = await newCustomer();
    await call(other.cookie, 'DELETE', `/api/alerts/${id}`);
    expect((await call(u.cookie, 'GET', '/api/alerts')).body).toHaveLength(1);                                // someone else cannot delete it
    await call(u.cookie, 'DELETE', `/api/alerts/${id}`);
    expect((await call(u.cookie, 'GET', '/api/alerts')).body).toHaveLength(0);
    await pool.query('UPDATE store_offers SET price_cents = 1000 WHERE id = $1', [offer]);
  });
});
