import { pool } from '../db/pool.js';
import type { Queryable } from '../lib/db-types.js';
import { config } from '../config.js';
import { featureOn } from './features.js';

/** Canadian/US numbers only for now: returns +1XXXXXXXXXX or null. */
export function toE164(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(n) ? `+1${n}` : null;
}

const STOP = ' Reply STOP to stop texts.';

/** Queue a text for someone who opted in and has a valid number. Anything else is silently not sent. Returns whether it was queued. */
export async function queueSms(c: Queryable, userId: string, text: string): Promise<boolean> {
  if (!(await featureOn('shop.sms', c))) return false;
  const u = (await c.query('SELECT phone, sms_opt_in_at FROM users WHERE id = $1 AND disabled_at IS NULL AND deleted_at IS NULL', [userId])).rows[0];
  const to = toE164(u?.phone);
  if (!u?.sms_opt_in_at || !to) return false;
  await c.query('INSERT INTO sms_outbox(user_id, to_phone, body) VALUES ($1,$2,$3)', [userId, to, (text.slice(0, 140) + STOP)]);
  return true;
}

async function send(to: string, body: string) {
  if (config.SMS_TRANSPORT === 'log') { if (config.NODE_ENV !== 'test') console.log(`[sms:log] to=${to} ${body}`); return; }
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = config;
  if (!sid || !token || !from) throw new Error('Twilio is not configured');
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Send what is waiting. Consent is checked again at send time, so someone who opted out after it was queued gets nothing. */
export async function processSms(limit = 50) {
  const rows = (await pool.query(
    `SELECT o.id, o.to_phone, o.body, (u.sms_opt_in_at IS NOT NULL) AS ok FROM sms_outbox o JOIN users u ON u.id = o.user_id WHERE o.status = 'pending' AND o.attempts < 3 ORDER BY o.id LIMIT $1`, [limit])).rows;
  let sent = 0;
  for (const r of rows) {
    if (!r.ok) { await pool.query(`UPDATE sms_outbox SET status = 'skipped' WHERE id = $1`, [r.id]); continue; }
    try { await send(r.to_phone, r.body); await pool.query(`UPDATE sms_outbox SET status = 'sent', sent_at = now() WHERE id = $1`, [r.id]); sent++; }
    catch (e: any) { await pool.query(`UPDATE sms_outbox SET attempts = attempts + 1, error = $2, status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END WHERE id = $1`, [r.id, String(e.message).slice(0, 300)]); }
  }
  return sent;
}
