import { describe, expect, it } from 'vitest';
import { call, login, newCustomer } from './helpers.js';
import { grantOwners } from '../src/services/bootstrap.js';
import { pool } from '../src/db/pool.js';

describe('owner bootstrap', () => {
  it('grants owner to a named, existing account once; production needs a verified email', async () => {
    const u = await newCustomer();
    expect((await call(u.cookie, 'GET', '/api/admin/control/features')).status).toBe(403);
    expect(await grantOwners(['someone-else@example.test'], false)).toEqual([]);
    expect(await grantOwners([u.email.toUpperCase()], true)).toEqual([]);              // unverified in production: refused
    expect(await grantOwners([` ${u.email.toUpperCase()} `], false)).toEqual([u.email]);
    expect(await grantOwners([u.email], false)).toEqual([]);                            // already an owner: nothing new
    const me = (await call(u.cookie, 'GET', '/api/auth/me')).body;
    expect(me.roles.map((r: any) => r.role)).toContain('owner');
    expect((await call(u.cookie, 'GET', '/api/admin/control/features')).status).toBe(200);
    const v = await newCustomer();
    await pool.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [v.id]);
    expect(await grantOwners([v.email], true)).toEqual([v.email]);                      // verified: allowed in production
  });
});
