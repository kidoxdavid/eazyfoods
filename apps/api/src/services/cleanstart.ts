import { pool, tx } from '../db/pool.js';
import { isProd } from '../config.js';
import { purgeDemoData } from './purge.js';

/** The one login that ships with a clean install. The temporary password was given to the owner in chat and must be changed after the first sign-in. */
export const DEFAULT_ADMIN = { email: 'admin@eazyfoods.test', name: 'EAZyfoods Admin', hash: 'scrypt$16384$8$1$xrxqEHXK+DZraeKdmSn5Zg==$A2sPEDetkKuucLFjPr46CcmSm7xC6C/CSJbh/uXTMjkV2ZtjchqvN8B/wO5JljTVzyxLY7ldKVjm+Y4Qxvy3+w==' };

/** Delete every seeded test sign-in (@example.test) and any vendor that only they owned. Real accounts are never touched. */
export async function removeTestLogins() {
  await tx(async (c) => {
    const test = `(SELECT id FROM users WHERE email LIKE '%@example.test')`;
    const vids = `(SELECT ur.vendor_id FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.vendor_id IS NOT NULL GROUP BY ur.vendor_id HAVING bool_and(u.email LIKE '%@example.test'))`;
    await c.query(`DELETE FROM stores WHERE vendor_id IN ${vids}`);
    await c.query(`DELETE FROM user_roles WHERE vendor_id IN ${vids}`);
    await c.query(`DELETE FROM vendors WHERE id IN ${vids}`);
    await c.query(`DELETE FROM drivers WHERE user_id IN ${test}`);
    await c.query(`DELETE FROM users WHERE id IN ${test}`);
  });
}

/** If nobody holds the admin role, create the default admin. Never replaces or resets an existing admin. */
export async function ensureDefaultAdmin() {
  if ((await pool.query(`SELECT 1 FROM user_roles WHERE role = 'admin' LIMIT 1`)).rowCount) return false;
  await tx(async (c) => {
    const u = (await c.query(
      `INSERT INTO users(email, password_hash, full_name, email_verified_at) VALUES ($1,$2,$3, now())
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, disabled_at = NULL RETURNING id`, [DEFAULT_ADMIN.email, DEFAULT_ADMIN.hash, DEFAULT_ADMIN.name])).rows[0].id;
    await c.query(`INSERT INTO user_roles(user_id, role) VALUES ($1,'admin') ON CONFLICT DO NOTHING`, [u]);
  });
  return true;
}

/**
 * What a deploy does when it is not asked to load demo data: clear the demo content once (never in production), remove test sign-ins,
 * and make sure there is an admin to sign in with.
 */
export async function cleanStart(log: (m: string) => void) {
  const done = (await pool.query(`SELECT 1 FROM app_settings WHERE key = 'demo.purged'`)).rowCount;
  if (!done && !isProd) { await purgeDemoData(); log('demo data removed'); }
  await removeTestLogins();
  if (await ensureDefaultAdmin()) log('default admin created');
}
