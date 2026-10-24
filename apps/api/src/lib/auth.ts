import type { FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../db/pool.js';
import { config, isProd } from '../config.js';
import { hashToken, newToken } from './password.js';

/**
 * Two independent sign-ins in one browser: the shop and the staff areas (admin, marketing, vendor, driver). The staff session is used for the
 * staff API paths and for any request the staff pages mark with `x-area: staff`; everything else uses the shop session.
 */
export const COOKIES = { shop: 'ez_session', staff: 'ez_staff' } as const;
export type Area = keyof typeof COOKIES;
const STAFF_API = /^\/api\/(admin|marketing|vendor|driver)(\/|\?|$)/;
// Applying to become a vendor or driver is something a shopper does, so those two calls stay on the shop sign-in.
const SHOP_API = /^\/api\/(vendor|driver)\/apply(\/|\?|$)/;
export const areaOf = (req: FastifyRequest): Area => (SHOP_API.test(req.url) ? 'shop' : req.headers['x-area'] === 'staff' || STAFF_API.test(req.url) ? 'staff' : 'shop');
/** Only accounts that hold one of these roles may use a staff sign-in. Customers cannot, wherever they come from. */
export const STAFF_AREA_ROLES = ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing', 'vendor_owner', 'vendor_staff', 'driver'];
export const COOKIE = COOKIES.shop;

export type Role = { role: string; vendor_id: string | null };
export type AuthUser = { id: string; email: string; full_name: string; roles: Role[]; acting_vendor?: { id: string; name: string } | null };

declare module 'fastify' {
  interface FastifyRequest { user: AuthUser | null }
}

export async function createSession(userId: string, reply: FastifyReply, area: Area = 'shop') {
  const token = newToken();
  const expires = new Date(Date.now() + config.SESSION_DAYS * 86400_000);
  await pool.query('INSERT INTO sessions(user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [userId, hashToken(token), expires]);
  reply.setCookie(COOKIES[area], token, { httpOnly: true, sameSite: 'lax', secure: isProd || config.WEB_ORIGIN.startsWith('https'), path: '/', expires });
}

export async function loadUser(req: FastifyRequest) {
  req.user = null;
  const token = req.cookies[COOKIES[areaOf(req)]];
  if (!token) return;
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, s.acting_vendor_id, (SELECT name FROM vendors WHERE id = s.acting_vendor_id) AS acting_vendor_name,
            COALESCE(json_agg(json_build_object('role', r.role, 'vendor_id', r.vendor_id)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
       FROM sessions s JOIN users u ON u.id = s.user_id AND u.disabled_at IS NULL
       LEFT JOIN user_roles r ON r.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      GROUP BY u.id, s.id`,
    [hashToken(token)],
  );
  if (!rows[0]) return;
  if (areaOf(req) === 'staff' && !rows[0].roles.some((r: Role) => STAFF_AREA_ROLES.includes(r.role))) return;   // a customer's session is never a staff session
  const { acting_vendor_id, acting_vendor_name, ...u } = rows[0];
  req.user = u;
  // An admin who chose "open their portal" acts as that vendor's owner until they exit. Only admins can ever have this set (checked again here).
  if (acting_vendor_id && u.roles.some((r: Role) => r.role === 'admin')) {
    req.user!.roles = [...u.roles, { role: 'vendor_owner', vendor_id: acting_vendor_id }];
    req.user!.acting_vendor = { id: acting_vendor_id, name: acting_vendor_name };
  }
}

export function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) { reply.code(401).send({ error: 'unauthenticated' }); return false; }
  return true;
}

export const hasRole = (u: AuthUser, role: string) => u.roles.some((r) => r.role === role);

/** Resource-level check: user must be an owner/staff of the vendor that owns the store, or an admin. */
export async function canManageStore(u: AuthUser, storeId: string): Promise<boolean> {
  if (hasRole(u, 'admin')) return true;
  const vendorIds = u.roles.filter((r) => r.vendor_id).map((r) => r.vendor_id);
  if (!vendorIds.length) return false;
  const { rowCount } = await pool.query('SELECT 1 FROM stores WHERE id = $1 AND vendor_id = ANY($2::uuid[])', [storeId, vendorIds]);
  return !!rowCount;
}

export async function audit(actor: string | null, action: string, entityType: string, entityId: string, detail: object = {}, c: { query: typeof pool.query } = pool) {
  await c.query('INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, detail) VALUES ($1,$2,$3,$4,$5)', [actor, action, entityType, entityId, detail]);
}
