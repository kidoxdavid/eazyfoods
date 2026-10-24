import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, app, call, checkout, ledgerSum, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool, tx } from '../src/db/pool.js';
import { awardOrderRewards } from '../src/services/credit.js';
import { runListReminders } from '../src/services/alerts.js';
import { runAutomations } from '../src/services/marketing.js';

const S1 = 'demo-calgary-west-african-market';
let mk: string;
beforeAll(async () => { await openAllStores(); mk = (await login('marketing@example.test')).cookie; });
afterAll(async () => {
  await pool.query(`UPDATE app_settings SET value = '0' WHERE key IN ('rewards.cashback_bps','referral.reward_cents')`);
  await pool.query(`UPDATE marketing_automations SET enabled = false`);
});

const grant = (email: string, cents: number) => call(mk, 'POST', '/api/marketing/credit/grant', { email, amount_cents: cents, note: 'test goodwill' });
const balance = async (cookie: string) => (await call(cookie, 'GET', '/api/me/credit')).body.balance_cents as number;
async function basket(u: { cookie: string }, qty = 2) { await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 80), qty); }

describe('gift codes and goodwill credit', () => {
  it('a code can be used once, by one person; credit is a balanced liability', async () => {
    const { body } = await call(mk, 'POST', '/api/marketing/gift-codes', { amount_cents: 2500, note: 'launch' });
    const code = body.codes[0] as string;
    expect(code).toMatch(/^EAZY-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const a = await newCustomer(), b = await newCustomer();
    expect((await call(a.cookie, 'POST', '/api/me/credit/redeem', { code: 'EAZY-NOPE-NOPE' })).status).toBe(400);
    const ok = await call(a.cookie, 'POST', '/api/me/credit/redeem', { code: code.toLowerCase() });
    expect(ok.status).toBe(200);
    expect(ok.body.balance_cents).toBe(2500);
    expect((await call(b.cookie, 'POST', '/api/me/credit/redeem', { code })).status).toBe(400);
    expect(await balance(b.cookie)).toBe(0);
    const sums = (await pool.query(`SELECT COALESCE(sum(amount_cents),0)::int AS s FROM ledger_entries WHERE kind = 'credit_grant' AND ref_id IN (SELECT id::text FROM credit_entries WHERE user_id = $1)`, [a.id])).rows[0].s;
    expect(sums).toBe(0);
    expect((await call(null, 'POST', '/api/me/credit/redeem', { code })).status).toBe(401);
    const cust = (await login('customer@example.test')).cookie;
    expect([401, 403]).toContain((await call(cust, 'POST', '/api/marketing/gift-codes', { amount_cents: 500 })).status);
  });
  it('goodwill credit needs a reason, a real customer, and not your own account', async () => {
    const u = await newCustomer();
    expect((await grant(u.email, 1000)).status).toBe(200);
    expect(await balance(u.cookie)).toBe(1000);
    expect((await grant('nobody@example.test', 1000)).status).toBe(404);
    expect((await grant('marketing@example.test', 1000)).status).toBe(409);
    expect((await call(mk, 'POST', '/api/marketing/credit/grant', { email: u.email, amount_cents: 1000, note: 'x' })).status).toBe(400);
  });
});

describe('paying with credit', () => {
  it('reduces the card payment, books a balanced ledger, and comes back when the store rejects the order', async () => {
    const u = await newCustomer(); await grant(u.email, 1500); await basket(u);
    const q = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', use_credit: true })).body;
    expect(q.credit_available_cents).toBe(1500);
    expect(q.credit_applied_cents).toBe(1500);
    expect(q.pay_cents).toBe(q.total_cents - 1500);
    const c = await checkout(u.cookie, u.addressId, { use_credit: true });
    expect(c.status).toBe(201);
    const id = c.body.order.id as string;
    expect(c.body.order.pay_cents).toBe(q.total_cents - 1500);
    expect((await pool.query('SELECT amount_cents FROM payments WHERE order_id = $1', [id])).rows[0].amount_cents).toBe(q.total_cents - 1500);
    expect(await balance(u.cookie)).toBe(0);                                   // reserved while unpaid
    await simulate(u.cookie, id, 'succeeded');
    expect(await ledgerSum(id)).toBe(0);
    expect(await ledgerSum(id, 'cash_provider')).toBe(q.total_cents - 1500);
    expect(await ledgerSum(id, 'store_credit_liability')).toBe(1500);
    // the store rejects: card gets its share back, the credit part returns as credit
    const owner = (await login('owner1@example.test')).cookie;
    const sid = (await pool.query('SELECT id FROM suborders WHERE order_id = $1', [id])).rows[0].id;
    expect((await call(owner, 'POST', `/api/vendor/suborders/${sid}/reject`, { reason: 'Closed today' })).status).toBe(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(await balance(u.cookie)).toBe(1500);
    expect(await ledgerSum(id)).toBe(0);
    expect(await ledgerSum(id, 'cash_provider')).toBe(0);
    expect(await ledgerSum(id, 'store_credit_liability')).toBe(0);
    const r = (await pool.query(`SELECT amount_cents, credit_cents FROM refunds WHERE order_id = $1`, [id])).rows[0];
    expect(r.amount_cents).toBe(q.total_cents);
    expect(r.credit_cents).toBe(1500);
  });
  it('is never spent twice, never covers the last 50 cents, and is released when payment fails', async () => {
    const u = await newCustomer(); await grant(u.email, 20000); await basket(u, 2);
    const q = (await call(u.cookie, 'POST', '/api/checkout/quote', { address_id: u.addressId, method: 'delivery', use_credit: true })).body;
    expect(q.credit_applied_cents).toBe(q.total_cents - 50);
    expect(q.pay_cents).toBe(50);
    const c = await checkout(u.cookie, u.addressId, { use_credit: true });
    expect(await balance(u.cookie)).toBe(20000 - (q.total_cents - 50));
    await simulate(u.cookie, c.body.order.id, 'failed');
    expect(await balance(u.cookie)).toBe(20000);                                // released
    expect((await pool.query('SELECT credit_released FROM orders WHERE id = $1', [c.body.order.id])).rows[0].credit_released).toBe(true);
    // two simultaneous checkouts with the same small balance cannot both use it
    const v = await newCustomer(); await grant(v.email, 1000); await basket(v, 2);
    const [x, y] = await Promise.all([checkout(v.cookie, v.addressId, { use_credit: true }), checkout(v.cookie, v.addressId, { use_credit: true })]);
    expect([x.status, y.status].filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);
    expect(await balance(v.cookie)).toBeGreaterThanOrEqual(0);
    const used = (await pool.query(`SELECT COALESCE(sum(credit_cents),0)::int AS s FROM orders WHERE user_id = $1`, [v.id])).rows[0].s;
    expect(used).toBeLessThanOrEqual(1000);
  });
  it('without opting in, credit is left alone', async () => {
    const u = await newCustomer(); await grant(u.email, 800); await basket(u);
    const c = await checkout(u.cookie, u.addressId);
    expect((await pool.query('SELECT credit_cents FROM orders WHERE id = $1', [c.body.order.id])).rows[0].credit_cents).toBe(0);
    expect(await balance(u.cookie)).toBe(800);
  });
});

describe('cashback and referrals (off until the team turns them on)', () => {
  async function delivered(u: { cookie: string; addressId: string }, qty = 2) {
    await basket(u, qty);
    const c = await checkout(u.cookie, u.addressId); await simulate(u.cookie, c.body.order.id, 'succeeded');
    await pool.query(`UPDATE suborders SET status = 'delivered', completed_at = now() WHERE order_id = $1`, [c.body.order.id]);
    await pool.query(`UPDATE orders SET status = 'completed' WHERE id = $1`, [c.body.order.id]);
    return c.body.order.id as string;
  }
  const award = (id: string) => tx((c) => awardOrderRewards(c, id));

  it('pays nothing while the programmes are off', async () => {
    const u = await newCustomer(); const id = await delivered(u); await award(id);
    expect(await balance(u.cookie)).toBe(0);
  });
  it('pays cashback once per order, and a referral reward once, to both people, only after a real first order', async () => {
    expect((await call(mk, 'PUT', '/api/marketing/rewards', { cashback_bps: 100, referral_reward_cents: 500, referral_min_order_cents: 3000, referral_max_per_user: 1 })).status).toBe(200);
    const a = await newCustomer();
    const info = (await call(a.cookie, 'GET', '/api/me/credit')).body;
    expect(info.referral.code).toMatch(/^[A-Z2-9]{7}$/);
    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: `f${Date.now()}@example.test`, password: 'a-long-password', full_name: 'Friend', ref: info.referral.code.toLowerCase() } });
    const fid = reg.json().id as string, fcookie = String(reg.headers['set-cookie']).split(';')[0];
    const addr = (await call(fcookie, 'POST', '/api/addresses', { recipient_name: 'F', phone: '5875550100', line1: '1 St', city: 'Calgary', postal_code: 'T2A0A1' })).body.id;
    // email not verified yet: no reward
    const o1 = await delivered({ cookie: fcookie, addressId: addr }, 2);
    await award(o1);
    expect(await balance(a.cookie)).toBe(0);
    expect((await pool.query('SELECT rewarded_at FROM referrals WHERE referred_user = $1', [fid])).rows[0].rewarded_at).toBeNull();
    // a later first... the order above was their first completed order, so verifying now does not qualify retroactively
    await pool.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [fid]);
    const o2 = await delivered({ cookie: fcookie, addressId: addr }, 2);
    await award(o2); await award(o2);                                                         // idempotent
    expect(await balance(a.cookie)).toBe(0);
    // a fresh friend, verified, with a qualifying first order
    const reg2 = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: `g${Date.now()}@example.test`, password: 'a-long-password', full_name: 'Friend Two', ref: info.referral.code } });
    const f2 = String(reg2.headers['set-cookie']).split(';')[0];
    await pool.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [reg2.json().id]);
    const addr2 = (await call(f2, 'POST', '/api/addresses', { recipient_name: 'G', phone: '5875550100', line1: '1 St', city: 'Calgary', postal_code: 'T2A0A1' })).body.id;
    const o3 = await delivered({ cookie: f2, addressId: addr2 }, 2);
    await award(o3); await award(o3);
    expect(await balance(a.cookie)).toBe(500);                                                // referrer, once
    const fb = await balance(f2);
    expect(fb).toBeGreaterThanOrEqual(500);                                                   // friend: welcome credit + 1% cashback
    expect(fb).toBeLessThanOrEqual(500 + 100);
    expect((await call(a.cookie, 'GET', '/api/me/credit')).body.referral.rewarded).toBe(1);
    // cashback is net of refunds: nothing for an order that was entirely refunded
    const u = await newCustomer(); const o4 = await delivered(u, 2);
    await pool.query(`INSERT INTO refunds(order_id, suborder_id, payment_id, reason, lines, merchandise_cents, amount_cents, status, idempotency_key)
      SELECT s.order_id, s.id, (SELECT id FROM payments WHERE order_id = s.order_id LIMIT 1), 'test', '[]', s.subtotal_cents, s.subtotal_cents, 'succeeded', gen_random_uuid()::text FROM suborders s WHERE s.order_id = $1`, [o4]);
    await award(o4);
    expect(await balance(u.cookie)).toBe(0);
  });
});

describe('list reminders and abandoned baskets', () => {
  it('a restock reminder is sent when due, then rebooked; stopping it removes it', async () => {
    const u = await newCustomer();
    const l = (await call(u.cookie, 'POST', '/api/lists', { name: 'Monthly shop' })).body;
    await call(u.cookie, 'PUT', `/api/lists/${l.id}/items`, { slug: 'garri-white', quantity: 2 });
    expect((await call(u.cookie, 'PUT', `/api/lists/${l.id}/reminder`, { every_days: 3 })).status).toBe(400);
    expect((await call(u.cookie, 'PUT', `/api/lists/${l.id}/reminder`, { every_days: 14 })).body.reminder.every_days).toBe(14);
    expect((await call(u.cookie, 'GET', `/api/lists/${l.id}`)).body.reminder.every_days).toBe(14);
    const other = await newCustomer();
    expect((await call(other.cookie, 'PUT', `/api/lists/${l.id}/reminder`, { every_days: 14 })).status).toBe(404);
    await pool.query(`UPDATE list_reminders SET next_at = now() - interval '1 minute' WHERE list_id = $1`, [l.id]);
    const before = (await pool.query(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND template = 'list_reminder'`, [u.id])).rows[0].n;
    await runListReminders();
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND template = 'list_reminder'`, [u.id])).rows[0].n).toBe(before + 1);
    await runListReminders();                                                                  // not due again
    expect((await pool.query(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND template = 'list_reminder'`, [u.id])).rows[0].n).toBe(before + 1);
    expect((await call(u.cookie, 'PUT', `/api/lists/${l.id}/reminder`, { every_days: null })).body.reminder).toBeNull();
  });
  it('the abandoned-basket email goes only to opted-in customers with items left behind, once a week', async () => {
    await call(mk, 'PUT', '/api/marketing/settings', { sender_name: 'EAZyfoods Test', postal_address: '1 Test Street NE, Calgary, AB T2A 0A0', max_send_per_campaign: 5000 });
    const mkUser = async (optIn: boolean) => {
      const u = await newCustomer();
      await pool.query(`UPDATE users SET marketing_opt_in_at = $2, email_verified_at = now(), notify_email = true WHERE id = $1`, [u.id, optIn ? new Date() : null]);
      await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 80), 1);
      await pool.query(`UPDATE carts SET updated_at = now() - interval '5 hours' WHERE user_id = $1`, [u.id]);
      return u;
    };
    const yes = await mkUser(true), no = await mkUser(false);
    await pool.query(`UPDATE marketing_automations SET enabled = (trigger = 'abandoned_basket')`);
    await runAutomations(500);
    const sent = async (id: string) => (await pool.query(`SELECT count(*)::int n FROM email_sends WHERE user_id = $1`, [id])).rows[0].n;
    expect(await sent(yes.id)).toBe(1);
    expect(await sent(no.id)).toBe(0);
    await runAutomations(500);
    expect(await sent(yes.id)).toBe(1);
  });
});

describe('store comparison and help', () => {
  it('compares delivery to a postal area and rejects nonsense', async () => {
    const r = (await call(null, 'GET', '/api/stores-compare?postal=T2A%200A1')).body;
    expect(r.serviceable).toBe(true);
    expect(r.stores.length).toBeGreaterThan(0);
    expect(r.stores[0]).toHaveProperty('is_open');
    expect(r.fee_cents).toBeGreaterThan(0);
    expect((await call(null, 'GET', '/api/stores-compare?postal=ZZZ')).status).toBe(400);
    expect((await call(null, 'GET', '/api/stores-compare?postal=H3A')).body.serviceable).toBe(false);
  });
  it('the help centre page exists and a signed-in customer can contact support', async () => {
    expect((await call(null, 'GET', '/api/pages/help-centre')).status).toBe(200);
    const u = await newCustomer();
    expect((await call(u.cookie, 'POST', '/api/support/contact', { subject: 'Change my address', message: 'Please update my address.' })).status).toBe(201);
    expect((await call(u.cookie, 'POST', '/api/support/contact', { subject: 'x', message: 'short' })).status).toBe(400);
    expect((await call(null, 'POST', '/api/support/contact', { subject: 'Change my address', message: 'Please update my address.' })).status).toBe(401);
  });
});
