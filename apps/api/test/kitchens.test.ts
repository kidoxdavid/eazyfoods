import { beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, ledgerSum, login, newCustomer, openAllStores, simulate, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';

const K1 = 'demo-mama-ngozi-kitchen';
beforeAll(openAllStores);

const dishOffer = async (kitchen: string, like: string) =>
  (await pool.query(`SELECT o.id FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE s.slug = $1 AND p.name ILIKE $2`, [kitchen, like])).rows[0].id as string;

describe('kitchens are separate from the grocery catalogue', () => {
  it('lists kitchens, keeps them out of grocery stores and search, and hides cooks’ street addresses', async () => {
    const k = (await call(null, 'GET', '/api/kitchens')).body;
    expect(k.map((x: any) => x.slug).sort()).toEqual(['demo-habesha-table', K1]);
    expect(k[0].dish_count).toBeGreaterThan(0);
    expect((await call(null, 'GET', '/api/stores')).body.map((s: any) => s.slug)).not.toContain(K1);
    expect((await call(null, 'GET', `/api/stores/${K1}`)).status).toBe(404);
    const found = (await call(null, 'GET', '/api/search?q=jollof')).body.results.map((r: any) => r.slug);
    expect(found.some((s: string) => s.includes('demo-mama-ngozi'))).toBe(false);
    const d = (await call(null, 'GET', `/api/kitchens/${K1}`)).body;
    expect(JSON.stringify(d)).not.toContain('1 Test Kitchen Rd');
    expect(d.area).toBe('T2A');
    const suya = d.dishes.find((x: any) => x.name.startsWith('Suya'));
    expect(suya.allergens).toContain('peanuts'); expect(suya.dish_tags).toContain('halal');
    expect(d.allergen_notice).toMatch(/not verified/);
    expect((await call(null, 'GET', '/api/kitchens?cuisine=Ethiopian')).body.map((x: any) => x.slug)).toEqual(['demo-habesha-table']);
  });

  it('a dish is ordered, taxed as prepared food, paid and settled through the shared machinery', async () => {
    const u = await newCustomer();
    const offer = await dishOffer(K1, 'Jollof%');
    await pool.query('UPDATE store_offers SET stock_on_hand = 10, stock_reserved = 0, price_cents = 2000 WHERE id = $1', [offer]);
    await addToCart(u.cookie, offer, 2);
    const q = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery' })).body;
    expect(q.ok).toBe(true);
    expect(q.suborders[0].tax_cents).toBe(200);        // 5% GST: prepared meals are not zero-rated
    expect(q.suborders[0].commission_cents).toBe(480);  // default 12% of 40.00
    const c = await checkout(u.cookie, u.addressId);
    expect(c.status).toBeLessThan(300);
    const orderId = c.body.order?.id ?? c.body.id;
    expect((await simulate(u.cookie, orderId, 'succeeded')).status).toBe(200);
    expect(await ledgerSum(orderId)).toBe(0);
    expect((await pool.query('SELECT stock_on_hand FROM store_offers WHERE id = $1', [offer])).rows[0].stock_on_hand).toBe(8);
    const chef = (await login('chef1@example.test')).cookie;
    const orders = (await call(chef, 'GET', '/api/vendor/orders')).body;
    expect(orders.some((o: any) => o.lines.some((l: any) => l.name.startsWith('Jollof')))).toBe(true);
    const other = (await login('owner1@example.test')).cookie;
    expect((await call(other, 'GET', '/api/vendor/orders')).body.some((o: any) => o.lines.some((l: any) => l.name.startsWith('Jollof')))).toBe(false);
  });
});

describe('cooks manage their own menu', () => {
  const body = (o: object = {}) => ({ name: 'Moi moi', description: 'Steamed bean pudding.', cuisine: 'Nigerian', price_cents: 900, portions: 12, serves: 'Serves 1', spice_level: 1, prep_minutes: 60,
    allergens: ['eggs', 'fish'], allergens_confirmed: true, ingredients: 'Beans, pepper, egg, fish', dish_tags: [], image_url: null, is_active: true, ...o });

  it('creates, edits and archives dishes; allergens must be confirmed; others cannot touch them', async () => {
    const chef = (await login('chef1@example.test')).cookie, chef2 = (await login('chef2@example.test')).cookie, grocer = (await login('owner1@example.test')).cookie;
    const sid = await storeId(K1);
    expect((await call(chef, 'POST', `/api/vendor/stores/${sid}/dishes`, body({ allergens_confirmed: false }))).status).toBe(400);
    expect((await call(chef, 'POST', `/api/vendor/stores/${sid}/dishes`, body({ price_cents: 5 }))).status).toBe(400);
    expect((await call(chef, 'POST', `/api/vendor/stores/${sid}/dishes`, body({ allergens: ['glitter'] }))).status).toBe(400);
    const made = await call(chef, 'POST', `/api/vendor/stores/${sid}/dishes`, body());
    expect(made.status).toBe(201);
    expect((await pool.query('SELECT tax_class, status FROM products WHERE id = $1', [made.body.product_id])).rows[0]).toEqual({ tax_class: 'standard', status: 'dish_live' });
    expect((await call(null, 'GET', `/api/kitchens/${K1}`)).body.dishes.map((d: any) => d.name)).toContain('Moi moi');
    expect((await call(chef2, 'PUT', `/api/vendor/stores/${sid}/dishes/${made.body.product_id}`, body())).status).toBe(403);
    expect((await call(grocer, 'GET', `/api/vendor/stores/${sid}/dishes`)).status).toBe(403);
    const gsid = await storeId('demo-calgary-west-african-market');
    expect((await call(grocer, 'GET', `/api/vendor/stores/${gsid}/dishes`)).status).toBe(400); // grocery stores have no menu
    expect((await call(chef, 'PUT', `/api/vendor/stores/${sid}/dishes/${made.body.product_id}`, body({ price_cents: 1100, portions: 3 }))).status).toBe(200);
    expect((await pool.query('SELECT price_cents, stock_on_hand FROM store_offers WHERE id = $1', [made.body.offer_id])).rows[0]).toEqual({ price_cents: 1100, stock_on_hand: 3 });
    expect((await call(chef, 'DELETE', `/api/vendor/stores/${sid}/dishes/${made.body.product_id}`)).status).toBe(200);
    expect((await call(null, 'GET', `/api/kitchens/${K1}`)).body.dishes.map((d: any) => d.name)).not.toContain('Moi moi');
  });

  it('staff can hide a dish that breaks the rules', async () => {
    const admin = (await login('admin@example.test')).cookie, cust = (await login('customer@example.test')).cookie;
    const dishes = (await call(admin, 'GET', '/api/admin/dishes')).body;
    const d = dishes.find((x: any) => x.name.startsWith('Chin chin'));
    expect([401, 403]).toContain((await call(cust, 'POST', `/api/admin/dishes/${d.id}/hide`, { reason: 'x' })).status);
    expect((await call(admin, 'POST', `/api/admin/dishes/${d.id}/hide`, { reason: 'Allergen list incomplete' })).status).toBe(200);
    expect((await call(null, 'GET', `/api/kitchens/${K1}`)).body.dishes.map((x: any) => x.name)).not.toContain('Chin chin (crunchy, 250 g)');
    const chef = (await login('chef1@example.test')).cookie;
    const threads = (await call(chef, 'GET', '/api/vendor/messages')).body;
    expect(threads.some((t: any) => t.subject.startsWith('Dish hidden: Chin chin'))).toBe(true);
    await pool.query(`UPDATE products SET status = 'dish_live' WHERE id = $1`, [d.id]);
  });
});

describe('cook onboarding and the kill switch', () => {
  it('a new cook cannot be approved without a verified permit and food-handler certificate', async () => {
    const admin = (await login('admin@example.test')).cookie;
    const u = await newCustomer();
    const applied = await call(u.cookie, 'POST', '/api/vendor/apply', { business_name: 'Test Cook Co', phone: '5875550111', store_name: 'Test Cook Kitchen', address_line: '9 Test Ave', postal_code: 'T2A 0A9', kind: 'chef', cuisines: ['Ghanaian'] });
    expect(applied.status).toBe(201);
    const vid = applied.body.vendor_id;
    expect((await pool.query('SELECT kind FROM vendors WHERE id = $1', [vid])).rows[0].kind).toBe('chef');
    expect((await pool.query('SELECT kind, cuisines FROM stores WHERE id = $1', [applied.body.store_id])).rows[0]).toEqual({ kind: 'kitchen', cuisines: ['Ghanaian'] });
    const ob = (await call(u.cookie, 'GET', '/api/vendor/onboarding')).body;
    expect(ob.kind).toBe('chef'); expect(ob.items.find((i: any) => i.key === 'documents').done).toBe(false);
    const doc = async (kind: string) => (await pool.query(`INSERT INTO vendor_documents(vendor_id, kind, url, status) VALUES ($1,$2,'/private/x.pdf','verified') RETURNING id`, [vid, kind])).rows[0].id;
    await doc('business_licence');
    const no = await call(admin, 'PATCH', `/api/admin/vendors/${vid}/status`, { status: 'approved' });
    expect(no.status).toBe(409); expect(no.body.error).toBe('chef_docs_required');
    await doc('food_premises_permit');
    expect((await call(admin, 'PATCH', `/api/admin/vendors/${vid}/status`, { status: 'approved' })).status).toBe(409);
    await doc('food_handler_cert');
    expect((await call(admin, 'PATCH', `/api/admin/vendors/${vid}/status`, { status: 'approved' })).status).toBe(200);
  });

  it('the kitchens switch hides everything', async () => {
    const owner = (await login('admin@example.test')).cookie;
    try {
      expect((await call(owner, 'PUT', '/api/admin/settings/kitchens.enabled', { value: false })).status).toBe(200);
      expect((await call(null, 'GET', '/api/kitchens')).body).toEqual([]);
      expect((await call(null, 'GET', `/api/kitchens/${K1}`)).status).toBe(404);
    } finally { await call(owner, 'PUT', '/api/admin/settings/kitchens.enabled', { value: true }); }
    expect((await call(null, 'GET', '/api/kitchens')).body.length).toBe(2);
  });
});
