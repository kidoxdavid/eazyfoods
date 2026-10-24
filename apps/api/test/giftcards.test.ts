import { describe, expect, it } from 'vitest';
import { addToCart, call, checkout, ledgerSum, login, newCustomer, openAllStores, setOffer, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { randomUUID } from 'node:crypto';

const S1 = 'demo-calgary-west-african-market';
const buy = (cookie: string | null, body: object, key = randomUUID()) => call(cookie, 'POST', '/api/gift-cards', body, { 'idempotency-key': key });
const sim = (cookie: string, id: string, outcome: 'succeeded' | 'failed') => call(cookie, 'POST', `/api/dev/gift-cards/${id}/simulate-payment`, { outcome });
const balance = async (cookie: string) => (await call(cookie, 'GET', '/api/me/credit')).body.balance_cents as number;

describe('gift cards you can buy', () => {
  it('the code appears only after payment, is emailed to the recipient, works once, and is booked as money owed (not revenue)', async () => {
    const buyer = await newCustomer(), friend = await newCustomer();
    expect((await buy(null, { amount_cents: 2500 })).status).toBe(401);
    expect((await buy(buyer.cookie, { amount_cents: 500 })).status).toBe(400);                  // $5 is below the minimum
    expect((await buy(buyer.cookie, { amount_cents: 99999 })).status).toBe(400);
    expect((await buy(buyer.cookie, { amount_cents: 2500, recipient_email: buyer.email })).status).toBe(400);
    const key = randomUUID();
    const r = await buy(buyer.cookie, { amount_cents: 2500, recipient_name: 'Ada', recipient_email: friend.email, message: 'Happy birthday!' }, key);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pending_payment');
    expect(r.body.code).toBeNull();                                                                // nothing to redeem yet
    expect((await buy(buyer.cookie, { amount_cents: 2500, recipient_name: 'Ada', recipient_email: friend.email }, key)).body.id).toBe(r.body.id);   // same key, same purchase
    expect((await call(friend.cookie, 'GET', `/api/gift-cards/${r.body.id}`)).status).toBe(404);   // only the buyer can look
    expect((await sim(buyer.cookie, r.body.id, 'succeeded')).status).toBe(200);
    const done = (await call(buyer.cookie, 'GET', `/api/gift-cards/${r.body.id}`)).body;
    expect(done.status).toBe('paid');
    expect(done.code).toMatch(/^EAZY-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await new Promise((x) => setTimeout(x, 200));
    const mails = (await pool.query(`SELECT to_email, template, body FROM notifications WHERE template IN ('gift_card_received','gift_card_receipt') AND body LIKE $1`, [`%${done.code}%`])).rows;
    expect(mails.map((m) => m.template).sort()).toEqual(['gift_card_receipt', 'gift_card_received']);
    expect(mails.find((m) => m.template === 'gift_card_received').to_email).toBe(friend.email);
    // the books: cash in, liability up, nothing recognised as expense
    const sums = (await pool.query(`SELECT account, sum(amount_cents)::int s FROM ledger_entries WHERE kind = 'gift_card_sold' AND ref_id = $1 GROUP BY account`, [r.body.id])).rows;
    expect(Object.fromEntries(sums.map((x) => [x.account, x.s]))).toEqual({ cash_provider: 2500, store_credit_liability: -2500 });
    // redeem: becomes credit with no new expense; a second use fails
    const before = (await pool.query(`SELECT count(*)::int n FROM ledger_entries WHERE account = 'credit_expense'`)).rows[0].n;
    expect((await call(friend.cookie, 'POST', '/api/me/credit/redeem', { code: done.code })).body.balance_cents).toBe(2500);
    expect((await pool.query(`SELECT count(*)::int n FROM ledger_entries WHERE account = 'credit_expense'`)).rows[0].n).toBe(before);
    expect((await call(buyer.cookie, 'POST', '/api/me/credit/redeem', { code: done.code })).status).toBe(400);
    expect(await balance(buyer.cookie)).toBe(0);
  });
  it('a declined payment never creates a code', async () => {
    const u = await newCustomer();
    const r = await buy(u.cookie, { amount_cents: 1000 });
    expect((await sim(u.cookie, r.body.id, 'failed')).status).toBe(200);
    const g = (await call(u.cookie, 'GET', `/api/gift-cards/${r.body.id}`)).body;
    expect(g.status).toBe('failed'); expect(g.code).toBeNull();
    expect((await pool.query(`SELECT count(*)::int n FROM gift_codes WHERE purchase_id = $1`, [r.body.id])).rows[0].n).toBe(0);
  });
  it('credit from a bought card pays for an order, and the whole ledger still balances', async () => {
    await openAllStores();
    const u = await newCustomer();
    const r = await buy(u.cookie, { amount_cents: 2000 }); await sim(u.cookie, r.body.id, 'succeeded');
    const code = (await call(u.cookie, 'GET', `/api/gift-cards/${r.body.id}`)).body.code;
    await call(u.cookie, 'POST', '/api/me/credit/redeem', { code });
    await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 30), 2);
    const c = await checkout(u.cookie, u.addressId, { use_credit: true });
    await simulate(u.cookie, c.body.order.id, 'succeeded');
    expect(await ledgerSum(c.body.order.id)).toBe(0);
    expect(await ledgerSum(c.body.order.id, 'store_credit_liability')).toBe(2000);
    expect((await pool.query('SELECT COALESCE(sum(amount_cents),0)::int s FROM ledger_entries')).rows[0].s).toBe(0);
  });
  it('can be switched off in the control centre', async () => {
    const admin = (await login('admin@example.test')).cookie, u = await newCustomer();
    await call(admin, 'PUT', '/api/admin/control/features/shop.gift_cards', { enabled: false });
    expect((await buy(u.cookie, { amount_cents: 1000 })).status).toBe(403);
    await call(admin, 'PUT', '/api/admin/control/features/shop.gift_cards', { enabled: true });
    await new Promise((x) => setTimeout(x, 100));
    expect((await buy(u.cookie, { amount_cents: 1000 })).status).toBe(201);
  });
});
