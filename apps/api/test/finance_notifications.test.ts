import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { notifyStaff } from '../src/services/notify.js';

const K1 = 'demo-mama-ngozi-kitchen';
let fin: string, admin: string, vendorId: string, started: Date;
const sent = async (template: string) => (await pool.query(`SELECT n.to_email, n.subject, n.body FROM notifications n WHERE n.template = $1 AND n.created_at >= $2 ORDER BY n.id`, [template, started])).rows;

beforeAll(async () => {
  await openAllStores();
  started = new Date();
  [fin, admin] = await Promise.all(['finance@example.test', 'admin@example.test'].map(async (e) => (await login(e)).cookie));
  vendorId = (await pool.query(`SELECT v.id FROM vendors v JOIN stores s ON s.vendor_id = v.id WHERE s.slug = $1`, [K1])).rows[0].id;
  await pool.query(`UPDATE vendors SET stripe_account_id = NULL, payout_status = 'none' WHERE id = $1`, [vendorId]);
});
afterAll(async () => {
  await pool.query(`UPDATE app_settings SET value = '0' WHERE key = 'payout.approval_threshold_cents'`);
  await pool.query(`UPDATE payout_holds SET released_at = now() WHERE released_at IS NULL`);
  const made = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
  if (made.status === 201) await call(fin, 'POST', `/api/admin/payouts/${made.body.id}/mark-paid`, { reference: 'TEST-CLEANUP' });
});

async function delivered() {
  const offer = (await pool.query(`SELECT o.id FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE s.slug = $1 AND p.name ILIKE 'Jollof%'`, [K1])).rows[0].id;
  await pool.query('UPDATE store_offers SET stock_on_hand = 100, stock_reserved = 0, price_cents = 2500 WHERE id = $1', [offer]);
  const u = await newCustomer(); await addToCart(u.cookie, offer, 2);
  const orderId = (await checkout(u.cookie, u.addressId)).body.order.id;
  await simulate(u.cookie, orderId, 'succeeded');
  await pool.query(`UPDATE suborders SET status = 'delivered', completed_at = now() - interval '3 days' WHERE order_id = $1`, [orderId]);
}

describe('staff alerts about money events', () => {
  it('a payout above the limit emails the approvers once; a pricing rule waiting for approval and a hold email them too', async () => {
    await delivered();
    await pool.query(`UPDATE app_settings SET value = '100' WHERE key = 'payout.approval_threshold_cents'`);
    const made = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
    expect(made.body.status).toBe('awaiting_approval');
    const mails = await sent('staff_payout_needs_approval');
    expect(mails.map((m) => m.to_email)).toContain('admin@example.test');                                  // approvers are told
    expect(mails.map((m) => m.to_email)).not.toContain('finance@example.test');                            // the author is not an approver
    expect(mails[0].subject).toMatch(/waiting for approval/);
    await call(admin, 'POST', `/api/admin/payouts/${made.body.id}/cancel`, { note: 'test' });
    await pool.query(`UPDATE app_settings SET value = '0' WHERE key = 'payout.approval_threshold_cents'`);

    const r = await call(fin, 'POST', '/api/admin/pricing/rules', { kind: 'service_fee', name: 'T: alert fee', params: { mode: 'fixed', fixed_cents: 50 } });
    await call(fin, 'POST', `/api/admin/pricing/rules/${r.body.id}/submit`);
    expect((await sent('staff_pricing_rule_pending')).map((m) => m.to_email)).toContain('admin@example.test');
    await call(admin, 'POST', `/api/admin/pricing/rules/${r.body.id}/reject`, { note: 'test only' });

    const hold = await call(fin, 'POST', '/api/admin/holds', { payee_type: 'vendor', vendor_id: vendorId, reason: 'Checking something' });
    expect((await sent('staff_payout_hold_placed')).map((m) => m.to_email)).toContain('admin@example.test');
    await call(admin, 'POST', `/api/admin/holds/${hold.body.id}/release`);
  });

  it('a repeated event never emails the same person twice, and each alert can be switched off', async () => {
    const key = `test:${Date.now()}`;
    const first = await notifyStaff(pool, { event: 'payout_failed', perm: 'payouts.manage', template: 'staff_payout_failed', vars: { amount: '1.00', payee: 'X', reason: 'r' }, key });
    const again = await notifyStaff(pool, { event: 'payout_failed', perm: 'payouts.manage', template: 'staff_payout_failed', vars: { amount: '1.00', payee: 'X', reason: 'r' }, key });
    expect(first).toBeGreaterThan(0); expect(again).toBe(0);
    const prev = (await pool.query(`SELECT value FROM app_settings WHERE key = 'finance.notifications'`)).rows[0].value;
    try {
      expect((await call(admin, 'PUT', '/api/admin/settings/finance.notifications', { value: { ...prev, payout_failed: false } })).status).toBe(200);
      expect(await notifyStaff(pool, { event: 'payout_failed', perm: 'payouts.manage', template: 'staff_payout_failed', vars: {}, key: `${key}:off` })).toBe(0);
    } finally { await call(admin, 'PUT', '/api/admin/settings/finance.notifications', { value: prev }); }
  });
});
