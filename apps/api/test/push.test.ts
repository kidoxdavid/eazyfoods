import { beforeAll, describe, expect, it } from 'vitest';
import { call, login, newCustomer, openAllStores } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { notify } from '../src/services/notify.js';
import { pushForTemplate, sentLog } from '../src/services/push.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);
const who = async (e: string) => (await login(e)).cookie;
const sub = (n: string) => ({ endpoint: `https://push.example.test/${n}-${Math.random().toString(16).slice(2)}`, keys: { p256dh: 'BPublicKeyForTests' + n, auth: 'auth' + n } });
const waitFor = async (f: () => boolean, ms = 4000) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 50)); };

describe('web push', () => {
  it('has a public key, needs a sign-in to subscribe, and unsubscribing removes the device', async () => {
    const k = await call(null, 'GET', '/api/push/key');
    expect(k.status).toBe(200); expect(k.body.key.length).toBeGreaterThan(40);
    expect((await call(null, 'POST', '/api/push/subscribe', { subscription: sub('x'), area: 'shop' })).status).toBe(401);
    const u = await newCustomer(); const s = sub('cust');
    expect((await call(u.cookie, 'POST', '/api/push/subscribe', { subscription: s, area: 'shop' })).status).toBe(204);
    expect((await call(u.cookie, 'POST', '/api/push/subscribe', { subscription: { endpoint: 'not a url', keys: { p256dh: 'a', auth: 'b' } } })).status).toBe(400);
    sentLog.length = 0;
    expect((await call(u.cookie, 'POST', '/api/push/test', { area: 'shop' })).body.sent).toBe(1);
    expect(sentLog.some((x) => x.userId === u.id && x.msg.title.includes('notifications are on'))).toBe(true);
    expect((await call(u.cookie, 'POST', '/api/push/unsubscribe', { endpoint: s.endpoint })).status).toBe(204);
    expect((await call(u.cookie, 'POST', '/api/push/test', { area: 'shop' })).body.sent).toBe(0);
  });

  it('an order update reaches the customer’s phone; sign-in and reset links never do', async () => {
    const u = await newCustomer();
    await call(u.cookie, 'POST', '/api/push/subscribe', { subscription: sub('c2'), area: 'shop' });
    sentLog.length = 0;
    await notify(pool, { userId: u.id, email: u.email, template: 'order_status', vars: { order_number: 'EZ-1', status: 'out for delivery' } });
    await notify(pool, { userId: u.id, email: u.email, template: 'password_reset', vars: { link: 'https://x/reset?token=secret' } });
    await waitFor(() => sentLog.length > 0); await new Promise((r) => setTimeout(r, 500));
    expect(sentLog.filter((x) => x.userId === u.id).length).toBe(1);
    expect(sentLog[0].area).toBe('shop'); expect(sentLog[0].msg.url).toBe('/orders');
    expect(JSON.stringify(sentLog)).not.toContain('secret');
  });

  it('a new ad pings marketing and admin (each to their own page); approving it pings the vendor; devices only get alerts for the app they enabled', async () => {
    const owner = await who('owner1@example.test'), admin = await who('admin@example.test'), mkt = await who('marketing@example.test');
    const ids = Object.fromEntries(await Promise.all([['owner1@example.test'], ['admin@example.test'], ['marketing@example.test']].map(async ([e]) => [e, (await pool.query('SELECT id FROM users WHERE email=$1', [e])).rows[0].id])));
    await call(owner, 'POST', '/api/push/subscribe', { subscription: sub('v'), area: 'vendor' });
    await call(admin, 'POST', '/api/push/subscribe', { subscription: sub('a'), area: 'admin' });
    await call(mkt, 'POST', '/api/push/subscribe', { subscription: sub('m'), area: 'marketing' });
    await call(owner, 'POST', '/api/push/subscribe', { subscription: sub('vshop'), area: 'shop' });   // the owner's shopping phone: must not get store alerts
    const sid = (await pool.query('SELECT id FROM stores WHERE slug=$1', [S1])).rows[0].id;
    sentLog.length = 0;
    const ad = await call(owner, 'POST', '/api/vendor/ads', { store_id: sid, placement: 'home_banner', title: 'Push test ad', cpc_cents: 50, budget_cents: 2000, starts_at: new Date(Date.now() - 1000), ends_at: new Date(Date.now() + 864e5) });
    expect(ad.status).toBe(201);
    await waitFor(() => sentLog.filter((x) => x.msg.tag === 'ad-pending').length >= 2);
    const pend = sentLog.filter((x) => x.msg.tag === 'ad-pending');
    expect(pend.find((x) => x.userId === ids['marketing@example.test'])?.msg.url).toBe('/marketing/ads');
    expect(pend.find((x) => x.userId === ids['admin@example.test'])?.msg.url).toBe('/admin/ads');
    sentLog.length = 0;
    expect((await call(admin, 'PATCH', `/api/admin/ads/${ad.body.id}`, { status: 'approved' })).status).toBe(200);
    await waitFor(() => sentLog.length > 0);
    expect(sentLog.every((x) => x.area === 'vendor' && x.userId === ids['owner1@example.test'])).toBe(true);
    expect(sentLog[0].msg.title).toBe('Your ad is approved');
    await pool.query('DELETE FROM ad_campaigns WHERE id = $1', [ad.body.id]);
  });
});

describe('which emails also become notifications, and where they go', () => {
  it('store alerts go to the store app, money alerts to staff apps, order updates to the shop app, secrets nowhere', () => {
    expect(pushForTemplate('vendor_new_order', 'New order EZ-1', 'You have a new order.')?.areas).toEqual(['vendor', 'kitchen']);
    expect(pushForTemplate('vendor_new_order', 'New order EZ-1', 'x')?.msg.url).toBe('/vendor/orders');
    expect(pushForTemplate('order_message_store', 'Message', 'x')?.areas).toEqual(['vendor', 'kitchen']);
    expect(pushForTemplate('staff_payout_failed', 'Payout failed', 'x')?.areas).toEqual(['admin', 'marketing', 'finance']);
    expect(pushForTemplate('order_confirmed', 'Order confirmed', 'x')?.areas).toEqual(['shop']);
    for (const t of ['email_verify', 'password_reset', 'gift_card_receipt', 'gift_card_received']) expect(pushForTemplate(t, 's', 'b')).toBeNull();
  });
});
