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
    expect(staff.startsWith('ez_staff=')).toBe(true);
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
  it('"continue as" opens a staff session for the same person only, and only from the shop', async () => {
    const u = await newCustomer();
    expect((await app.inject({ method: 'POST', url: '/api/auth/staff-session' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/auth/staff-session', headers: { cookie: u.cookie, ...RAW, ...STAFF } })).statusCode).toBe(400);
    const r = await app.inject({ method: 'POST', url: '/api/auth/staff-session', headers: { cookie: u.cookie, ...RAW } });
    expect(r.statusCode).toBe(200);
    const staff = cookiesOf(r)[0];
    expect(staff.startsWith('ez_staff=')).toBe(true);
    expect((await raw(staff, '/api/auth/me', STAFF)).json().email).toBe(u.email);
    expect((await call(u.cookie, 'GET', '/api/admin/control/features')).status).toBe(403);                  // same person, still no admin rights
  });
  it('registering and failing to log in behave per area', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@example.test', password: 'nope-nope-nope' }, headers: STAFF });
    expect(bad.statusCode).toBe(401);
    expect(cookiesOf(bad)).toEqual([]);
  });
});
