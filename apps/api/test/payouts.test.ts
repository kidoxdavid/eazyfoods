import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { getProvider } from '../src/payments/provider.js';

const K1 = 'demo-mama-ngozi-kitchen';
let chef: string, fin: string, admin: string, owner: string, vendorId: string;

beforeAll(async () => {
  await openAllStores();
  [chef, fin, admin, owner] = await Promise.all(['chef1@example.test', 'finance@example.test', 'admin@example.test', 'owner1@example.test'].map(async (e) => (await login(e)).cookie));
  vendorId = (await pool.query(`SELECT v.id FROM vendors v JOIN stores s ON s.vendor_id = v.id WHERE s.slug = $1`, [K1])).rows[0].id;
  await pool.query(`UPDATE vendors SET stripe_account_id = NULL, payout_status = 'none' WHERE id = $1`, [vendorId]);
  await pool.query(`UPDATE payouts SET status = 'paid' WHERE vendor_id = $1 AND status <> 'paid'`, [vendorId]);
});
afterAll(async () => { await pool.query(`UPDATE app_settings SET value = 'false' WHERE key = 'payout.auto_enabled'`); });

/** A paid kitchen order, delivered `days` ago. Returns its suborder id. */
async function delivered(days: number) {
  const offer = (await pool.query(`SELECT o.id FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE s.slug = $1 AND p.name ILIKE 'Jollof%'`, [K1])).rows[0].id;
  await pool.query('UPDATE store_offers SET stock_on_hand = 100, stock_reserved = 0, price_cents = 2500 WHERE id = $1', [offer]);
  const u = await newCustomer();
  await addToCart(u.cookie, offer, 2);
  const c = await checkout(u.cookie, u.addressId);
  const orderId = c.body.order.id;
  expect((await simulate(u.cookie, orderId, 'succeeded')).status).toBe(200);
  const sid = (await pool.query('SELECT id FROM suborders WHERE order_id = $1', [orderId])).rows[0].id;
  await pool.query(`UPDATE suborders SET status = 'delivered', completed_at = now() - make_interval(secs => $2) WHERE id = $1`, [sid, days * 86400]);
  return { sid, orderId };
}
const money = async () => (await call(chef, 'GET', '/api/vendor/payouts')).body;

describe('hold periods', () => {
  it('kitchens are paid sooner than stores, and the vendor sees when money becomes payable', async () => {
    await delivered(0.5);
    let b = (await money()).balance;
    expect(b.hold_days).toBe(1);
    expect(b.payable_now_cents).toBe(0); expect(b.in_hold_cents).toBeGreaterThan(0); expect(b.next_eligible_at).toBeTruthy();
    expect((await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`)).status).toBe(400);
    await pool.query(`UPDATE suborders SET completed_at = now() - interval '36 hours' WHERE vendor_id = $1 AND status = 'delivered' AND payout_id IS NULL`, [vendorId]);
    b = (await money()).balance;
    expect(b.payable_now_cents).toBeGreaterThan(0); expect(b.in_hold_cents).toBe(0);
  });
});

describe('connecting a payout account and getting paid', () => {
  it('only an approved owner can start; onboarding goes pending → enabled; payouts follow the account state', async () => {
    const stranger = (await login('owner2@example.test')).cookie;
    expect((await call(stranger, 'POST', '/api/dev/connect/acct_mock123456/complete')).body.ok).toBe(false);
    const applicant = await newCustomer();
    await call(applicant.cookie, 'POST', '/api/vendor/apply', { business_name: 'Pending Co', phone: '5875550222', store_name: 'Pending Kitchen', address_line: '1 A St', postal_code: 'T2A 0A1', kind: 'chef' });
    const early = await call(applicant.cookie, 'POST', '/api/vendor/payout-account/start');
    expect(early.status).toBe(409); expect(early.body.error).toBe('not_approved');

    expect((await money()).account.status).toBe('none');
    const start = await call(chef, 'POST', '/api/vendor/payout-account/start');
    expect(start.status).toBe(200);
    const acct = /mock_connect=(acct_mock[a-f0-9]+)/.exec(start.body.url)![1];
    expect((await money()).account.status).toBe('pending');
    expect((await call(chef, 'POST', '/api/vendor/payout-account/start')).body.url).toContain(acct);   // same account, fresh link

    // paying now is only a manual job: the account cannot receive transfers yet
    const p1 = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
    expect(p1.status).toBe(201); expect(p1.body.status).toBe('pending');

    expect((await call(chef, 'POST', `/api/dev/connect/${acct}/complete`)).body.ok).toBe(true);
    expect((await money()).account.status).toBe('enabled');
    const retried = await call(fin, 'POST', `/api/admin/payouts/${p1.body.id}/retry`);
    expect(retried.body.status).toBe('paid');
    const row = (await pool.query('SELECT status, provider_transfer_id, paid_at FROM payouts WHERE id = $1', [p1.body.id])).rows[0];
    expect(row.status).toBe('paid'); expect(row.provider_transfer_id).toMatch(/^mock_tr_/); expect(row.paid_at).toBeTruthy();
    expect((await call(fin, 'POST', `/api/admin/payouts/${p1.body.id}/retry`)).status).toBe(409);       // never paid twice
    expect((await pool.query(`SELECT count(*)::int n FROM ledger_entries WHERE txn_id IN (SELECT txn_id FROM ledger_entries WHERE kind = 'payout' AND vendor_id = $1)`, [vendorId])).rows[0].n).toBeGreaterThan(0);
    expect((await pool.query(`SELECT 1 FROM notifications WHERE template = 'payout_paid'`)).rowCount).toBeGreaterThan(0);
    const hist = (await money()).history;
    expect(hist[0].status).toBe('paid');
  });

  it('a failed transfer is recorded, can be retried, and settles once', async () => {
    await delivered(2);
    const owed0 = (await money()).balance.owed_cents;
    const provider = getProvider() as any; const real = provider.transfer;
    provider.transfer = async () => { throw new Error('insufficient funds (simulated)'); };
    let p;
    try { p = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`); } finally { provider.transfer = real; }
    expect(p.body.status).toBe('failed');
    expect((await money()).balance.owed_cents).toBe(owed0);                                                 // still owed: nothing was booked as paid
    const ok = await call(fin, 'POST', `/api/admin/payouts/${p.body.id}/retry`);
    expect(ok.body.status).toBe('paid');
    expect((await money()).balance.owed_cents).toBe(owed0 - p.body.amount_cents);                           // cleared once, by exactly the payout
  });

  it('permissions: only finance can create, retry or auto-run payouts', async () => {
    for (const [who, cookie] of [['vendor', owner], ['chef', chef]] as const) {
      expect((await call(cookie, 'POST', `/api/admin/payouts/vendor/${vendorId}`)).status, who).toBeGreaterThanOrEqual(401);
      expect((await call(cookie, 'POST', '/api/admin/payouts/run-auto')).status, who).toBeGreaterThanOrEqual(401);
    }
    expect((await call(admin, 'POST', '/api/admin/payouts/run-auto')).status).toBe(200);
    expect((await call(owner, 'POST', '/api/vendor/payout-account/start')).status).not.toBe(500);
  });
});

describe('automatic payouts', () => {
  it('pays enabled accounts above the minimum, once, and only when switched on', async () => {
    await delivered(2);
    expect((await call(fin, 'POST', '/api/admin/payouts/run-auto')).body.skipped).toBe('disabled');
    expect((await call(admin, 'PUT', '/api/admin/settings/payout.auto_enabled', { value: true })).status).toBe(200);
    expect((await call(admin, 'PUT', '/api/admin/settings/payout.auto_min_cents', { value: 100 })).status).toBe(200);
    const r = await call(fin, 'POST', '/api/admin/payouts/run-auto');
    expect(r.body.created).toBeGreaterThanOrEqual(1);
    const last = (await pool.query(`SELECT status, trigger, created_by FROM payouts WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 1`, [vendorId])).rows[0];
    expect(last).toEqual({ status: 'paid', trigger: 'auto', created_by: null });
    expect((await call(fin, 'POST', '/api/admin/payouts/run-auto')).body.created).toBe(0);                 // nothing left to pay
    // below the minimum: left alone
    await call(admin, 'PUT', '/api/admin/settings/payout.auto_min_cents', { value: 1000000 });
    await delivered(2);
    expect((await call(fin, 'POST', '/api/admin/payouts/run-auto')).body.created).toBe(0);
    expect((await call(admin, 'PUT', '/api/admin/settings/payout.auto_enabled', { value: false })).status).toBe(200);
    await call(admin, 'PUT', '/api/admin/settings/payout.auto_min_cents', { value: 2000 });
  });
});
