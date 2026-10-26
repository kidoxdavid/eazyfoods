import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, simulate } from './helpers.js';
import { pool } from '../src/db/pool.js';

const K1 = 'demo-mama-ngozi-kitchen';
let chef: string, fin: string, admin: string, support: string, vendorId: string;

beforeAll(async () => {
  await openAllStores();
  [chef, fin, admin, support] = await Promise.all(['chef1@example.test', 'finance@example.test', 'admin@example.test', 'support@example.test'].map(async (e) => (await login(e)).cookie));
  vendorId = (await pool.query(`SELECT v.id FROM vendors v JOIN stores s ON s.vendor_id = v.id WHERE s.slug = $1`, [K1])).rows[0].id;
  await pool.query(`UPDATE vendors SET stripe_account_id = NULL, payout_status = 'none' WHERE id = $1`, [vendorId]);   // pay by bank transfer so nothing is sent anywhere
  await pool.query(`UPDATE payouts SET status = 'paid' WHERE vendor_id = $1 AND status NOT IN ('paid','cancelled')`, [vendorId]);
});
afterAll(async () => {
  await pool.query(`UPDATE app_settings SET value = '0' WHERE key = 'payout.approval_threshold_cents'`);
  await pool.query(`UPDATE payout_holds SET released_at = now() WHERE released_at IS NULL`);
  // Leave nothing payable behind for other tests: pay out what these tests delivered, through the normal flow so the ledger stays consistent.
  const made = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
  if (made.status === 201) await call(fin, 'POST', `/api/admin/payouts/${made.body.id}/mark-paid`, { reference: 'TEST-CLEANUP' });
});

async function delivered() {
  const offer = (await pool.query(`SELECT o.id FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE s.slug = $1 AND p.name ILIKE 'Jollof%'`, [K1])).rows[0].id;
  await pool.query('UPDATE store_offers SET stock_on_hand = 100, stock_reserved = 0, price_cents = 2500 WHERE id = $1', [offer]);
  const u = await newCustomer(); await addToCart(u.cookie, offer, 2);
  const orderId = (await checkout(u.cookie, u.addressId)).body.order.id;
  await simulate(u.cookie, orderId, 'succeeded');
  const sid = (await pool.query('SELECT id FROM suborders WHERE order_id = $1', [orderId])).rows[0].id;
  await pool.query(`UPDATE suborders SET status = 'delivered', completed_at = now() - interval '3 days' WHERE id = $1`, [sid]);
  return { sid, orderId };
}

describe('settlement preview, approval and holds', () => {
  it('the preview lists what is payable and why; a hold blocks the payout until an approver releases it', async () => {
    const { orderId } = await delivered();
    const pv = (await call(fin, 'GET', `/api/admin/settlements/vendors/${vendorId}/preview`)).body;
    expect(pv.eligible_lines.length).toBeGreaterThan(0);
    expect(pv.net_payable_cents).toBe(pv.eligible_lines.reduce((a: number, l: any) => a + l.net_cents, 0));
    expect(pv.gross_cents - pv.commission_cents).toBe(pv.net_payable_cents);                     // net = merchandise - commission (no refunds here)
    expect(pv.discrepancy_cents).toBe(0);                                                         // ledger and orders agree
    expect(pv.method).toBe('manual_bank_transfer');
    expect([401, 403]).toContain((await call(support, 'GET', `/api/admin/settlements/vendors/${vendorId}/preview`)).status);
    const payees = (await call(fin, 'GET', '/api/admin/settlements/payees')).body;
    expect(payees.vendors.some((v: any) => v.id === vendorId)).toBe(true); expect(Array.isArray(payees.drivers)).toBe(true);
    expect([401, 403]).toContain((await call(support, 'GET', '/api/admin/settlements/payees')).status);

    const hold = await call(fin, 'POST', '/api/admin/holds', { payee_type: 'vendor', vendor_id: vendorId, reason: 'Checking a complaint' });
    expect(hold.status).toBe(201);
    const blocked = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
    expect(blocked.status).toBe(409); expect(blocked.body.error).toBe('payout_on_hold');
    expect((await call(fin, 'POST', `/api/admin/holds/${hold.body.id}/release`)).status).toBe(403);       // finance can place a hold, only an approver releases it
    expect((await call(admin, 'POST', `/api/admin/holds/${hold.body.id}/release`)).status).toBe(200);
    expect(orderId).toBeTruthy();
  });

  it('above the threshold a payout waits for a different person; cancelling returns the orders to unpaid', async () => {
    await delivered();
    await pool.query(`UPDATE app_settings SET value = '100' WHERE key = 'payout.approval_threshold_cents'`);
    const made = await call(fin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
    expect(made.status).toBe(201); expect(made.body.status).toBe('awaiting_approval');
    const id = made.body.id;
    expect((await pool.query(`SELECT status FROM payouts WHERE id = $1`, [id])).rows[0].status).toBe('awaiting_approval');
    expect((await call(fin, 'POST', `/api/admin/payouts/${id}/approve`)).status).toBe(403);       // finance cannot approve
    expect((await call(fin, 'POST', `/api/admin/payouts/${id}/mark-paid`, { reference: 'X1' })).status).toBe(409);   // and cannot pay it around the approval
    const q = (await call(fin, 'GET', '/api/admin/settlements/queue')).body;
    expect(q.find((p: any) => p.id === id).status).toBe('awaiting_approval');
    // cancel: back to unpaid
    expect((await call(admin, 'POST', `/api/admin/payouts/${id}/cancel`, { note: 'Wrong period' })).status).toBe(200);
    expect((await pool.query(`SELECT count(*)::int n FROM suborders WHERE payout_id = $1`, [id])).rows[0].n).toBe(0);
    // again, then the author (an admin) cannot approve their own
    const again = await call(admin, 'POST', `/api/admin/payouts/vendor/${vendorId}`);
    expect(again.body.status).toBe('awaiting_approval');
    const self = await call(admin, 'POST', `/api/admin/payouts/${again.body.id}/approve`);
    expect(self.status).toBe(409); expect(self.body.error).toBe('second_person_required');
    // an approval by someone else (simulate: made by finance, approved by admin)
    await pool.query(`UPDATE payouts SET created_by = (SELECT id FROM users WHERE email = 'finance@example.test') WHERE id = $1`, [again.body.id]);
    const ok = await call(admin, 'POST', `/api/admin/payouts/${again.body.id}/approve`);
    expect(ok.status).toBe(200); expect(ok.body.status).toBe('pending');                           // bank transfer: now waits to be marked paid
    expect((await call(fin, 'POST', `/api/admin/payouts/${again.body.id}/mark-paid`, { reference: 'BANK-1' })).status).toBe(200);
    await pool.query(`UPDATE app_settings SET value = '0' WHERE key = 'payout.approval_threshold_cents'`);
  });
});

describe('statements', () => {
  it('a vendor sees only their own statement and it adds up; a driver statement separates tips', async () => {
    const st = (await call(chef, 'GET', '/api/vendor/statement')).body;
    expect(st.lines.length).toBeGreaterThan(0);
    expect(st.totals.net_cents).toBe(st.totals.merchandise_cents - st.totals.commission_cents + st.totals.refund_adjustment_cents);
    for (const l of st.lines) expect(l.net_cents).toBe(l.merchandise_cents - l.commission_cents + l.refund_adjustment_cents);
    const other = (await call((await login('owner2@example.test')).cookie, 'GET', '/api/vendor/statement')).body;
    const mine = new Set(st.lines.map((l: any) => l.id)); expect(other.lines.some((l: any) => mine.has(l.id))).toBe(false);
    const adminView = (await call(fin, 'GET', `/api/admin/statements/vendor/${vendorId}`)).body;
    expect(adminView.totals.net_cents).toBe(st.totals.net_cents);
    const drv = (await call((await login('driver@example.test')).cookie, 'GET', '/api/driver/statement')).body;
    expect(drv.totals.total_cents).toBe(drv.totals.base_cents + drv.totals.tips_cents);
    expect([401, 403]).toContain((await call((await newCustomer()).cookie, 'GET', '/api/vendor/statement')).status);
  });
});

describe('reconciliation', () => {
  it('a healthy ledger has no differences; breaking the books is detected, never auto-fixed, and finance can annotate it', async () => {
    // Other tests insert rows straight into the database, so compare with what is already there rather than assuming an empty list.
    const clean = (await call(fin, 'GET', '/api/admin/reconciliation')).body;
    const baseline = new Set(clean.exceptions.map((e: any) => e.key));
    expect(clean.exceptions.every((e: any) => e.key && e.title && e.detail)).toBe(true);
    // a payment that succeeded without a ledger entry (the kind of fault a lost webhook could leave)
    const { orderId } = await delivered();
    const pay = (await pool.query(`SELECT id FROM payments WHERE order_id = $1`, [orderId])).rows[0].id;
    await pool.query(`ALTER TABLE ledger_entries DISABLE TRIGGER ledger_append_only`);
    const saved = (await pool.query(`SELECT * FROM ledger_entries WHERE kind = 'payment_captured' AND ref_id = $1`, [pay])).rows;
    await pool.query(`DELETE FROM ledger_entries WHERE kind = 'payment_captured' AND ref_id = $1`, [pay]);
    try {
      const bad = (await call(fin, 'GET', '/api/admin/reconciliation')).body;
      const hit = bad.exceptions.find((e: any) => e.key === `payment_no_ledger:${pay}`);
      expect(hit).toMatchObject({ severity: 'high', status: 'open' });
      const after = (await pool.query(`SELECT count(*)::int n FROM ledger_entries WHERE ref_id = $1`, [pay])).rows[0].n;
      expect(after).toBe(0);                                                                        // reconciliation did not invent a balancing entry
      expect((await call(support, 'POST', '/api/admin/reconciliation/notes', { key: hit.key, action: 'acknowledged', note: 'Looking into it' })).status).toBe(403);
      expect((await call(fin, 'POST', '/api/admin/reconciliation/notes', { key: hit.key, action: 'acknowledged', note: 'Looking into it' })).status).toBe(201);
      expect((await call(fin, 'GET', '/api/admin/reconciliation')).body.exceptions.find((e: any) => e.key === hit.key).status).toBe('acknowledged');
      const csv = await call(fin, 'GET', '/api/admin/reconciliation/movements.csv');
      expect(csv.status).toBe(200); expect(String(csv.body)).toMatch(/^date,type,provider/); expect(String(csv.body)).toMatch(/,false\s*$/m);   // the unbooked payment shows as not in the ledger
    } finally {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        for (const r of saved) await c.query(`INSERT INTO ledger_entries(id, txn_id, account, vendor_id, driver_id, order_id, suborder_id, amount_cents, kind, ref_type, ref_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [r.id, r.txn_id, r.account, r.vendor_id, r.driver_id, r.order_id, r.suborder_id, r.amount_cents, r.kind, r.ref_type, r.ref_id, r.created_at]);
        await c.query('COMMIT');
      } finally { c.release(); }
      await pool.query(`ALTER TABLE ledger_entries ENABLE TRIGGER ledger_append_only`);
    }
    expect((await call(fin, 'GET', '/api/admin/reconciliation')).body.exceptions.filter((e: any) => !baseline.has(e.key)).map((e: any) => e.key)).toEqual([]);   // restored: nothing new
  });
});
