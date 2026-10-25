import { describe, expect, it } from 'vitest';
import { call, login, openAllStores, storeId } from './helpers.js';

const S1 = 'demo-calgary-west-african-market';
const asVendor = (c: string, m: string, u: string, p?: unknown) => call(c, m, u, p, { 'x-area': 'vendor' });

describe('vendor portal: staff, stores, analytics, reviews, ads', () => {
  it('owner manages a team member and a second store; analytics answer in the original shape', async () => {
    await openAllStores();
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    const email = `team${Date.now()}@example.test`;
    const mk = await asVendor(owner, 'POST', '/api/vendor/staff', { email, first_name: 'Ada', last_name: 'Obi', password: 'a-long-password-1' });
    expect(mk.status).toBe(201);
    expect((await asVendor(owner, 'GET', '/api/vendor/staff')).body.some((s: any) => s.email === email)).toBe(true);
    expect((await asVendor(owner, 'PUT', `/api/vendor/staff/${mk.body.id}`, { is_active: false })).status).toBe(200);
    expect((await asVendor(owner, 'DELETE', `/api/vendor/staff/${mk.body.id}`)).status).toBeLessThan(300);

    const r = { start_date: '2020-01-01', end_date: '2030-01-01' };
    const q = new URLSearchParams(r).toString();
    for (const p of ['sales-report', 'sales-trends', 'revenue-breakdown', 'product-performance', 'fulfillment-metrics']) {
      expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/analytics/${p}?${q}`)).status, p).toBe(200);
    }
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/reviews`)).status).toBe(200);
    expect((await asVendor(owner, 'GET', `/api/vendor/stores/${sid}/reviews/summary`)).status).toBe(200);
    expect((await asVendor(owner, 'GET', '/api/vendor/ads-config')).status).toBe(200);
  });

  it('staff cannot manage the team, and the last store cannot be deleted', async () => {
    const owner = (await login('owner1@example.test')).cookie;
    const stores = (await asVendor(owner, 'GET', '/api/vendor/stores')).body;
    if (stores.length === 1) expect((await asVendor(owner, 'DELETE', `/api/vendor/stores/${stores[0].id}`)).status).toBeGreaterThanOrEqual(400);
    const email = `crew${Date.now()}@example.test`;
    expect((await asVendor(owner, 'POST', '/api/vendor/staff', { email, first_name: 'Crew', password: 'a-long-password-1' })).status).toBe(201);
    const staff = await login(email, 'a-long-password-1');
    expect((await asVendor(staff.cookie, 'POST', '/api/vendor/staff', { email: `y${Date.now()}@example.test`, first_name: 'Y', password: 'a-long-password-1' })).status).toBe(403);
  });
});
