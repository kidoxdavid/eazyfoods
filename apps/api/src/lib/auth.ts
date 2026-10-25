import type { FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../db/pool.js';
import { config, isProd } from '../config.js';
import { hashToken, newToken } from './password.js';

/**
 * Five independent sign-ins in one browser: the shop and each staff window (admin, marketing, vendor, driver), each with its own cookie, so being signed in
 * to one never signs you out of, or into, another. A request belongs to a window when the page says so with `x-area: <window>`, or by its API path
 * (/api/vendor/... is the vendor window). Anything else is the shop. (`x-area: staff` is the old catch-all, kept for older clients and tests.)
 */
export const WINDOWS = ['admin', 'marketing', 'vendor', 'driver'] as const;
export type StaffWindow = (typeof WINDOWS)[number];
export const COOKIES = { shop: 'ez_session', admin: 'ez_admin', marketing: 'ez_marketing', vendor: 'ez_vendor', driver: 'ez_driver' } as const;
export type Area = keyof typeof COOKIES;
const STAFF_API = /^\/api\/(admin|marketing|vendor|driver)(\/|\?|$)/;
// Applying to become a vendor or driver: a shopper does it with the shop sign-in; someone who signed up in the vendor or driver window does it with that window's sign-in (the page says so with x-area).
const SHOP_API = /^\/api\/(vendor|driver)\/apply(\/|\?|$)/;
/** The windows a request may be signed in under, most specific first. Empty means the shop. */
export function windowsOf(req: FastifyRequest): StaffWindow[] {
  const h = req.headers['x-area'];
  if ((WINDOWS as readonly string[]).includes(h as string)) return [h as StaffWindow];
  const byUrl = STAFF_API.exec(req.url)?.[1] as StaffWindow | undefined;
  if (h === 'staff') return byUrl ? [byUrl] : [...WINDOWS];
  if (SHOP_API.test(req.url)) return [];
  return byUrl ? [byUrl] : [];
}
export const areaOf = (req: FastifyRequest): Area => windowsOf(req)[0] ?? 'shop';
/** Which roles open which staff window. The admin account opens only the admin window; it cannot be signed in to the others. */
export const AREA_LOGIN_ROLES = { admin: ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing'], marketing: ['marketing'], vendor: ['vendor_owner', 'vendor_staff'], driver: ['driver'] } as const;   // marketing reaches only the shared studio and coupons in the admin window
/** Only accounts that hold one of these roles may use a staff sign-in. Customers cannot, wherever they come from. */
export const STAFF_AREA_ROLES = ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing', 'vendor_owner', 'vendor_staff', 'driver'];
export const COOKIE = COOKIES.shop;

export type Role = { role: string; vendor_id: string | null };
export type AuthUser = { id: string; email: string; full_name: string; staff_signup?: 'vendor' | 'driver' | null; roles: Role[]; acting_vendor?: { id: string; name: string } | null };

declare module 'fastify' {
  interface FastifyRequest { user: AuthUser | null }
}

export async function createSession(userId: string, reply: FastifyReply, area: Area = 'shop') {
  const token = newToken();
  const expires = new Date(Date.now() + config.SESSION_DAYS * 86400_000);
  await pool.query('INSERT INTO sessions(user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [userId, hashToken(token), expires]);
  reply.setCookie(COOKIES[area], token, { httpOnly: true, sameSite: 'lax', secure: isProd || config.WEB_ORIGIN.startsWith('https'), path: '/', expires });
  return token;
}

const SESSION_SQL = `SELECT u.id, u.email, u.full_name, u.staff_signup, s.acting_vendor_id, (SELECT name FROM vendors WHERE id = s.acting_vendor_id) AS acting_vendor_name,
            COALESCE(json_agg(json_build_object('role', r.role, 'vendor_id', r.vendor_id)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
       FROM sessions s JOIN users u ON u.id = s.user_id AND u.disabled_at IS NULL
       LEFT JOIN user_roles r ON r.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      GROUP BY u.id, s.id`;

export async function loadUser(req: FastifyRequest) {
  req.user = null;
  const wins = windowsOf(req);
  const areas: Area[] = wins.length ? wins : ['shop'];
  for (const area of areas) {
    const token = req.cookies[COOKIES[area]];
    if (!token) continue;
    const { rows } = await pool.query(SESSION_SQL, [hashToken(token)]);
    if (!rows[0]) continue;
    const { acting_vendor_id, acting_vendor_name, ...u } = rows[0];
    let roles: Role[] = u.roles;
    // An admin who chose "open their portal" acts as that vendor's owner in the vendor window until they exit. Only admins can ever have this set (checked again here).
    const acting = !!acting_vendor_id && area === 'vendor' && roles.some((r) => r.role === 'admin');
    if (acting) roles = [...roles, { role: 'vendor_owner', vendor_id: acting_vendor_id }];
    if (area !== 'shop') {
      // A window only takes its own accounts; a customer's session is never a staff session.
      const ok = roles.some((r) => (AREA_LOGIN_ROLES[area] as readonly string[]).includes(r.role)) || u.staff_signup === area;
      if (!ok) continue;
    }
    req.user = { ...u, roles, acting_vendor: acting ? { id: acting_vendor_id, name: acting_vendor_name } : null };
    return;
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
