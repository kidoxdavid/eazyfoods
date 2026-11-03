import { beforeAll, describe, expect, it } from 'vitest';
import { call, login, openAllStores } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);
const who = async (e: string) => (await login(e)).cookie;

describe('ads past their end date show as expired', () => {
  it('vendor list, vendor detail and admin list all say expired; it cannot be approved, paused or edited; a rejected one stays rejected', async () => {
    const owner = await who('owner1@example.test'), admin = await who('admin@example.test');
    const st = (await pool.query('SELECT id, vendor_id FROM stores WHERE slug=$1', [S1])).rows[0];
    const mk = async (title: string, status: string) => (await pool.query(
      `INSERT INTO ad_campaigns(vendor_id, store_id, placement, title, cpc_cents, budget_cents, starts_at, ends_at, status) VALUES ($1,$2,'home_banner',$3,20,5000, now() - interval '9 days', now() - interval '2 days', $4) RETURNING id`, [st.vendor_id, st.id, title, status])).rows[0].id;
    const approved = await mk('Old approved ad', 'approved'), pending = await mk('Old pending ad', 'pending'), rejected = await mk('Old rejected ad', 'rejected');
    try {
      const list = (await call(owner, 'GET', '/api/vendor/ads')).body as any[];
      expect(list.find((a) => a.id === approved).status).toBe('expired');
      expect(list.find((a) => a.id === pending).status).toBe('expired');
      expect(list.find((a) => a.id === rejected).status).toBe('rejected');
      expect((await call(owner, 'GET', `/api/vendor/ads/${approved}`)).body.status).toBe('expired');
      expect((await call(admin, 'GET', '/api/admin/ads')).body.find((a: any) => a.id === approved).status).toBe('expired');
      expect((await call(admin, 'PATCH', `/api/admin/ads/${pending}`, { status: 'approved' })).status).toBe(400);
      expect((await call(owner, 'POST', `/api/vendor/ads/${approved}/pause`, {})).status).toBe(400);
      expect((await call(owner, 'PUT', `/api/vendor/ads/${pending}`, { title: 'Edited ad', starts_at: new Date(), ends_at: new Date(Date.now() + 864e5) })).status).toBe(400);
      expect((await pool.query('SELECT status FROM ad_campaigns WHERE id=$1', [approved])).rows[0].status).toBe('approved');   // stored value untouched
    } finally { await pool.query('DELETE FROM ad_campaigns WHERE id = ANY($1)', [[approved, pending, rejected]]); }
  });
});

describe('store time zone', () => {
  it('the vendor can choose a time zone, it is saved and read back, and nonsense is refused', async () => {
    const owner = await who('owner1@example.test');
    const st = (await pool.query('SELECT id, timezone FROM stores WHERE slug=$1', [S1])).rows[0];
    try {
      expect((await call(owner, 'PUT', `/api/vendor/stores/${st.id}/profile`, { timezone: 'America/Toronto' })).status).toBe(200);
      expect((await call(owner, 'GET', `/api/vendor/stores/${st.id}/profile`)).body.timezone).toBe('America/Toronto');
      expect((await call(owner, 'PUT', `/api/vendor/stores/${st.id}/profile`, { timezone: 'Mars/Olympus' })).status).toBe(400);
      expect((await call(owner, 'PUT', `/api/vendor/stores/${st.id}/profile`, { timezone: 'America/Edmonton' })).status).toBe(200);
    } finally { await pool.query('UPDATE stores SET timezone=$2 WHERE id=$1', [st.id, st.timezone]); }
  });
});
