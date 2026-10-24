import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { bad, notFound } from '../lib/errors.js';
import { requirePerm } from '../lib/permissions.js';
import { rl } from '../lib/ratelimit.js';
import { getSetting } from '../lib/settings.js';
import { isOurImageUrl } from '../lib/storage.js';
import { assertCanSend, audience, footer, maskEmail, renderBody, renderSubject, sendCampaign, type Rules } from '../services/marketing.js';
import { queueEmails } from '../services/marketing.js';

const uuid = z.string().uuid();
const rules = z.object({
  min_orders: z.number().int().min(0).max(1000).optional(), max_orders: z.number().int().min(0).max(1000).optional(),
  days_since_last_order_min: z.number().int().min(0).max(1000).optional(), days_since_last_order_max: z.number().int().min(0).max(1000).optional(),
  min_spend_cents: z.number().int().min(0).max(10_000_000).optional(), joined_within_days: z.number().int().min(0).max(3650).optional(),
  region: z.string().max(60).optional(), kitchen_buyers: z.boolean().optional(),
}).strict();
const CHANNEL = z.enum(['email', 'ads', 'coupons', 'social', 'events', 'other']);
const text = (n: number, min = 1) => z.string().trim().min(min).max(n);

/** Public, token-based endpoints used from inside emails. They never reveal who a token belongs to. */
export const marketingPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { token: string }; Querystring: { to?: string } }>('/m/c/:token', rl(120, '1 minute'), async (req, reply) => {
    const to = String(req.query.to ?? '/');
    const safe = /^\/(?!\/)[^\s\\]*$/.test(to) ? to : '/';              // same-site paths only: this cannot be used as an open redirect
    await pool.query(`UPDATE email_sends SET clicks = clicks + 1, first_clicked_at = COALESCE(first_clicked_at, now()) WHERE token = $1`, [req.params.token]).catch(() => {});
    return reply.redirect(`${config.WEB_ORIGIN.replace(/\/$/, '')}${safe}`, 302);
  });

  app.get<{ Params: { token: string } }>('/m/u/:token', rl(30, '1 minute'), async (req) => {
    const r = (await pool.query(`SELECT u.email, u.marketing_opt_in_at FROM email_sends s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [req.params.token])).rows[0];
    if (!r) throw notFound('This unsubscribe link is not valid.');
    return { email: maskEmail(r.email), subscribed: !!r.marketing_opt_in_at };
  });

  app.post<{ Params: { token: string } }>('/m/u/:token', rl(10, '1 minute'), async (req) => {
    const s = (await pool.query(`SELECT user_id FROM email_sends WHERE token = $1`, [req.params.token])).rows[0];
    if (!s) throw notFound('This unsubscribe link is not valid.');
    const r = await pool.query(`UPDATE users SET marketing_opt_in_at = NULL WHERE id = $1 AND marketing_opt_in_at IS NOT NULL RETURNING id`, [s.user_id]);
    if (r.rowCount) await pool.query(`INSERT INTO marketing_consent_log(user_id, action, source) VALUES ($1,'opt_out','email unsubscribe link')`, [s.user_id]);
    await pool.query(`UPDATE email_sends SET unsubscribed_at = COALESCE(unsubscribed_at, now()) WHERE token = $1`, [req.params.token]);
    await pool.query(`UPDATE notifications SET status = 'skipped' WHERE user_id = $1 AND transactional = false AND status = 'pending'`, [s.user_id]);   // anything already queued is dropped
    return { ok: true };
  });
};

export const marketingRoutes: FastifyPluginAsync = async (app) => {
  const perm = requirePerm('marketing.manage');
  app.addHook('preHandler', perm);
  const me = (req: any) => req.user!.id as string;

  // ---------- Dashboard ----------
  app.get('/dashboard', async () => {
    const one = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows[0];
    const aud = await audience({});
    const mail = await one(`SELECT count(*)::int AS sent, COALESCE(sum(clicks),0)::int AS clicks, count(*) FILTER (WHERE first_clicked_at IS NOT NULL)::int AS clickers, count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int AS unsubs FROM email_sends WHERE created_at > now() - interval '30 days'`);
    const ads = await one(`SELECT count(*) FILTER (WHERE type='impression')::int AS impressions, count(*) FILTER (WHERE type='click')::int AS clicks FROM ad_events WHERE created_at > now() - interval '30 days'`);
    const coupons = await one(`SELECT count(*)::int AS redemptions, COALESCE(sum(discount_cents),0)::int AS discount_cents FROM orders WHERE coupon_id IS NOT NULL AND placed_at > now() - interval '30 days'`);
    const customers = await one(`SELECT count(*)::int AS n, count(*) FILTER (WHERE marketing_opt_in_at IS NOT NULL)::int AS opted FROM users u WHERE deleted_at IS NULL AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'customer')`);
    const todo = await one(`SELECT (SELECT count(*) FROM email_campaigns WHERE status = 'draft')::int AS drafts, (SELECT count(*) FROM email_campaigns WHERE status = 'scheduled')::int AS scheduled,
                                   (SELECT count(*) FROM marketing_campaigns WHERE status = 'active')::int AS active_campaigns, (SELECT count(*) FROM social_posts WHERE status = 'scheduled' AND scheduled_for < now() + interval '3 days')::int AS posts_soon,
                                   (SELECT count(*) FROM ad_campaigns WHERE status = 'pending')::int AS ads_pending`);
    return { audience: aud.length, customers: customers.n, opted_in: customers.opted, mail, ads, coupons, todo, sender_ready: (await getSetting<string>('marketing.postal_address')).trim().length >= 10 };
  });

  // ---------- Segments ----------
  app.get('/segments', async () => (await pool.query(`SELECT id, name, description, rules, created_at FROM segments ORDER BY name`)).rows);
  app.post('/segments/preview', async (req) => {
    const b = z.object({ rules }).parse(req.body);
    const list = await audience(b.rules as Rules);
    return { count: list.length, sample: list.slice(0, 5).map((r) => ({ first_name: r.first_name, email: maskEmail(r.email) })) };
  });
  const segBody = z.object({ name: text(80, 2), description: z.string().trim().max(300).nullable().optional(), rules });
  app.post('/segments', async (req, reply) => {
    const b = segBody.parse(req.body);
    const r = (await pool.query(`INSERT INTO segments(name, description, rules, created_by) VALUES ($1,$2,$3,$4) RETURNING *`, [b.name, b.description ?? null, b.rules, me(req)])).rows[0];
    return reply.code(201).send(r);
  });
  app.put<{ Params: { id: string } }>('/segments/:id', async (req) => {
    const b = segBody.parse(req.body);
    const r = (await pool.query(`UPDATE segments SET name=$2, description=$3, rules=$4 WHERE id=$1 RETURNING *`, [uuid.parse(req.params.id), b.name, b.description ?? null, b.rules])).rows[0];
    if (!r) throw notFound('Segment not found');
    return r;
  });
  app.delete<{ Params: { id: string } }>('/segments/:id', async (req) => { await pool.query('DELETE FROM segments WHERE id = $1', [uuid.parse(req.params.id)]); return { ok: true }; });

  // ---------- Email templates ----------
  const tplBody = z.object({ name: text(80, 2), subject: text(150), body: text(8000) });
  app.get('/templates', async () => (await pool.query('SELECT * FROM marketing_templates ORDER BY name')).rows);
  app.post('/templates', async (req, reply) => { const b = tplBody.parse(req.body); return reply.code(201).send((await pool.query('INSERT INTO marketing_templates(name, subject, body) VALUES ($1,$2,$3) RETURNING *', [b.name, b.subject, b.body])).rows[0]); });
  app.put<{ Params: { id: string } }>('/templates/:id', async (req) => { const b = tplBody.parse(req.body); const r = (await pool.query('UPDATE marketing_templates SET name=$2, subject=$3, body=$4 WHERE id=$1 RETURNING *', [uuid.parse(req.params.id), b.name, b.subject, b.body])).rows[0]; if (!r) throw notFound('Template not found'); return r; });
  app.delete<{ Params: { id: string } }>('/templates/:id', async (req) => { await pool.query('DELETE FROM marketing_templates WHERE id = $1', [uuid.parse(req.params.id)]); return { ok: true }; });

  // ---------- Email campaigns ----------
  const emailBody = z.object({
    name: text(100, 2), subject: text(150), subject_b: z.string().trim().max(150).nullable().optional(), ab_percent_b: z.number().int().min(0).max(100).default(50),
    body: text(8000), segment_id: uuid.nullable().optional(), campaign_id: uuid.nullable().optional(),
  });
  app.get('/emails', async () => (await pool.query(
    `SELECT e.id, e.name, e.subject, e.status, e.scheduled_at, e.queued_at, e.recipients, e.created_at, s.name AS segment,
            (SELECT count(*)::int FROM email_sends x WHERE x.email_campaign_id = e.id AND x.first_clicked_at IS NOT NULL) AS clickers
       FROM email_campaigns e LEFT JOIN segments s ON s.id = e.segment_id ORDER BY e.created_at DESC LIMIT 200`)).rows);
  app.get<{ Params: { id: string } }>('/emails/:id', async (req) => {
    const e = (await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [uuid.parse(req.params.id)])).rows[0];
    if (!e) throw notFound('Campaign not found');
    return e;
  });
  app.post('/emails', async (req, reply) => {
    const b = emailBody.parse(req.body);
    const r = (await pool.query(`INSERT INTO email_campaigns(name, subject, subject_b, ab_percent_b, body, segment_id, campaign_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [b.name, b.subject, b.subject_b || null, b.ab_percent_b, b.body, b.segment_id ?? null, b.campaign_id ?? null, me(req)])).rows[0];
    await audit(me(req), 'email_campaign.created', 'email_campaign', r.id);
    return reply.code(201).send(r);
  });
  app.put<{ Params: { id: string } }>('/emails/:id', async (req) => {
    const b = emailBody.parse(req.body);
    const r = (await pool.query(`UPDATE email_campaigns SET name=$2, subject=$3, subject_b=$4, ab_percent_b=$5, body=$6, segment_id=$7, campaign_id=$8 WHERE id=$1 AND status IN ('draft','scheduled') RETURNING *`,
      [uuid.parse(req.params.id), b.name, b.subject, b.subject_b || null, b.ab_percent_b, b.body, b.segment_id ?? null, b.campaign_id ?? null])).rows[0];
    if (!r) throw bad('locked', 'A campaign that has been sent cannot be edited. Copy it instead.');
    return r;
  });
  app.delete<{ Params: { id: string } }>('/emails/:id', async (req) => {
    const r = await pool.query(`DELETE FROM email_campaigns WHERE id = $1 AND status IN ('draft','cancelled')`, [uuid.parse(req.params.id)]);
    if (!r.rowCount) throw bad('locked', 'Only drafts can be deleted.');
    return { ok: true };
  });
  /** What a recipient will read, rendered for the signed-in person. */
  app.get<{ Params: { id: string } }>('/emails/:id/preview', async (req) => {
    const e = (await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [uuid.parse(req.params.id)])).rows[0];
    if (!e) throw notFound('Campaign not found');
    const u = (await pool.query(`SELECT split_part(full_name,' ',1) AS first_name FROM users WHERE id = $1`, [me(req)])).rows[0];
    const t = 'PREVIEWTOKEN';
    return { subject: renderSubject(e.subject, u.first_name), subject_b: e.subject_b ? renderSubject(e.subject_b, u.first_name) : null, body: renderBody(e.body, { first_name: u.first_name, token: t }) + (await footer(t)) };
  });
  /** Sends one copy to the signed-in staff member only, clearly marked as a test. */
  app.post<{ Params: { id: string } }>('/emails/:id/test', rl(10, '10 minutes'), async (req) => {
    const e = (await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [uuid.parse(req.params.id)])).rows[0];
    if (!e) throw notFound('Campaign not found');
    await assertCanSend();
    const u = (await pool.query(`SELECT id, email, split_part(full_name,' ',1) AS first_name FROM users WHERE id = $1`, [me(req)])).rows[0];
    const t = 'TESTTOKEN';
    await pool.query(`INSERT INTO notifications(user_id, to_email, template, vars, subject, body, transactional) VALUES ($1,$2,'marketing_test','{}',$3,$4,true)`,
      [u.id, u.email, `[TEST] ${renderSubject(e.subject, u.first_name)}`, renderBody(e.body, { first_name: u.first_name, token: t }) + (await footer(t))]);
    return { ok: true, to: maskEmail(u.email) };
  });
  app.post<{ Params: { id: string } }>('/emails/:id/send', rl(10, '10 minutes'), async (req) => {
    const id = uuid.parse(req.params.id);
    const r = await sendCampaign(id);
    await audit(me(req), 'email_campaign.sent', 'email_campaign', id, r);
    return r;
  });
  app.post<{ Params: { id: string } }>('/emails/:id/schedule', async (req) => {
    const id = uuid.parse(req.params.id); const { at } = z.object({ at: z.string().datetime() }).parse(req.body);
    if (new Date(at).getTime() < Date.now() + 5 * 60_000) throw bad('too_soon', 'Schedule at least 5 minutes ahead.');
    await assertCanSend();
    const r = await pool.query(`UPDATE email_campaigns SET status = 'scheduled', scheduled_at = $2 WHERE id = $1 AND status IN ('draft','scheduled') RETURNING id`, [id, at]);
    if (!r.rowCount) throw bad('not_sendable', 'This campaign cannot be scheduled.');
    return { ok: true };
  });
  app.post<{ Params: { id: string } }>('/emails/:id/cancel', async (req) => {
    const r = await pool.query(`UPDATE email_campaigns SET status = 'draft', scheduled_at = NULL WHERE id = $1 AND status = 'scheduled' RETURNING id`, [uuid.parse(req.params.id)]);
    if (!r.rowCount) throw bad('not_scheduled', 'This campaign is not scheduled.');
    return { ok: true };
  });
  app.get<{ Params: { id: string } }>('/emails/:id/stats', async (req) => {
    const id = uuid.parse(req.params.id);
    const t = (await pool.query(
      `SELECT s.variant, count(*)::int AS queued, count(*) FILTER (WHERE n.status = 'sent')::int AS sent, count(*) FILTER (WHERE n.status = 'failed')::int AS failed, count(*) FILTER (WHERE n.status = 'skipped')::int AS skipped,
              count(*) FILTER (WHERE s.first_clicked_at IS NOT NULL)::int AS clickers, COALESCE(sum(s.clicks),0)::int AS clicks, count(*) FILTER (WHERE s.unsubscribed_at IS NOT NULL)::int AS unsubscribed
         FROM email_sends s LEFT JOIN notifications n ON n.id = s.notification_id WHERE s.email_campaign_id = $1 GROUP BY s.variant ORDER BY s.variant`, [id])).rows;
    return { variants: t, note: 'Opens are not tracked, to respect privacy. Clicks are counted on links written as {{link:/path}}.' };
  });

  // ---------- Campaigns (groups of activity with a budget and a measured result) ----------
  const campBody = z.object({ name: text(100, 2), objective: z.string().trim().max(300).nullable().optional(), starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    budget_cents: z.number().int().min(0).max(100_000_000).default(0), status: z.enum(['planned', 'active', 'finished', 'cancelled']).default('planned'), coupon_id: uuid.nullable().optional(), theme_id: uuid.nullable().optional(), notes: z.string().trim().max(1000).nullable().optional() });
  app.get('/campaigns', async () => (await pool.query(`SELECT c.*, to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on, cp.code AS coupon_code, t.name AS theme_name FROM marketing_campaigns c LEFT JOIN coupons cp ON cp.id = c.coupon_id LEFT JOIN themes t ON t.id = c.theme_id ORDER BY COALESCE(c.starts_on, c.created_at::date) DESC LIMIT 200`)).rows);
  app.post('/campaigns', async (req, reply) => {
    const b = campBody.parse(req.body);
    const r = (await pool.query(`INSERT INTO marketing_campaigns(name, objective, starts_on, ends_on, budget_cents, status, coupon_id, theme_id, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.name, b.objective ?? null, b.starts_on ?? null, b.ends_on ?? null, b.budget_cents, b.status, b.coupon_id ?? null, b.theme_id ?? null, b.notes ?? null, me(req)])).rows[0];
    return reply.code(201).send(r);
  });
  app.put<{ Params: { id: string } }>('/campaigns/:id', async (req) => {
    const b = campBody.parse(req.body);
    const r = (await pool.query(`UPDATE marketing_campaigns SET name=$2, objective=$3, starts_on=$4, ends_on=$5, budget_cents=$6, status=$7, coupon_id=$8, theme_id=$9, notes=$10 WHERE id=$1 RETURNING *`,
      [uuid.parse(req.params.id), b.name, b.objective ?? null, b.starts_on ?? null, b.ends_on ?? null, b.budget_cents, b.status, b.coupon_id ?? null, b.theme_id ?? null, b.notes ?? null])).rows[0];
    if (!r) throw notFound('Campaign not found');
    return r;
  });
  app.delete<{ Params: { id: string } }>('/campaigns/:id', async (req) => { await pool.query('DELETE FROM marketing_campaigns WHERE id = $1', [uuid.parse(req.params.id)]); return { ok: true }; });
  /** Measured, not claimed: counts what happened. "Ordered within 7 days" is correlation, not proof the email caused the order. */
  app.get<{ Params: { id: string } }>('/campaigns/:id/results', async (req) => {
    const id = uuid.parse(req.params.id);
    const c = (await pool.query('SELECT * FROM marketing_campaigns WHERE id = $1', [id])).rows[0];
    if (!c) throw notFound('Campaign not found');
    const emails = (await pool.query(
      `SELECT e.id, e.name, e.recipients, (SELECT count(*)::int FROM email_sends s WHERE s.email_campaign_id = e.id AND s.first_clicked_at IS NOT NULL) AS clickers,
              (SELECT count(DISTINCT s.user_id)::int FROM email_sends s WHERE s.email_campaign_id = e.id AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = s.user_id AND o.placed_at BETWEEN s.created_at AND s.created_at + interval '7 days')) AS ordered_within_7_days
         FROM email_campaigns e WHERE e.campaign_id = $1 ORDER BY e.created_at`, [id])).rows;
    const coupon = c.coupon_id ? (await pool.query(`SELECT count(*)::int AS redemptions, COALESCE(sum(discount_cents),0)::int AS discount_cents, COALESCE(sum(subtotal_cents),0)::int AS merchandise_cents FROM orders WHERE coupon_id = $1 AND placed_at IS NOT NULL`, [c.coupon_id])).rows[0] : null;
    const spent = (await pool.query(`SELECT COALESCE(sum(amount_cents),0)::int AS n FROM marketing_expenses WHERE campaign_id = $1`, [id])).rows[0].n;
    return { emails, coupon, spent_cents: spent, budget_cents: c.budget_cents, note: 'These are counts of what happened. "Ordered within 7 days" shows timing, not proof that the email caused the order.' };
  });

  // ---------- Automations ----------
  app.get('/automations', async () => (await pool.query(`SELECT a.*, (SELECT count(*)::int FROM email_sends s WHERE s.automation_id = a.id) AS sent FROM marketing_automations a ORDER BY a.created_at`)).rows);
  app.put<{ Params: { id: string } }>('/automations/:id', async (req) => {
    const b = z.object({ name: text(100, 2), delay_days: z.number().int().min(0).max(365), subject: text(150), body: text(8000), enabled: z.boolean() }).parse(req.body);
    if (b.enabled) await assertCanSend();
    const r = (await pool.query(`UPDATE marketing_automations SET name=$2, delay_days=$3, subject=$4, body=$5, enabled=$6 WHERE id=$1 RETURNING *`, [uuid.parse(req.params.id), b.name, b.delay_days, b.subject, b.body, b.enabled])).rows[0];
    if (!r) throw notFound('Automation not found');
    await audit(me(req), b.enabled ? 'automation.enabled' : 'automation.updated', 'automation', r.id);
    return r;
  });

  // ---------- Occasions calendar (the festival themes, with the next date of each) ----------
  app.get('/occasions', async () => {
    const rows = (await pool.query(`SELECT id, slug, name, kind, emoji, status, repeats_yearly, starts_on::text AS starts_on, ends_on::text AS ends_on, notes FROM themes ORDER BY name`)).rows;
    const today = new Date().toISOString().slice(0, 10), y = +today.slice(0, 4);
    const out = rows.map((t) => {
      let s = t.starts_on, e = t.ends_on;
      if (t.repeats_yearly) {
        const mk = (yr: number, d: string) => `${yr}${d.slice(4)}`;
        let sy = y; let ey = y + (t.ends_on.slice(5) < t.starts_on.slice(5) ? 1 : 0);
        if (mk(ey, e) < today) { sy++; ey++; }
        s = mk(sy, t.starts_on); e = mk(ey, t.ends_on);
      }
      return { ...t, next_start: s, next_end: e, days_until: Math.round((new Date(s).getTime() - new Date(today).getTime()) / 864e5), moves: String(t.notes).startsWith('MOVES') };
    }).filter((t) => t.next_end >= today).sort((a, b) => a.next_start.localeCompare(b.next_start));
    return out;
  });

  // ---------- Social planner (drafts and a schedule; posting itself is done by hand on each platform) ----------
  const socBody = z.object({ platform: z.enum(['instagram', 'facebook', 'tiktok', 'x', 'whatsapp', 'other']), caption: text(2200), image_url: z.string().refine(isOurImageUrl, 'Upload the image through EAZyfoods first.').nullable().optional(),
    link: z.string().trim().max(300).regex(/^(https:\/\/\S+|\/\S*)?$/, 'Use an https:// link or a page starting with /').nullable().optional(), scheduled_for: z.string().datetime().nullable().optional(), status: z.enum(['draft', 'scheduled', 'posted']).default('draft'), campaign_id: uuid.nullable().optional() });
  app.get('/social', async () => (await pool.query(`SELECT * FROM social_posts ORDER BY COALESCE(scheduled_for, created_at) DESC LIMIT 200`)).rows);
  app.post('/social', async (req, reply) => { const b = socBody.parse(req.body); return reply.code(201).send((await pool.query(`INSERT INTO social_posts(platform, caption, image_url, link, scheduled_for, status, campaign_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [b.platform, b.caption, b.image_url ?? null, b.link || null, b.scheduled_for ?? null, b.status, b.campaign_id ?? null, me(req)])).rows[0]); });
  app.put<{ Params: { id: string } }>('/social/:id', async (req) => { const b = socBody.parse(req.body); const r = (await pool.query(`UPDATE social_posts SET platform=$2, caption=$3, image_url=$4, link=$5, scheduled_for=$6, status=$7, campaign_id=$8 WHERE id=$1 RETURNING *`, [uuid.parse(req.params.id), b.platform, b.caption, b.image_url ?? null, b.link || null, b.scheduled_for ?? null, b.status, b.campaign_id ?? null])).rows[0]; if (!r) throw notFound('Post not found'); return r; });
  app.delete<{ Params: { id: string } }>('/social/:id', async (req) => { await pool.query('DELETE FROM social_posts WHERE id = $1', [uuid.parse(req.params.id)]); return { ok: true }; });

  // ---------- Budget ----------
  app.get('/budget', async (req) => {
    const { month } = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).default(new Date().toISOString().slice(0, 7)) }).parse(req.query);
    const first = `${month}-01`;
    const budgets = Object.fromEntries((await pool.query(`SELECT channel, budget_cents FROM marketing_budgets WHERE month = $1`, [first])).rows.map((r) => [r.channel, r.budget_cents]));
    const exp = Object.fromEntries((await pool.query(`SELECT channel, sum(amount_cents)::int AS n FROM marketing_expenses WHERE on_date >= $1::date AND on_date < ($1::date + interval '1 month') GROUP BY channel`, [first])).rows.map((r) => [r.channel, r.n]));
    // Measured automatically: ad spend is clicks x price per click (capped at each campaign's budget); coupon cost is the discounts customers actually received.
    const ads = (await pool.query(`SELECT COALESCE(sum(LEAST(x.clicks * c.cpc_cents, c.budget_cents)), 0)::int AS n FROM ad_campaigns c JOIN LATERAL (SELECT count(*) AS clicks FROM ad_events e WHERE e.campaign_id = c.id AND e.type = 'click' AND e.created_at >= $1::date AND e.created_at < ($1::date + interval '1 month')) x ON true`, [first])).rows[0].n;
    const coupons = (await pool.query(`SELECT COALESCE(sum(discount_cents),0)::int AS n FROM orders WHERE coupon_id IS NOT NULL AND placed_at >= $1::date AND placed_at < ($1::date + interval '1 month')`, [first])).rows[0].n;
    const channels = (['email', 'ads', 'coupons', 'social', 'events', 'other'] as const).map((ch) => {
      const auto = ch === 'ads' ? ads : ch === 'coupons' ? coupons : 0;
      return { channel: ch, budget_cents: budgets[ch] ?? 0, recorded_cents: exp[ch] ?? 0, measured_cents: auto, actual_cents: (exp[ch] ?? 0) + auto };
    });
    const expenses = (await pool.query(`SELECT id, to_char(on_date, 'YYYY-MM-DD') AS on_date, channel, amount_cents, note FROM marketing_expenses WHERE on_date >= $1::date AND on_date < ($1::date + interval '1 month') ORDER BY on_date DESC`, [first])).rows;
    return { month, channels, expenses, note: 'Ads and coupon costs are measured automatically; everything else is what you record.' };
  });
  app.put('/budget', async (req) => {
    const b = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), channel: CHANNEL, budget_cents: z.number().int().min(0).max(100_000_000) }).parse(req.body);
    await pool.query(`INSERT INTO marketing_budgets(month, channel, budget_cents) VALUES ($1,$2,$3) ON CONFLICT (month, channel) DO UPDATE SET budget_cents = $3`, [`${b.month}-01`, b.channel, b.budget_cents]);
    return { ok: true };
  });
  app.post('/expenses', async (req, reply) => {
    const b = z.object({ on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), channel: CHANNEL, amount_cents: z.number().int().min(1).max(100_000_000), note: z.string().trim().max(200).nullable().optional(), campaign_id: uuid.nullable().optional() }).parse(req.body);
    const r = (await pool.query(`INSERT INTO marketing_expenses(on_date, channel, amount_cents, note, campaign_id, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [b.on_date, b.channel, b.amount_cents, b.note ?? null, b.campaign_id ?? null, me(req)])).rows[0];
    return reply.code(201).send(r);
  });
  app.delete<{ Params: { id: string } }>('/expenses/:id', async (req) => { await pool.query('DELETE FROM marketing_expenses WHERE id = $1', [uuid.parse(req.params.id)]); return { ok: true }; });

  // ---------- Asset library ----------
  app.get('/assets', async () => (await pool.query('SELECT * FROM marketing_assets ORDER BY created_at DESC LIMIT 300')).rows);
  app.post('/assets', async (req, reply) => {
    const b = z.object({ title: text(100, 2), url: z.string().refine(isOurImageUrl, 'Upload the image through EAZyfoods first.'), tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]) }).parse(req.body);
    return reply.code(201).send((await pool.query('INSERT INTO marketing_assets(title, url, tags, created_by) VALUES ($1,$2,$3,$4) RETURNING *', [b.title, b.url, b.tags, me(req)])).rows[0]);
  });
  app.delete<{ Params: { id: string } }>('/assets/:id', async (req) => { await pool.query('DELETE FROM marketing_assets WHERE id = $1', [uuid.parse(req.params.id)]); return { ok: true }; });

  // ---------- Analytics ----------
  app.get('/analytics', async (req) => {
    const { days } = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }).parse(req.query);
    const emails = (await pool.query(
      `SELECT e.id, e.name, e.queued_at, e.recipients, count(s.*) FILTER (WHERE s.first_clicked_at IS NOT NULL)::int AS clickers, COALESCE(sum(s.clicks),0)::int AS clicks, count(s.*) FILTER (WHERE s.unsubscribed_at IS NOT NULL)::int AS unsubscribed
         FROM email_campaigns e LEFT JOIN email_sends s ON s.email_campaign_id = e.id WHERE e.status = 'sent' AND e.queued_at > now() - make_interval(days => $1) GROUP BY e.id ORDER BY e.queued_at DESC`, [days])).rows;
    const coupons = (await pool.query(`SELECT c.code, count(o.*)::int AS orders, COALESCE(sum(o.discount_cents),0)::int AS discount_cents, COALESCE(sum(o.subtotal_cents),0)::int AS merchandise_cents FROM coupons c LEFT JOIN orders o ON o.coupon_id = c.id AND o.placed_at > now() - make_interval(days => $1) GROUP BY c.code ORDER BY orders DESC LIMIT 20`, [days])).rows;
    const ads = (await pool.query(`SELECT count(*) FILTER (WHERE type='impression')::int AS impressions, count(*) FILTER (WHERE type='click')::int AS clicks FROM ad_events WHERE created_at > now() - make_interval(days => $1)`, [days])).rows[0];
    const growth = (await pool.query(
      `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week, count(*) FILTER (WHERE action = 'opt_in')::int AS opt_ins, count(*) FILTER (WHERE action = 'opt_out')::int AS opt_outs FROM marketing_consent_log WHERE created_at > now() - make_interval(days => $1) GROUP BY 1 ORDER BY 1`, [days])).rows;
    const unmet = (await pool.query(`SELECT query, count(*)::int AS searches FROM search_events WHERE result_count = 0 AND created_at > now() - make_interval(days => $1) GROUP BY query ORDER BY searches DESC LIMIT 15`, [days])).rows;
    return { days, emails, coupons, ads, growth, unmet_searches: unmet };
  });

  // ---------- Sender settings (required before any marketing email can be sent) ----------
  app.get('/settings', async () => ({ sender_name: await getSetting<string>('marketing.sender_name'), postal_address: await getSetting<string>('marketing.postal_address'), max_send_per_campaign: await getSetting<number>('marketing.max_send_per_campaign') }));
  app.put('/settings', async (req) => {
    const b = z.object({ sender_name: text(80, 2), postal_address: z.string().trim().max(300), max_send_per_campaign: z.number().int().min(1).max(100000) }).parse(req.body);
    for (const [k, v] of [['marketing.sender_name', b.sender_name], ['marketing.postal_address', b.postal_address], ['marketing.max_send_per_campaign', b.max_send_per_campaign]] as const)
      await pool.query(`INSERT INTO app_settings(key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`, [k, JSON.stringify(v)]);
    await audit(me(req), 'marketing.settings_updated', 'setting', 'marketing', { sender: b.sender_name });
    return { ok: true };
  });
};
void queueEmails;
