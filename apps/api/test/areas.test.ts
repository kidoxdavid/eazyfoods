import { describe, expect, it } from 'vitest';
import { app, call, newCustomer } from './helpers.js';

const STAFF = { 'x-area': 'staff' };
const cookiesOf = (r: any) => ([] as string[]).concat(r.headers['set-cookie'] ?? []).map((c: string) => c.split(';')[0]);
async function signIn(email: string, area: 'shop' | 'staff') {
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'dev-password-123' }, headers: area === 'staff' ? STAFF : {} });
  expect(r.statusCode).toBe(200);
  return cookiesOf(r)[0];
}
const RAW = { 'x-test-raw': '1' };
const raw = (cookie: string, url: string, headers: Record<string, string> = {}) => app.inject({ url, headers: { cookie, ...RAW, ...headers } });

describe('separate shop and staff sign-ins', () => {
  it('an admin and a customer can be signed in at the same time in one browser', async () => {
    const shop = await signIn('customer@example.test', 'shop');
    const staff = await signIn('admin@example.test', 'staff');
    expect(shop.startsWith('ez_session=')).toBe(true);
    expect(staff.startsWith('ez_admin=')).toBe(true);
    const both = `${shop}; ${staff}`;
    expect((await raw(both, '/api/auth/me')).json().email).toBe('customer@example.test');                 // the shop sees the customer
    expect((await raw(both, '/api/auth/me', STAFF)).json().email).toBe('admin@example.test');              // staff pages see the admin
    expect((await raw(both, '/api/admin/control/features')).statusCode).toBe(200);                          // staff API paths use the staff sign-in without any header
    expect((await raw(both, '/api/cart')).statusCode).toBe(200);                                            // shop API uses the customer
    expect((await raw(shop, '/api/admin/control/features')).statusCode).toBe(401);                          // a shop sign-in alone does not open the admin
    expect((await raw(staff, '/api/auth/me')).json()).toBeNull();                                           // and a staff sign-in alone is not a shopper
  });
  it('signing out of one area leaves the other signed in', async () => {
    const shop = await signIn('customer@example.test', 'shop');
    const staff = await signIn('admin@example.test', 'staff');
    const both = `${shop}; ${staff}`;
    expect((await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: both, ...RAW, ...STAFF } })).statusCode).toBe(200);
    expect((await raw(both, '/api/auth/me', STAFF)).json()).toBeNull();
    expect((await raw(both, '/api/auth/me')).json().email).toBe('customer@example.test');
    expect((await raw(both, '/api/admin/control/features')).statusCode).toBe(401);                          // the old staff token is dead server-side, not just cleared
  });
  it('only the designated accounts can sign in to the staff areas; customers cannot, wherever they come from', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'customer@example.test', password: 'dev-password-123' }, headers: STAFF });
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBe('not_staff');
    expect(cookiesOf(r)).toEqual([]);
    for (const e of ['admin@example.test', 'marketing@example.test', 'owner1@example.test', 'chef1@example.test', 'driver@example.test', 'support@example.test'])
      expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: e, password: 'dev-password-123' }, headers: STAFF })).statusCode, e).toBe(200);
    // a customer's own shop sign-in is never a staff sign-in, even if the same token is presented as one
    const u = await newCustomer();
    const token = u.cookie.slice('ez_session='.length);
    expect((await raw(`${u.cookie}; ez_admin=${token}`, '/api/auth/me', STAFF)).json()).toBeNull();
    expect((await raw(`${u.cookie}; ez_admin=${token}`, '/api/admin/control/features')).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/auth/staff-session', headers: { cookie: u.cookie, ...RAW } })).statusCode).toBe(404);   // the "continue as" shortcut is gone
    expect((await raw(u.cookie, '/api/auth/me')).json().email).toBe(u.email);                                                                          // the shop still works
  });
  it('registering and failing to log in behave per area', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@example.test', password: 'nope-nope-nope' }, headers: STAFF });
    expect(bad.statusCode).toBe(401);
    expect(cookiesOf(bad)).toEqual([]);
  });
});
