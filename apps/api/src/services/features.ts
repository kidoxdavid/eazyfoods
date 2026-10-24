import { pool } from '../db/pool.js';
import type { Queryable } from '../lib/db-types.js';
import { forbidden } from '../lib/errors.js';

export const VENDOR_CAPS = {
  promotions: 'Create promotions and sales',
  ads: 'Run advertising campaigns',
  multibuy: 'Set multi-buy prices',
  csv_import: 'Bulk-update stock and prices by CSV',
  storefront: 'Customise their storefront page (logo, colours, featured items)',
  schedule: 'Take pre-orders and set time slots',
  questions: 'Answer customer questions',
  messages: 'Message the EAZyfoods team',
  videos: 'Upload videos to their store, kitchen or dishes',
} as const;
export type VendorCap = keyof typeof VENDOR_CAPS;

let cache: { at: number; flags: Record<string, boolean> } | null = null;
const TTL = 5_000;
export const clearFeatureCache = () => { cache = null; };

/** All switches. Anything not in the table (or the table unreachable) counts as ON, so a missing row never breaks the shop. */
export async function allFlags(c: Queryable = pool): Promise<Record<string, boolean>> {
  if (c === pool && cache && Date.now() - cache.at < TTL) return cache.flags;
  const flags = Object.fromEntries((await c.query('SELECT key, enabled FROM feature_flags')).rows.map((r) => [r.key, r.enabled])) as Record<string, boolean>;
  if (c === pool) cache = { at: Date.now(), flags };
  return flags;
}
export async function featureOn(key: string, c: Queryable = pool) { return (await allFlags(c))[key] !== false; }
export async function requireFeature(key: string, c: Queryable = pool) { if (!(await featureOn(key, c))) throw forbidden('This feature is switched off right now.'); }

export async function vendorCaps(vendorId: string, c: Queryable = pool): Promise<Record<VendorCap, boolean>> {
  const def = (await c.query(`SELECT value FROM app_settings WHERE key = 'vendor.default_capabilities'`)).rows[0]?.value ?? {};
  const own = (await c.query('SELECT capabilities FROM vendors WHERE id = $1', [vendorId])).rows[0]?.capabilities ?? {};
  return Object.fromEntries((Object.keys(VENDOR_CAPS) as VendorCap[]).map((k) => [k, (own[k] ?? def[k] ?? true) === true])) as Record<VendorCap, boolean>;
}
export async function assertVendorCan(vendorId: string, cap: VendorCap, c: Queryable = pool) {
  if (!(await vendorCaps(vendorId, c))[cap]) throw forbidden(`Your store is not enabled to ${VENDOR_CAPS[cap].charAt(0).toLowerCase()}${VENDOR_CAPS[cap].slice(1)}. Contact EAZyfoods if you need this.`);
}
export const vendorOfStore = async (storeId: string) => (await pool.query('SELECT vendor_id FROM stores WHERE id = $1', [storeId])).rows[0]?.vendor_id as string | undefined;
