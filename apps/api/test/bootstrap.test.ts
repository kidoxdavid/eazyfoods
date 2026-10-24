import { describe, expect, it } from 'vitest';
import { call, login, newCustomer } from './helpers.js';
import { grantAdmins } from '../src/services/bootstrap.js';
import { pool } from '../src/db/pool.js';

describe('admin bootstrap', () => {
  it('grants admin to a named, existing account once; production needs a verified email', async () => {
    const u = await newCustomer();
    expect((await call(u.cookie, 'GET', '/api/admin/control/features')).status).toBe(403);
    expect(await grantAdmins(['someone-else@example.test'], false)).toEqual([]);
    expect(await grantAdmins([u.email.toUpperCase()], true)).toEqual([]);              // unverified in production: refused
    expect(await grantAdmins([` ${u.email.toUpperCase()} `], false)).toEqual([u.email]);
    expect(await grantAdmins([u.email], false)).toEqual([]);                            // already an admin: nothing new
    const me = (await call(u.cookie, 'GET', '/api/auth/me')).body;
    expect(me.roles.map((r: any) => r.role)).toContain('admin');
    expect((await call(u.cookie, 'GET', '/api/admin/control/features')).status).toBe(200);
    const v = await newCustomer();
    await pool.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [v.id]);
    expect(await grantAdmins([v.email], true)).toEqual([v.email]);                      // verified: allowed in production
  });
});
