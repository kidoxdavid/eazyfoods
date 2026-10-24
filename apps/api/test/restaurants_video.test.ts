import { describe, expect, it } from 'vitest';
import { call, login, newCustomer, openAllStores, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { clearFeatureCache } from '../src/services/features.js';
import { beforeAll } from 'vitest';

beforeAll(openAllStores);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypmp42'), Buffer.alloc(40)]);

async function uploadVideo(cookie: string, buf = MP4) {
  const boundary = '----t' + Math.random().toString(16).slice(2);
  const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.mp4"\r\nContent-Type: video/mp4\r\n\r\n`), buf, Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const { app } = await import('./helpers.js');
  return app.inject({ method: 'POST', url: '/api/uploads/video', headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body });
}

describe('restaurants', () => {
  it('lists restaurants with a public address, home chefs without one, and filters by type', async () => {
    const cust = await newCustomer();
    const all = (await call(cust.cookie, 'GET', '/api/kitchens')).body;
    const resto = all.find((k: any) => k.slug === 'demo-suya-spot');
    expect(resto.kitchen_type).toBe('restaurant');
    expect(resto.address_line).toBeTruthy();
    const home = all.find((k: any) => k.kitchen_type === 'home');
    expect(home.address_line).toBeFalsy();
    expect((await call(cust.cookie, 'GET', '/api/kitchens?type=restaurant')).body.every((k: any) => k.kitchen_type === 'restaurant')).toBe(true);
    const page = (await call(cust.cookie, 'GET', '/api/kitchens/demo-suya-spot')).body;
    expect(page.address_line).toBeTruthy(); expect(page.phone).toBeTruthy();
    expect(page.dishes.map((d: any) => d.menu_section)).toContain('Mains');
    const homePage = (await call(cust.cookie, 'GET', `/api/kitchens/${home.slug}`)).body;
    expect(homePage.address_line).toBeNull(); expect(homePage.phone).toBeNull();
  });

  it('can be switched off in the control centre', async () => {
    const cust = await newCustomer();
    await pool.query(`UPDATE feature_flags SET enabled=false WHERE key='shop.restaurants'`); clearFeatureCache();
    try {
      expect((await call(cust.cookie, 'GET', '/api/kitchens')).body.some((k: any) => k.slug === 'demo-suya-spot')).toBe(false);
      expect((await call(cust.cookie, 'GET', '/api/kitchens/demo-suya-spot')).status).toBe(404);
    } finally { await pool.query(`UPDATE feature_flags SET enabled=true WHERE key='shop.restaurants'`); clearFeatureCache(); }
  });

  it('a restaurant needs a premises permit and a business licence before approval', async () => {
    const c = await newCustomer();
    const r = await call(c.cookie, 'POST', '/api/vendor/apply', { business_name: 'Resto Co', phone: '5875550123', store_name: 'Resto Test Bistro', address_line: '5 Test Ave', postal_code: 'T2E 0A1', kind: 'chef', business_type: 'restaurant', cuisines: ['Nigerian'] });
    expect(r.status).toBe(201);
    expect((await pool.query('SELECT kitchen_type FROM stores WHERE id=$1', [r.body.store_id])).rows[0].kitchen_type).toBe('restaurant');
    const admin = (await login('admin@example.test')).cookie;
    for (const kind of ['food_premises_permit', 'food_handler_cert']) await pool.query(`INSERT INTO vendor_documents(vendor_id, kind, url, status) VALUES ($1,$2,'private/x.pdf','verified')`, [r.body.vendor_id, kind]);
    const no = await call(admin, 'PATCH', `/api/admin/vendors/${r.body.vendor_id}/status`, { status: 'approved' });
    expect(no.status).toBe(409); expect(no.body.message).toMatch(/restaurant.*business licence/);
    await pool.query(`INSERT INTO vendor_documents(vendor_id, kind, url, status) VALUES ($1,'business_licence','private/y.pdf','verified')`, [r.body.vendor_id]);
    expect((await call(admin, 'PATCH', `/api/admin/vendors/${r.body.vendor_id}/status`, { status: 'approved' })).status).toBe(200);
  });
});

describe('vendor videos', () => {
  it('lets a vendor upload a real video when allowed, refuses fakes and customers, and honours the capability switch', async () => {
    const owner = (await login('owner1@example.test')).cookie, cust = await newCustomer();
    const ok = await uploadVideo(owner);
    expect(ok.statusCode).toBe(200);
    const url = ok.json().url as string;
    expect(url).toMatch(/\.mp4$/);
    expect((await uploadVideo(owner, Buffer.from('not a video at all, just text padding'))).statusCode).toBe(400);
    expect([401, 403]).toContain((await uploadVideo(cust.cookie)).statusCode);

    const sid = await storeId('demo-calgary-west-african-market');
    expect((await call(owner, 'PUT', `/api/vendor/stores/${sid}/profile`, { video_url: url })).status).toBe(200);
    expect((await call(cust.cookie, 'GET', '/api/stores/demo-calgary-west-african-market')).body.video_url).toBe(url);
    expect((await call(owner, 'PUT', `/api/vendor/stores/${sid}/profile`, { video_url: 'https://evil.example/x.mp4' })).status).toBe(400);

    const vid = (await pool.query('SELECT vendor_id FROM stores WHERE id=$1', [sid])).rows[0].vendor_id;
    await pool.query(`UPDATE vendors SET capabilities = capabilities || '{"videos": false}' WHERE id=$1`, [vid]);
    try {
      expect((await uploadVideo(owner)).statusCode).toBe(403);
      expect((await call(owner, 'PUT', `/api/vendor/stores/${sid}/profile`, { video_url: url })).status).toBe(403);
    } finally {
      await pool.query(`UPDATE vendors SET capabilities = capabilities - 'videos' WHERE id=$1`, [vid]);
      await call(owner, 'PUT', `/api/vendor/stores/${sid}/profile`, { video_url: null });
    }
    await pool.query(`UPDATE feature_flags SET enabled=false WHERE key='shop.vendor_videos'`); clearFeatureCache();
    try { expect((await call(cust.cookie, 'GET', '/api/stores/demo-calgary-west-african-market')).body.video_url).toBeNull(); }
    finally { await pool.query(`UPDATE feature_flags SET enabled=true WHERE key='shop.vendor_videos'`); clearFeatureCache(); }
  });
});
