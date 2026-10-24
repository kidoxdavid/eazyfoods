import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, call, login, newCustomer } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { audience, audienceQuery, runAutomations, runScheduledCampaigns } from '../src/services/marketing.js';
import { processOutbox } from '../src/services/notify.js';

let mk: string;
const body = (o: object = {}) => ({ name: 'Test blast', subject: 'Hello {{first_name}}', body: 'Hi {{first_name}}, see {{link:/deals}}', ab_percent_b: 50, ...o });

/** A customer with every condition for receiving marketing, unless overridden. */
async function member(o: { optIn?: boolean; verified?: boolean; notify?: boolean; deleted?: boolean } = {}) {
  const u = await newCustomer();
  await pool.query(`UPDATE users SET marketing_opt_in_at = $2, email_verified_at = $3, notify_email = $4, deleted_at = $5 WHERE id = $1`,
    [u.id, o.optIn === false ? null : new Date(), o.verified === false ? null : new Date(), o.notify ?? true, o.deleted ? new Date() : null]);
  return u;
}
const settings = (cookie: string, addr = '1 Test Street NE, Calgary, AB T2A 0A0') => call(cookie, 'PUT', '/api/marketing/settings', { sender_name: 'EAZyfoods Test', postal_address: addr, max_send_per_campaign: 5000 });
const stats = async (id: string) => (await pool.query('SELECT count(*)::int n FROM email_sends WHERE email_campaign_id = $1', [id])).rows[0].n;

beforeAll(async () => { mk = (await login('marketing@example.test')).cookie; await settings(mk, ''); });
afterAll(async () => { await settings(mk); await pool.query(`UPDATE marketing_automations SET enabled = false`); });

describe('access', () => {
  it('only marketing and owner roles can use it', async () => {
    const cust = (await login('customer@example.test')).cookie, support = (await login('support@example.test')).cookie, owner = (await login('owner@example.test')).cookie;
    for (const c of [cust, support]) expect((await call(c, 'GET', '/api/marketing/dashboard')).status).toBe(403);
    expect((await call(null, 'GET', '/api/marketing/dashboard')).status).toBe(401);
    expect((await call(mk, 'GET', '/api/marketing/dashboard')).status).toBe(200);
    expect((await call(owner, 'GET', '/api/marketing/dashboard')).status).toBe(200);
  });
});

describe('who can be emailed', () => {
  it('only opted-in, verified, deliverable customers; segment rules only narrow the list', async () => {
    const ok = await member(), noOpt = await member({ optIn: false }), unverified = await member({ verified: false }), noMail = await member({ notify: false }), gone = await member({ deleted: true });
    const ids = (await audience({})).map((r) => r.id);
    expect(ids).toContain(ok.id);
    for (const x of [noOpt, unverified, noMail, gone]) expect(ids).not.toContain(x.id);
    expect((await audience({ min_orders: 1 })).map((r) => r.id)).not.toContain(ok.id);      // never ordered
    expect((await audience({ max_orders: 0 })).map((r) => r.id)).toContain(ok.id);
    expect((await audience({ joined_within_days: 1 })).map((r) => r.id)).toContain(ok.id);
    const preview = await call(mk, 'POST', '/api/marketing/segments/preview', { rules: { max_orders: 0 } });
    expect(preview.body.count).toBeGreaterThan(0);
    expect(preview.body.sample.every((x: any) => /^.•••@/.test(x.email))).toBe(true);          // sample emails are masked
    expect((await call(mk, 'POST', '/api/marketing/segments/preview', { rules: { everyone: true } })).status).toBe(400);   // unknown rules are refused
    expect(audienceQuery({ region: "x' OR 1=1 --" }).sql).not.toContain('OR 1=1');         // values are parameters, never SQL text
  });
});

describe('sending', () => {
  it('needs a postal address, includes the legal footer and a working unsubscribe, tracks clicks safely', async () => {
    const u = await member();
    const seg = (await call(mk, 'POST', '/api/marketing/segments', { name: 'New today', rules: { joined_within_days: 1 } })).body;
    const e = (await call(mk, 'POST', '/api/marketing/emails', body({ segment_id: seg.id, subject_b: 'B: {{first_name}}, deals inside', ab_percent_b: 100 }))).body;
    const blocked = await call(mk, 'POST', `/api/marketing/emails/${e.id}/send`);
    expect(blocked.status).toBe(400); expect(blocked.body.error).toBe('sender_address_required');
    expect((await settings(mk)).status).toBe(200);

    const sent = await call(mk, 'POST', `/api/marketing/emails/${e.id}/send`);
    expect(sent.status).toBe(200); expect(sent.body.recipients).toBeGreaterThan(0);
    expect((await call(mk, 'POST', `/api/marketing/emails/${e.id}/send`)).status).toBe(400);                 // cannot be sent twice
    expect((await call(mk, 'PUT', `/api/marketing/emails/${e.id}`, body())).status).toBe(400);               // and is locked afterwards

    const n = (await pool.query(`SELECT n.subject, n.body, n.transactional, s.token, s.variant FROM email_sends s JOIN notifications n ON n.id = s.notification_id WHERE s.email_campaign_id = $1 AND s.user_id = $2`, [e.id, u.id])).rows[0];
    expect(n.transactional).toBe(false); expect(n.variant).toBe('b'); expect(n.subject).toBe('B: Test, deals inside');
    expect(n.body).toContain('1 Test Street NE'); expect(n.body).toContain(`/unsubscribe/${n.token}`);
    const link = /\/api\/m\/c\/([\w-]+)\?to=([^\s]+)/.exec(n.body)!;
    expect(decodeURIComponent(link[2])).toBe('/deals');

    const click = await app.inject({ url: `/api/m/c/${n.token}?to=%2Fdeals` });
    expect(click.statusCode).toBe(302); expect(String(click.headers.location)).toMatch(/\/deals$/);
    for (const evil of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      const r = await app.inject({ url: `/api/m/c/${n.token}?to=${encodeURIComponent(evil)}` });
      expect(String(r.headers.location)).not.toContain('evil'); expect(r.statusCode).toBe(302);
    }
    expect((await pool.query('SELECT clicks FROM email_sends WHERE token = $1', [n.token])).rows[0].clicks).toBeGreaterThanOrEqual(1);
    const st = (await call(mk, 'GET', `/api/marketing/emails/${e.id}/stats`)).body;
    expect(st.variants.find((v: any) => v.variant === 'b').clickers).toBeGreaterThanOrEqual(1);
  });

  it('unsubscribing withdraws consent everywhere, drops queued mail and is logged', async () => {
    const u = await member();
    const e = (await call(mk, 'POST', '/api/marketing/emails', body({ segment_id: (await call(mk, 'POST', '/api/marketing/segments', { name: 'S2', rules: { joined_within_days: 1 } })).body.id }))).body;
    await call(mk, 'POST', `/api/marketing/emails/${e.id}/send`);
    const token = (await pool.query('SELECT token FROM email_sends WHERE email_campaign_id = $1 AND user_id = $2', [e.id, u.id])).rows[0].token;
    expect((await call(null, 'GET', `/api/m/u/${token}`)).body.subscribed).toBe(true);
    expect((await call(null, 'POST', `/api/m/u/${token}`)).status).toBe(200);
    expect((await pool.query('SELECT marketing_opt_in_at FROM users WHERE id = $1', [u.id])).rows[0].marketing_opt_in_at).toBeNull();
    expect((await pool.query(`SELECT status FROM notifications WHERE user_id = $1 AND template = 'marketing'`, [u.id])).rows[0].status).toBe('skipped');
    expect((await pool.query(`SELECT action, source FROM marketing_consent_log WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [u.id])).rows[0]).toEqual({ action: 'opt_out', source: 'email unsubscribe link' });
    expect((await audience({})).map((r) => r.id)).not.toContain(u.id);
    expect((await call(null, 'GET', '/api/m/u/not-a-real-token')).status).toBe(404);
    expect((await call(null, 'POST', '/api/m/u/not-a-real-token')).status).toBe(404);
  });

  it('consent is re-checked when the email is actually sent', async () => {
    const u = await member();
    await pool.query(`INSERT INTO notifications(user_id, to_email, template, vars, subject, body, transactional) VALUES ($1,$2,'marketing','{}','x','y',false)`, [u.id, u.email]);
    await pool.query('UPDATE users SET marketing_opt_in_at = NULL WHERE id = $1', [u.id]);
    await processOutbox(500);
    expect((await pool.query(`SELECT status FROM notifications WHERE user_id = $1 AND template = 'marketing'`, [u.id])).rows[0].status).toBe('skipped');
  });

  it('refuses audiences over the cap and empty audiences; a test send goes only to the sender', async () => {
    await member(); await member();
    const seg = (await call(mk, 'POST', '/api/marketing/segments', { name: 'Cap', rules: { joined_within_days: 1 } })).body;
    const e = (await call(mk, 'POST', '/api/marketing/emails', body({ segment_id: seg.id }))).body;
    await call(mk, 'PUT', '/api/marketing/settings', { sender_name: 'EAZyfoods Test', postal_address: '1 Test Street NE, Calgary, AB T2A 0A0', max_send_per_campaign: 1 });
    expect((await call(mk, 'POST', `/api/marketing/emails/${e.id}/send`)).body.error).toBe('over_cap');
    await settings(mk);
    const none = (await call(mk, 'POST', '/api/marketing/segments', { name: 'Nobody', rules: { min_spend_cents: 5000000 } })).body;
    const e2 = (await call(mk, 'POST', '/api/marketing/emails', body({ segment_id: none.id }))).body;
    expect((await call(mk, 'POST', `/api/marketing/emails/${e2.id}/send`)).body.error).toBe('empty_audience');
    const before = (await pool.query(`SELECT count(*)::int n FROM notifications WHERE template = 'marketing_test'`)).rows[0].n;
    expect((await call(mk, 'POST', `/api/marketing/emails/${e.id}/test`)).status).toBe(200);
    const t = (await pool.query(`SELECT to_email, subject FROM notifications WHERE template = 'marketing_test' ORDER BY id DESC LIMIT 1`)).rows[0];
    expect(t.to_email).toBe('marketing@example.test'); expect(t.subject).toMatch(/^\[TEST\]/);
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE template = 'marketing_test'`)).rows[0].n).toBe(before + 1);
  });

  it('schedules for later, can be cancelled, and the scheduler sends it when due', async () => {
    await member();
    const seg = (await call(mk, 'POST', '/api/marketing/segments', { name: 'Sched', rules: { joined_within_days: 1 } })).body;
    const e = (await call(mk, 'POST', '/api/marketing/emails', body({ segment_id: seg.id }))).body;
    expect((await call(mk, 'POST', `/api/marketing/emails/${e.id}/schedule`, { at: new Date(Date.now() - 60_000).toISOString() })).status).toBe(400);
    const at = new Date(Date.now() + 3600_000).toISOString();
    expect((await call(mk, 'POST', `/api/marketing/emails/${e.id}/schedule`, { at })).status).toBe(200);
    expect((await call(mk, 'POST', `/api/marketing/emails/${e.id}/cancel`)).status).toBe(200);
    await call(mk, 'POST', `/api/marketing/emails/${e.id}/schedule`, { at });
    expect(await stats(e.id)).toBe(0);
    await pool.query(`UPDATE email_campaigns SET scheduled_at = now() - interval '1 minute' WHERE id = $1`, [e.id]);
    expect(await runScheduledCampaigns()).toBeGreaterThanOrEqual(1);
    expect(await stats(e.id)).toBeGreaterThan(0);
    expect(await runScheduledCampaigns()).toBe(0);
  });
});

describe('automations', () => {
  it('stay off until enabled, need an address, then email each person once', async () => {
    const u = await member();
    const welcome = (await pool.query(`SELECT * FROM marketing_automations WHERE trigger = 'welcome'`)).rows[0];
    expect(welcome.enabled).toBe(false);
    expect(await runAutomations()).toBe(0);
    await settings(mk, '');
    const no = await call(mk, 'PUT', `/api/marketing/automations/${welcome.id}`, { name: welcome.name, delay_days: 0, subject: welcome.subject, body: welcome.body, enabled: true });
    expect(no.status).toBe(400);
    await settings(mk);
    expect((await call(mk, 'PUT', `/api/marketing/automations/${welcome.id}`, { name: welcome.name, delay_days: 0, subject: welcome.subject, body: welcome.body, enabled: true })).status).toBe(200);
    expect(await runAutomations()).toBeGreaterThanOrEqual(1);
    expect((await pool.query(`SELECT count(*)::int n FROM email_sends WHERE automation_id = $1 AND user_id = $2`, [welcome.id, u.id])).rows[0].n).toBe(1);
    expect(await runAutomations()).toBe(0);                                                                 // not again
    await pool.query('UPDATE marketing_automations SET enabled = false');
  });
});

describe('planning tools', () => {
  it('occasions, budget, expenses, social posts, assets and analytics behave and validate', async () => {
    const occ = (await call(mk, 'GET', '/api/marketing/occasions')).body;
    expect(occ.length).toBeGreaterThan(5);
    expect(occ.every((o: any) => o.next_end >= new Date().toISOString().slice(0, 10))).toBe(true);
    expect(occ.find((o: any) => o.slug === 'christmas').next_start).toMatch(/-12-01$/);
    const month = new Date().toISOString().slice(0, 7);
    expect((await call(mk, 'PUT', '/api/marketing/budget', { month, channel: 'email', budget_cents: 50000 })).status).toBe(200);
    const ex = await call(mk, 'POST', '/api/marketing/expenses', { on_date: `${month}-02`, channel: 'email', amount_cents: 12000, note: 'Template design' });
    expect(ex.status).toBe(201);
    let b = (await call(mk, 'GET', `/api/marketing/budget?month=${month}`)).body;
    const em = b.channels.find((c: any) => c.channel === 'email');
    expect(em.budget_cents).toBe(50000); expect(em.actual_cents).toBeGreaterThanOrEqual(12000);
    await call(mk, 'DELETE', `/api/marketing/expenses/${ex.body.id}`);
    expect((await call(mk, 'POST', '/api/marketing/expenses', { on_date: `${month}-02`, channel: 'tv', amount_cents: 1 })).status).toBe(400);
    expect((await call(mk, 'POST', '/api/marketing/social', { platform: 'instagram', caption: 'Hello', link: 'javascript:alert(1)' })).status).toBe(400);
    expect((await call(mk, 'POST', '/api/marketing/social', { platform: 'instagram', caption: 'Hello', link: '/deals' })).status).toBe(201);
    expect((await call(mk, 'POST', '/api/marketing/assets', { title: 'Hero', url: 'https://evil.example/x.png' })).status).toBe(400);
    const an = await call(mk, 'GET', '/api/marketing/analytics?days=30');
    expect(an.status).toBe(200); expect(Array.isArray(an.body.growth)).toBe(true);
    const camp = await call(mk, 'POST', '/api/marketing/campaigns', { name: 'Diwali push', budget_cents: 100000, status: 'active' });
    expect(camp.status).toBe(201);
    const res = await call(mk, 'GET', `/api/marketing/campaigns/${camp.body.id}/results`);
    expect(res.body.note).toMatch(/not proof/);
  });

  it('changing the marketing preference in the account is logged', async () => {
    const u = await newCustomer();
    const put = (opt: boolean) => call(u.cookie, 'PUT', '/api/account/profile', { full_name: 'Test Buyer', notify_email: true, marketing_opt_in: opt });
    await put(true); await put(true); await put(false);
    const log = (await pool.query('SELECT action FROM marketing_consent_log WHERE user_id = $1 ORDER BY id', [u.id])).rows.map((r) => r.action);
    expect(log).toEqual(['opt_in', 'opt_out']);
  });
});
