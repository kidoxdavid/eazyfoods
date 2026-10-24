import type { PoolClient } from 'pg';
import { randomBytes } from 'node:crypto';
import { tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { conflict, notFound } from '../lib/errors.js';

/**
 * Deleting something that has money or order history attached cannot remove the history (the ledger and orders must stay correct and auditable).
 * So every delete here is "remove completely if nothing refers to it, otherwise close it and scrub the personal details".
 * The result says which happened, so the person is never told something was deleted when it was only closed.
 */
export type EraseResult = { deleted: boolean; closed: boolean; note: string };

/** Run `fn` in a savepoint; a foreign-key refusal rolls back just that attempt and returns false. */
async function attempt(c: PoolClient, fn: () => Promise<void>) {
  await c.query('SAVEPOINT erase_try');
  try { await fn(); await c.query('RELEASE SAVEPOINT erase_try'); return true; }
  catch (e: any) {
    await c.query('ROLLBACK TO SAVEPOINT erase_try');
    if (e.code === '23503') return false;
    throw e;
  }
}

/** Things that only exist for the person (messages sent to them, sign-ins, saved addresses). Never money or orders. */
async function clearPersonal(c: PoolClient, id: string) {
  for (const t of ['sessions', 'auth_tokens', 'addresses', 'favourites', 'user_roles', 'carts', 'notifications', 'sms_outbox', 'list_reminders']) await c.query(`DELETE FROM ${t} WHERE user_id = $1`, [id]);
  await c.query('DELETE FROM referrals WHERE referred_user = $1 OR referrer_user = $1', [id]);
}

async function scrubUser(c: PoolClient, id: string) {
  await c.query(`UPDATE users SET email = $2, full_name = 'Deleted account', phone = NULL, password_hash = $3, disabled_at = now(), deleted_at = now(),
      marketing_opt_in_at = NULL, sms_opt_in_at = NULL, notify_email = false, referral_code = NULL, staff_signup = NULL WHERE id = $1`,
    [id, `deleted-${id}@deleted.invalid`, `scrypt$0$0$0$${randomBytes(8).toString('base64')}$${randomBytes(8).toString('base64')}`]);
  await clearPersonal(c, id);
}

export async function eraseUser(actorId: string, id: string): Promise<EraseResult> {
  return tx(async (c) => {
    const u = (await c.query('SELECT id, email, deleted_at FROM users WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!u || u.deleted_at) throw notFound('User not found');
    if (id === actorId) throw conflict('self', 'You cannot delete your own account.');
    const isAdmin = (await c.query(`SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin'`, [id])).rowCount;
    if (isAdmin && (await c.query(`SELECT count(*)::int n FROM user_roles WHERE role = 'admin'`)).rows[0].n <= 1) throw conflict('last_admin', 'There must always be at least one admin.');
    const driver = (await c.query('SELECT id FROM drivers WHERE user_id = $1', [id])).rows[0];
    if (driver) await attempt(c, async () => { await c.query('DELETE FROM drivers WHERE id = $1', [driver.id]); });   // only possible without deliveries or earnings
    const gone = await attempt(c, async () => {
      await clearPersonal(c, id);
      await c.query('DELETE FROM users WHERE id = $1', [id]);
    });
    if (!gone) {
      await scrubUser(c, id);
      if (driver) await c.query(`UPDATE drivers SET status = 'suspended', is_available = false, phone = '' WHERE user_id = $1`, [id]);
    }
    await audit(actorId, gone ? 'user.deleted' : 'user.closed', 'user', id, { email: u.email }, c);
    return gone ? { deleted: true, closed: false, note: 'The account was deleted.' }
      : { deleted: false, closed: true, note: 'This account has orders or other history, so it was closed instead: sign-in is disabled and personal details were removed. The history stays so the books stay correct.' };
  });
}

export async function eraseVendor(actorId: string, id: string): Promise<EraseResult> {
  return tx(async (c) => {
    const v = (await c.query('SELECT id, name FROM vendors WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!v) throw notFound('Vendor not found');
    const gone = await attempt(c, async () => {
      const stores = `(SELECT id FROM stores WHERE vendor_id = $1)`;
      await c.query(`DELETE FROM products WHERE owner_store_id IN ${stores}`, [id]);   // a cook's or restaurant's own dishes
      await c.query(`DELETE FROM store_offers WHERE store_id IN ${stores}`, [id]);
      await c.query('DELETE FROM stores WHERE vendor_id = $1', [id]);
      await c.query('DELETE FROM user_roles WHERE vendor_id = $1', [id]);
      await c.query('DELETE FROM vendor_documents WHERE vendor_id = $1', [id]);
      await c.query('DELETE FROM vendors WHERE id = $1', [id]);
    });
    if (!gone) {
      // It has orders or money history: take it off the marketplace and stop it selling, keep the records.
      await c.query(`UPDATE store_offers SET is_active = false WHERE store_id IN (SELECT id FROM stores WHERE vendor_id = $1)`, [id]);
      await c.query(`UPDATE stores SET status = 'suspended' WHERE vendor_id = $1`, [id]);
      await c.query(`UPDATE vendors SET status = 'suspended' WHERE id = $1`, [id]);
      await c.query(`DELETE FROM user_roles WHERE vendor_id = $1`, [id]);   // nobody can sign in to it any more
    }
    await audit(actorId, gone ? 'vendor.deleted' : 'vendor.closed', 'vendor', id, { name: v.name }, c);
    return gone ? { deleted: true, closed: false, note: 'The vendor and everything it listed were deleted.' }
      : { deleted: false, closed: true, note: 'This vendor has orders or payouts, so it was closed instead: suspended, delisted and its logins removed. Its history stays so the books stay correct.' };
  });
}

export async function eraseDriver(actorId: string, id: string): Promise<EraseResult> {
  return tx(async (c) => {
    const d = (await c.query('SELECT id, user_id FROM drivers WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!d) throw notFound('Driver not found');
    const gone = await attempt(c, async () => {
      await c.query('DELETE FROM drivers WHERE id = $1', [id]);
      await c.query(`DELETE FROM user_roles WHERE user_id = $1 AND role = 'driver'`, [d.user_id]);
    });
    if (!gone) {
      await c.query(`UPDATE drivers SET status = 'suspended', is_available = false WHERE id = $1`, [id]);
      await c.query(`DELETE FROM user_roles WHERE user_id = $1 AND role = 'driver'`, [d.user_id]);
      await c.query('DELETE FROM sessions WHERE user_id = $1', [d.user_id]);
    }
    await audit(actorId, gone ? 'driver.deleted' : 'driver.closed', 'driver', id, {}, c);
    return gone ? { deleted: true, closed: false, note: 'The driver profile was deleted.' }
      : { deleted: false, closed: true, note: 'This driver has deliveries or earnings, so the profile was closed instead: suspended and removed from the driver area. History stays so the books stay correct.' };
  });
}
