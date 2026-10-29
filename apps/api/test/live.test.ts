import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { call, login, newCustomer, openAllStores, storeId } from './helpers.js';
import { config } from '../src/config.js';
import { pool } from '../src/db/pool.js';
import { emit, subscribe, topicsFor } from '../src/services/live.js';

const S1 = 'demo-calgary-west-african-market';
const asVendor = (c: string, m: string, u: string, p?: unknown) => call(c, m, u, p, { 'x-area': 'vendor' });

describe('real-time updates', () => {
  it('the database announces a change to the right people only, and sends no data', async () => {
    await openAllStores();
    const owner = (await login('owner1@example.test')).cookie, sid = await storeId(S1);
    const vendorId = (await pool.query('SELECT vendor_id FROM stores WHERE id=$1', [sid])).rows[0].vendor_id;
    const seen: string[] = [];
    const listener = new pg.Client({ connectionString: config.DATABASE_URL });
    await listener.connect(); await listener.query('LISTEN live');
    listener.on('notification', (m) => seen.push(m.payload!));
    // A product created on one device: the vendor's team and the back office are told.
    await asVendor(owner, 'POST', `/api/vendor/stores/${sid}/catalogue`, { name: 'Zzz Live Item', price: 3, stock_quantity: 1, status: 'active' });
    await new Promise((r) => setTimeout(r, 300));
    expect(seen).toContain(`vendor:${vendorId}`); expect(seen).toContain('admin');
    // A customer's cart is theirs alone.
    seen.length = 0;
    const u = await newCustomer();
    const uid = (await pool.query(`SELECT id FROM users WHERE email=(SELECT email FROM users ORDER BY created_at DESC LIMIT 1)`)).rows[0].id;
    await pool.query(`INSERT INTO carts(user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [uid]);
    await new Promise((r) => setTimeout(r, 300));
    expect(seen).toContain(`user:${uid}`);
    expect(seen.every((t) => /^(user:|vendor:|admin$|drivers$)/.test(t))).toBe(true);   // only topics, never data
    await listener.end(); void u;
  });

  it('only the people a topic concerns are told, in one message per burst', async () => {
    const user = (id: string, roles: { role: string; vendor_id: string | null }[]) => ({ id, email: '', full_name: '', roles }) as any;
    const vendor = topicsFor(user('u1', [{ role: 'vendor_owner', vendor_id: 'v1' }]));
    const customer = topicsFor(user('u2', []));
    const admin = topicsFor(user('u3', [{ role: 'admin', vendor_id: null }]));
    expect([...vendor].sort()).toEqual(['user:u1', 'vendor:v1']);
    expect([...customer]).toEqual(['user:u2']);
    expect([...admin].sort()).toEqual(['admin', 'user:u3']);
    const got: Record<string, string[][]> = { vendor: [], customer: [], admin: [] };
    const offs = [subscribe(vendor, (t) => got.vendor.push(t)), subscribe(customer, (t) => got.customer.push(t)), subscribe(admin, (t) => got.admin.push(t))];
    emit('vendor:v1'); emit('vendor:v1'); emit('admin'); emit('user:u2');
    await new Promise((r) => setTimeout(r, 600));
    expect(got.vendor).toEqual([['vendor:v1']]);                 // two announcements, one message
    expect(got.customer).toEqual([['user:u2']]);
    expect(got.admin).toEqual([['admin']]);
    emit('vendor:other'); await new Promise((r) => setTimeout(r, 600));
    expect(got.vendor.length).toBe(1);                            // someone else's vendor: nothing
    offs.forEach((o) => o());
  });
});
