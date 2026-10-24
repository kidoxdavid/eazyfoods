import { describe, expect, it } from 'vitest';
import { app, call, login, newCustomer } from './helpers.js';
import { pool } from '../src/db/pool.js';

const staffLogin = (email: string, area: string, password = 'dev-password-123') =>
  app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-area': 'staff', 'x-test-raw': '1' }, payload: { email, password, area } });

describe('one sign-in window per area', () => {
  it('each window takes only its own accounts; the admin cannot open the vendor, driver or marketing windows', async () => {
    expect((await staffLogin('admin@example.test', 'admin')).statusCode).toBe(200);
    for (const a of ['vendor', 'driver', 'marketing']) expect((await staffLogin('admin@example.test', a)).statusCode).toBe(403);
    expect((await staffLogin('owner1@example.test', 'vendor')).statusCode).toBe(200);
    expect((await staffLogin('owner1@example.test', 'admin')).statusCode).toBe(403);
    expect((await staffLogin('driver@example.test', 'driver')).statusCode).toBe(200);
    expect((await staffLogin('driver@example.test', 'vendor')).statusCode).toBe(403);
    expect((await staffLogin('marketing@example.test', 'marketing')).statusCode).toBe(200);
    expect((await staffLogin('customer@example.test', 'vendor')).statusCode).toBe(403);
  });

  it('vendor and driver have their own sign-up; it makes a staff session that can apply, and nothing else', async () => {
    const email = `v${Date.now()}@signup.test`;
    const r = await app.inject({ method: 'POST', url: '/api/auth/register-staff', headers: { 'x-area': 'staff', 'x-test-raw': '1' }, payload: { email, password: 'a-long-password', full_name: 'New Vendor', area: 'vendor' } });
    expect(r.statusCode).toBe(201);
    const cookie = String(r.headers['set-cookie']).split(';')[0];
    expect(cookie).toMatch(/^ez_staff=/);
    const h = { cookie, 'x-area': 'staff', 'x-test-raw': '1' };
    const me = (await app.inject({ method: 'GET', url: '/api/auth/me', headers: h })).json();
    expect(me.email).toBe(email); expect(me.staff_signup).toBe('vendor'); expect(me.roles).toEqual([]);
    expect((await pool.query(`SELECT 1 FROM user_roles ur JOIN users u ON u.id=ur.user_id WHERE u.email=$1`, [email])).rowCount).toBe(0);   // no shopping account came with it
    expect((await app.inject({ method: 'GET', url: '/api/admin/vendors', headers: h })).statusCode).toBe(403);
    const ap = await app.inject({ method: 'POST', url: '/api/vendor/apply', headers: h, payload: { business_name: 'Signup Co', phone: '5875550111', store_name: 'Signup Shop', address_line: '1 Test St', postal_code: 'T2A 0A1' } });
    expect(ap.statusCode).toBe(201);
    expect((await staffLogin(email, 'vendor', 'a-long-password')).statusCode).toBe(200);
    expect((await staffLogin(email, 'driver', 'a-long-password')).statusCode).toBe(403);
    // admin and marketing cannot be created by signing up
    expect((await app.inject({ method: 'POST', url: '/api/auth/register-staff', payload: { email: 'x@signup.test', password: 'a-long-password', full_name: 'X', area: 'admin' } })).statusCode).toBe(400);
  });

  it('an admin can create a staff login, and it opens only its own window', async () => {
    const admin = (await login('admin@example.test')).cookie, cust = await newCustomer();
    expect([401, 403]).toContain((await call(cust.cookie, 'POST', '/api/admin/users', { email: 'q@staff.test', full_name: 'Q', password: 'a-long-password', role: 'marketing' })).status);
    const email = `m${Date.now()}@staff.test`;
    expect((await call(admin, 'POST', '/api/admin/users', { email, full_name: 'New Marketer', password: 'a-long-password', role: 'marketing' })).status).toBe(201);
    expect((await call(admin, 'POST', '/api/admin/users', { email, full_name: 'Dup', password: 'a-long-password', role: 'marketing' })).status).toBe(409);
    expect((await staffLogin(email, 'marketing', 'a-long-password')).statusCode).toBe(200);
    expect((await staffLogin(email, 'vendor', 'a-long-password')).statusCode).toBe(403);
    expect((await pool.query(`SELECT 1 FROM user_roles ur JOIN users u ON u.id=ur.user_id WHERE u.email=$1 AND ur.role='customer'`, [email])).rowCount).toBe(0);
  });
});
