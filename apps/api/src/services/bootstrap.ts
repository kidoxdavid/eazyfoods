import { pool } from '../db/pool.js';

/**
 * Give the people named by the host (ADMIN_EMAILS) the admin role. The account must already exist (they sign up as a normal customer first).
 * In production the email must also be verified, so nobody can claim an admin address by registering it first.
 * Returns the emails that were newly granted.
 */
export async function grantAdmins(emails: string[], requireVerified: boolean): Promise<string[]> {
  const list = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return [];
  const r = await pool.query(
    `INSERT INTO user_roles(user_id, role) SELECT u.id, 'admin' FROM users u
      WHERE u.email = ANY($1::text[]) AND u.disabled_at IS NULL AND u.deleted_at IS NULL AND ($2::boolean = false OR u.email_verified_at IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id = u.id AND x.role = 'admin')
      RETURNING (SELECT email FROM users WHERE id = user_id) AS email`, [list, requireVerified]);
  return r.rows.map((x) => x.email);
}
