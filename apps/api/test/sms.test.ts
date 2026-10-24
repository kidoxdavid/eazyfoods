import { afterAll, describe, expect, it, vi } from 'vitest';
import { addToCart, call, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool, tx } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { processSms, queueSms, toE164 } from '../src/services/sms.js';
import { moveSuborder } from '../src/services/orders.js';

const HORN = 'demo-horn-spice-grocer';
afterAll(async () => { await pool.query('UPDATE feature_flags SET enabled = true'); config.SMS_TRANSPORT = 'log'; });

async function pickupOrder(u: { cookie: string; addressId: string }) {
  await openAllStores();
  await addToCart(u.cookie, await setOffer(HORN, 'berbere-spice-blend', 1500, 50), 3);
  const c = await call(u.cookie, 'POST', '/api/checkout', { address_id: null, method: 'pickup' }, { 'idempotency-key': crypto.randomUUID() });
  expect(c.status, JSON.stringify(c.body)).toBe(201);
  await simulate(u.cookie, c.body.order.id, 'succeeded');
  return (await pool.query('SELECT id FROM suborders WHERE order_id = $1', [c.body.order.id])).rows[0].id as string;
}
const toReady = async (sid: string) => { for (const to of ['accepted', 'preparing', 'ready']) await tx((c, after) => moveSuborder(c, after, sid, to, { userId: null, kind: 'vendor' }, null)); await new Promise((r) => setTimeout(r, 150)); };
const texts = async (userId: string) => (await pool.query('SELECT * FROM sms_outbox WHERE user_id = $1 ORDER BY id', [userId])).rows;

describe('text messages', () => {
  it('understands Canadian numbers and rejects the rest', () => {
    expect(toE164('(587) 555-0100')).toBe('+15875550100');
    expect(toE164('1-403-555-0199')).toBe('+14035550199');
    expect(toE164('+1 780 555 0123')).toBe('+17805550123');
    for (const bad of ['', null, '555-0100', '123-456-7890', '0115551234567', 'abc']) expect(toE164(bad as any)).toBeNull();
  });
  it('opting in needs a real number, is recorded, and can be withdrawn', async () => {
    const u = await newCustomer();
    const put = (b: object) => call(u.cookie, 'PUT', '/api/account/profile', { full_name: 'Test Buyer', notify_email: true, marketing_opt_in: false, ...b });
    expect((await put({ phone: '555', sms_opt_in: true })).status).toBe(400);
    expect((await put({ phone: '587 555 0100', sms_opt_in: true })).status).toBe(200);
    expect((await call(u.cookie, 'GET', '/api/account/profile')).body.sms_opt_in_at).toBeTruthy();
    expect((await put({ phone: '587 555 0100' })).status).toBe(200);                                    // not mentioning it leaves it alone
    expect((await call(u.cookie, 'GET', '/api/account/profile')).body.sms_opt_in_at).toBeTruthy();
    expect((await put({ phone: '587 555 0100', sms_opt_in: false })).status).toBe(200);
    expect((await call(u.cookie, 'GET', '/api/account/profile')).body.sms_opt_in_at).toBeNull();
    const log = (await pool.query(`SELECT action FROM marketing_consent_log WHERE user_id = $1 AND source LIKE 'sms:%' ORDER BY id`, [u.id])).rows.map((r) => r.action);
    expect(log).toEqual(['opt_in', 'opt_out']);
  });
  it('only opted-in customers are texted when their order is ready; consent is checked again when sending', async () => {
    const yes = await newCustomer(), no = await newCustomer();
    for (const u of [yes, no]) await call(u.cookie, 'PUT', '/api/account/profile', { full_name: 'Test Buyer', phone: '587 555 0100', notify_email: true, marketing_opt_in: false, sms_opt_in: u === yes });
    const [a, b] = [await pickupOrder(yes), await pickupOrder(no)];
    await toReady(a); await toReady(b);
    const mine = await texts(yes.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].body).toMatch(/ready for pickup/);
    expect(mine[0].body).toMatch(/Reply STOP/);
    expect(mine[0].to_phone).toBe('+15875550100');
    expect(await texts(no.id)).toHaveLength(0);
    // withdraws consent before it is sent: skipped, never sent
    await pool.query('UPDATE users SET sms_opt_in_at = NULL WHERE id = $1', [yes.id]);
    await processSms();
    expect((await texts(yes.id))[0].status).toBe('skipped');
  });
  it('log mode marks texts sent; Twilio mode posts the right request and retries on failure; the switch turns it all off', async () => {
    const u = await newCustomer();
    await call(u.cookie, 'PUT', '/api/account/profile', { full_name: 'T', phone: '587 555 0100', notify_email: true, marketing_opt_in: false, sms_opt_in: true });
    expect(await queueSms(pool, u.id, 'Hello one')).toBe(true);
    await processSms();
    expect((await texts(u.id))[0].status).toBe('sent');

    config.SMS_TRANSPORT = 'twilio'; Object.assign(config, { TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM: '+15875550000' });
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 201 })).mockResolvedValueOnce(new Response('bad', { status: 500 }));
    await queueSms(pool, u.id, 'Hello two'); await queueSms(pool, u.id, 'Hello three');
    expect(await processSms()).toBe(1);
    const [url, init] = f.mock.calls[0] as [string, any];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
    expect(init.headers.authorization).toBe(`Basic ${Buffer.from('ACtest:tok').toString('base64')}`);
    expect(String(init.body)).toContain('To=%2B15875550100');
    const rows = await texts(u.id);
    expect(rows[1].status).toBe('sent');
    expect(rows[2].status).toBe('pending'); expect(rows[2].attempts).toBe(1); expect(rows[2].error).toMatch(/Twilio 500/);   // will be retried
    f.mockRestore(); config.SMS_TRANSPORT = 'log';

    const admin = (await login('admin@example.test')).cookie;
    await call(admin, 'PUT', '/api/admin/control/features/shop.sms', { enabled: false });
    expect(await queueSms(pool, u.id, 'Hello four')).toBe(false);
    await call(admin, 'PUT', '/api/admin/control/features/shop.sms', { enabled: true });
  });
});
