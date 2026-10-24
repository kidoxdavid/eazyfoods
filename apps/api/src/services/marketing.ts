import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { pool, tx } from '../db/pool.js';
import { bad } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import type { Queryable } from '../lib/db-types.js';

export type Rules = {
  min_orders?: number; max_orders?: number; days_since_last_order_min?: number; days_since_last_order_max?: number; min_spend_cents?: number;
  joined_within_days?: number; region?: string; kitchen_buyers?: boolean;
};

/**
 * Everyone a marketing email may go to: customers who agreed to marketing, still want email, have a verified address and are not deleted.
 * Segment rules only ever NARROW this list. Nothing here can add someone who has not consented.
 */
export function audienceQuery(r: Rules) {
  const p: unknown[] = []; const w: string[] = [];
  const add = (v: unknown) => { p.push(v); return `$${p.length}`; };
  if (r.min_orders != null) w.push(`COALESCE(st.orders, 0) >= ${add(r.min_orders)}`);
  if (r.max_orders != null) w.push(`COALESCE(st.orders, 0) <= ${add(r.max_orders)}`);
  if (r.days_since_last_order_min != null) w.push(`st.last_order IS NOT NULL AND st.last_order <= now() - make_interval(days => ${add(r.days_since_last_order_min)})`);
  if (r.days_since_last_order_max != null) w.push(`st.last_order IS NOT NULL AND st.last_order >= now() - make_interval(days => ${add(r.days_since_last_order_max)})`);
  if (r.min_spend_cents != null) w.push(`COALESCE(st.spend, 0) >= ${add(r.min_spend_cents)}`);
  if (r.joined_within_days != null) w.push(`u.created_at >= now() - make_interval(days => ${add(r.joined_within_days)})`);
  if (r.region) w.push(`EXISTS (SELECT 1 FROM orders o JOIN suborders s ON s.order_id = o.id JOIN store_regions sr ON sr.store_id = s.store_id JOIN regions rg ON rg.id = sr.region_id WHERE o.user_id = u.id AND o.placed_at IS NOT NULL AND rg.slug = ${add(r.region)})`);
  if (r.kitchen_buyers) w.push(`EXISTS (SELECT 1 FROM orders o JOIN suborders s ON s.order_id = o.id JOIN stores k ON k.id = s.store_id AND k.kind = 'kitchen' WHERE o.user_id = u.id AND o.placed_at IS NOT NULL)`);
  const sql = `WITH st AS (SELECT user_id, count(*)::int AS orders, COALESCE(sum(total_cents), 0)::int AS spend, max(placed_at) AS last_order FROM orders WHERE placed_at IS NOT NULL AND status NOT IN ('cancelled','payment_failed') GROUP BY user_id)
    SELECT u.id, u.email, split_part(u.full_name, ' ', 1) AS first_name FROM users u LEFT JOIN st ON st.user_id = u.id
     WHERE u.marketing_opt_in_at IS NOT NULL AND u.notify_email AND u.email_verified_at IS NOT NULL AND u.disabled_at IS NULL AND u.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'customer')${w.length ? ' AND ' + w.join(' AND ') : ''}`;
  return { sql, params: p };
}

export async function audience(rules: Rules, c: Queryable = pool) { const q = audienceQuery(rules); return (await c.query(q.sql, q.params)).rows as { id: string; email: string; first_name: string }[]; }
export const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, '$1•••$2');

/** Replace {{first_name}}, {{unsubscribe_url}} and {{link:/path}} (tracked, same-site paths only). */
export function renderBody(body: string, v: { first_name: string; token: string }) {
  const base = config.WEB_ORIGIN.replace(/\/$/, '');
  return body
    .replace(/\{\{first_name\}\}/g, v.first_name || 'there')
    .replace(/\{\{unsubscribe_url\}\}/g, `${base}/unsubscribe/${v.token}`)
    .replace(/\{\{link:(\/[^\s}]*)\}\}/g, (_m, path) => `${base}/api/m/c/${v.token}?to=${encodeURIComponent(path)}`);
}
export const renderSubject = (s: string, first: string) => s.replace(/\{\{first_name\}\}/g, first || 'there');

/** Every marketing email carries who sent it, where they are, and a working unsubscribe link (CASL). */
export async function footer(token: string, c: Queryable = pool) {
  const name = await getSetting<string>('marketing.sender_name', c); const addr = await getSetting<string>('marketing.postal_address', c);
  const base = config.WEB_ORIGIN.replace(/\/$/, '');
  return `\n\n--\nSent by ${name}, ${addr}.\nYou are receiving this because you agreed to marketing email from ${name}. Unsubscribe any time: ${base}/unsubscribe/${token}`;
}
export async function assertCanSend(c: Queryable = pool) {
  const addr = (await getSetting<string>('marketing.postal_address', c)).trim();
  if (addr.length < 10) throw bad('sender_address_required', 'Add your postal address in Marketing → Settings before sending. Canadian anti-spam law requires it in every marketing email.');
}

type Send = { subject: string; subjectB?: string | null; body: string; bPercent?: number; campaignId?: string | null; automationId?: string | null };
/** Queue one email per recipient (nothing is sent here: the outbox does that, and re-checks consent at send time). */
export async function queueEmails(c: Queryable, recipients: { id: string; email: string; first_name: string }[], s: Send) {
  let n = 0;
  for (const r of recipients) {
    const token = randomBytes(18).toString('base64url');
    const variant = s.subjectB && Math.random() * 100 < (s.bPercent ?? 50) ? 'b' : 'a';
    const subject = renderSubject(variant === 'b' ? s.subjectB! : s.subject, r.first_name);
    const body = renderBody(s.body, { first_name: r.first_name, token }) + (await footer(token, c));
    const nid = (await c.query(`INSERT INTO notifications(user_id, to_email, template, vars, subject, body, transactional) VALUES ($1,$2,'marketing','{}',$3,$4,false) RETURNING id`, [r.id, r.email, subject, body])).rows[0].id;
    const ins = await c.query(`INSERT INTO email_sends(email_campaign_id, automation_id, user_id, variant, token, notification_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [s.campaignId ?? null, s.automationId ?? null, r.id, variant, token, nid]);
    if (!ins.rowCount) await c.query('DELETE FROM notifications WHERE id = $1', [nid]);
    else n++;
  }
  return n;
}

/** Turn a campaign into queued emails. Safe to call twice: only a draft/scheduled campaign is queued, once. */
export async function sendCampaign(id: string) {
  return tx(async (c) => {
    const e = (await c.query(`SELECT * FROM email_campaigns WHERE id = $1 AND status IN ('draft','scheduled') FOR UPDATE`, [id])).rows[0];
    if (!e) throw bad('not_sendable', 'This campaign is not waiting to be sent.');
    await assertCanSend(c);
    const rules = e.segment_id ? (await c.query('SELECT rules FROM segments WHERE id = $1', [e.segment_id])).rows[0]?.rules ?? {} : {};
    const list = await audience(rules, c);
    const cap = await getSetting<number>('marketing.max_send_per_campaign', c);
    if (!list.length) throw bad('empty_audience', 'Nobody in this audience has agreed to receive marketing email.');
    if (list.length > cap) throw bad('over_cap', `This audience has ${list.length} people; the limit per campaign is ${cap}. Narrow the segment.`);
    const n = await queueEmails(c, list, { subject: e.subject, subjectB: e.subject_b, bPercent: e.ab_percent_b, body: e.body, campaignId: id });
    await c.query(`UPDATE email_campaigns SET status = 'sent', queued_at = now(), recipients = $2 WHERE id = $1`, [id, n]);
    return { recipients: n };
  });
}

export async function runScheduledCampaigns() {
  const due = (await pool.query(`SELECT id FROM email_campaigns WHERE status = 'scheduled' AND scheduled_at <= now()`)).rows;
  let sent = 0;
  for (const d of due) { try { await sendCampaign(d.id); sent++; } catch (e: any) { console.error('scheduled campaign failed', d.id, e.message); await pool.query(`UPDATE email_campaigns SET status = 'draft' WHERE id = $1`, [d.id]); } }
  return sent;
}

/** Automations: welcome, win-back, first-order follow-up. Each person gets each automation at most once per 90 days. Capped per pass. */
export async function runAutomations(cap = 200) {
  const autos = (await pool.query(`SELECT * FROM marketing_automations WHERE enabled`)).rows;
  if (!autos.length) return 0;
  try { await assertCanSend(); } catch { return 0; }
  let total = 0;
  for (const a of autos) {
    const base = audienceQuery({});
    let extra = '';
    if (a.trigger === 'welcome') extra = `u.created_at <= now() - make_interval(days => ${a.delay_days}) AND u.created_at > now() - interval '30 days'`;
    else if (a.trigger === 'winback') extra = `st.last_order IS NOT NULL AND st.last_order <= now() - make_interval(days => ${a.delay_days}) AND st.last_order > now() - make_interval(days => ${a.delay_days + 30})`;
    else if (a.trigger === 'abandoned_basket') extra = `EXISTS (SELECT 1 FROM carts ct WHERE ct.user_id = u.id AND ct.updated_at <= now() - interval '3 hours' AND ct.updated_at > now() - interval '3 days'
        AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = ct.id) AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.created_at > ct.updated_at))`;
    else extra = `st.orders = 1 AND st.last_order <= now() - make_interval(days => ${a.delay_days}) AND st.last_order > now() - make_interval(days => ${a.delay_days + 14})`;
    const sql = `${base.sql} AND ${extra} AND NOT EXISTS (SELECT 1 FROM automation_runs r WHERE r.automation_id = '${a.id}' AND r.user_id = u.id AND r.created_at > now() - interval '${a.trigger === 'abandoned_basket' ? '7' : '90'} days') LIMIT ${cap}`;
    const rows = (await pool.query(sql, base.params)).rows;
    if (!rows.length) continue;
    await tx(async (c) => {
      total += await queueEmails(c, rows, { subject: a.subject, body: a.body, automationId: a.id });
      for (const r of rows) await c.query('INSERT INTO automation_runs(automation_id, user_id) VALUES ($1,$2)', [a.id, r.id]);
    });
  }
  return total;
}
