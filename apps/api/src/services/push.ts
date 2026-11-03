import webpush from 'web-push';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { ROLE_PERMS } from '../lib/permissions.js';

export type PushMsg = { title: string; body?: string; url?: string; tag?: string };

/** The server's push identity (VAPID). Taken from the environment when set, otherwise made once and kept in the database so it never changes. */
let keysP: Promise<{ publicKey: string; privateKey: string }> | null = null;
function keys() {
  keysP ??= (async () => {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    const read = async () => (await pool.query(`SELECT value FROM app_settings WHERE key = 'push.vapid'`)).rows[0]?.value as { publicKey: string; privateKey: string } | undefined;
    let k = await read();
    if (!k) { await pool.query(`INSERT INTO app_settings(key, value) VALUES ('push.vapid', $1) ON CONFLICT (key) DO NOTHING`, [JSON.stringify(webpush.generateVAPIDKeys())]); k = await read(); }
    return k!;
  })().catch((e) => { keysP = null; throw e; });
  return keysP;
}
export const publicKey = async () => (await keys()).publicKey;

/** In tests nothing leaves the machine; what would have been sent is recorded here. */
export const sentLog: { userId: string; area: string; msg: PushMsg }[] = [];

type Sub = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string; area: string };

async function deliver(sub: Sub, msg: PushMsg) {
  if (config.NODE_ENV === 'test') { sentLog.push({ userId: sub.user_id, area: sub.area, msg }); return; }
  try {
    const k = await keys();
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg),
      { vapidDetails: { subject: `mailto:${config.EMAIL_FROM.match(/<(.+)>/)?.[1] ?? 'support@example.invalid'}`, publicKey: k.publicKey, privateKey: k.privateKey }, TTL: 60 * 60 * 24, urgency: 'high', timeout: 8000 });
    await pool.query('UPDATE push_subscriptions SET last_sent_at = now(), failures = 0 WHERE id = $1', [sub.id]);
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 410) await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);   // the person turned it off or removed the app
    else await pool.query('UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1', [sub.id]).catch(() => {});
  }
}

/** Send to every device these people enabled (optionally only in some apps). Never throws: a failed alert must not break the action that caused it. */
export async function pushToUsers(userIds: string[], msg: PushMsg, opts: { areas?: string[]; urlByArea?: Record<string, string> } = {}) {
  try {
    if (!userIds.length) return 0;
    const subs = (await pool.query(`SELECT id, user_id, endpoint, p256dh, auth, area FROM push_subscriptions WHERE user_id = ANY($1::uuid[]) AND ($2::text[] IS NULL OR area = ANY($2::text[])) AND failures < 8`,
      [userIds, opts.areas ?? null])).rows as Sub[];
    await Promise.all(subs.map((s) => deliver(s, { ...msg, url: opts.urlByArea?.[s.area] ?? msg.url })));
    return subs.length;
  } catch { return 0; }
}

export async function usersWithPerm(perm: string): Promise<string[]> {
  const roles = Object.entries(ROLE_PERMS).filter(([, p]) => p.includes('*') || p.includes(perm)).map(([r]) => r);
  return (await pool.query(`SELECT DISTINCT u.id FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.role = ANY($1::text[]) AND u.disabled_at IS NULL`, [roles])).rows.map((r) => r.id);
}
export const STAFF_AREAS = ['admin', 'marketing', 'finance'];
export async function pushToPerm(perm: string, msg: PushMsg, urlByArea: Record<string, string> = {}) {
  return pushToUsers(await usersWithPerm(perm), msg, { areas: STAFF_AREAS, urlByArea });
}
export async function pushToVendor(vendorId: string, msg: PushMsg) {
  const ids = (await pool.query(`SELECT DISTINCT u.id FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.vendor_id = $1 AND u.disabled_at IS NULL`, [vendorId]).catch(() => ({ rows: [] }))).rows.map((r: any) => r.id);
  return pushToUsers(ids, msg, { areas: ['vendor', 'kitchen'] });
}
export async function pushToDriver(driverId: string, msg: PushMsg) {
  const u = (await pool.query('SELECT user_id FROM drivers WHERE id = $1', [driverId]).catch(() => ({ rows: [] }))).rows[0]?.user_id;
  return u ? pushToUsers([u], msg, { areas: ['driver'] }) : 0;
}
export async function pushToAvailableDrivers(msg: PushMsg) {
  const ids = (await pool.query(`SELECT user_id FROM drivers WHERE status = 'approved' AND is_available`).catch(() => ({ rows: [] }))).rows.map((r: any) => r.user_id);
  return pushToUsers(ids, msg, { areas: ['driver'] });
}

/** The email templates that should also be a push, and where they lead. Sign-in links and gift codes are never pushed. */
const NEVER = new Set(['email_verify', 'password_reset', 'gift_card_receipt', 'gift_card_received']);
const VENDOR_T = /^(vendor_|order_message_store|payout_paid)/;
export function pushForTemplate(template: string, subject: string, body: string): { msg: PushMsg; areas?: string[] } | null {
  if (NEVER.has(template)) return null;
  const text = body.replace(/\s+/g, ' ').trim().slice(0, 140);
  if (template.startsWith('staff_')) return { msg: { title: subject, body: text, url: '/admin', tag: template }, areas: STAFF_AREAS };
  if (VENDOR_T.test(template)) return { msg: { title: subject, body: text, url: template === 'vendor_low_stock' ? '/vendor/inventory' : '/vendor/orders', tag: template }, areas: ['vendor', 'kitchen'] };
  return { msg: { title: subject, body: text, url: template === 'product_alert' || template === 'list_reminder' ? '/' : '/orders', tag: template }, areas: ['shop'] };
}
