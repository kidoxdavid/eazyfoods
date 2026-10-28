import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { bad, conflict } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { holdDays, settlePayout, vendorBalance } from './payouts.js';
import { notifyStaff } from './notify.js';

/**
 * Statements, settlement previews, holds, approvals and reconciliation.
 * Everything here reads the same source records the ledger is built from; it never writes a balancing entry. A discrepancy is shown to a person, who decides.
 */

const NET = `-(SELECT COALESCE(sum(l.amount_cents),0) FROM ledger_entries l WHERE l.suborder_id = s.id AND l.account = 'vendor_payable')::int`;
const range = (from?: string, to?: string) => ({ from: from ? new Date(from) : new Date(Date.now() - 30 * 86400_000), to: to ? new Date(`${to}T23:59:59Z`) : new Date() });

/** One vendor's statement: what was sold, what we kept, refunds, what is owed and what was paid. Net = merchandise - commission + refund adjustments. */
export async function vendorStatement(vendorId: string, fromS?: string, toS?: string) {
  const { from, to } = range(fromS, toS);
  const lines = (await pool.query(
    `SELECT s.id, o.order_number, s.status, COALESCE(s.completed_at, o.created_at) AS at, s.subtotal_cents AS merchandise_cents, s.discount_cents, s.commission_cents,
            ${NET} AS net_cents, s.payout_id, p.status AS payout_status, p.paid_at
       FROM suborders s JOIN orders o ON o.id = s.order_id LEFT JOIN payouts p ON p.id = s.payout_id
      WHERE s.vendor_id = $1 AND COALESCE(s.completed_at, o.created_at) BETWEEN $2 AND $3
        AND EXISTS (SELECT 1 FROM ledger_entries l WHERE l.suborder_id = s.id AND l.account = 'vendor_payable')
      ORDER BY at DESC LIMIT 1000`, [vendorId, from, to])).rows.map((l) => ({ ...l, refund_adjustment_cents: l.net_cents - (l.merchandise_cents - l.commission_cents) }));
  const sum = (k: string) => lines.reduce((a, l) => a + (l[k] as number), 0);
  const payouts = (await pool.query(`SELECT id, amount_cents, status, created_at, paid_at, provider_transfer_id AS reference FROM payouts WHERE vendor_id = $1 AND created_at BETWEEN $2 AND $3 ORDER BY created_at DESC`, [vendorId, from, to])).rows;
  const bal = await vendorBalance(vendorId);
  return {
    period: { from: from.toISOString(), to: to.toISOString() }, lines,
    totals: { merchandise_cents: sum('merchandise_cents'), commission_cents: sum('commission_cents'), refund_adjustment_cents: sum('refund_adjustment_cents'), net_cents: sum('net_cents'), platform_funded_discounts_cents: sum('discount_cents') },
    payouts, paid_cents: payouts.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount_cents, 0),
    balance: { owed_cents: bal.owed_cents, payable_now_cents: bal.payable_now_cents, in_hold_cents: bal.in_hold_cents, in_progress_cents: bal.in_progress_cents, hold_days: bal.hold_days },
    notes: ['Platform-funded discounts are paid by EAZyfoods and do not reduce what you earn.', 'Net = merchandise - commission + refund adjustments. Tax and delivery fees are not part of your earnings.'],
  };
}

/** A driver's statement: base pay, tips (always entirely the driver's), and payout status. */
export async function driverStatement(driverId: string, fromS?: string, toS?: string) {
  const { from, to } = range(fromS, toS);
  const lines = (await pool.query(
    `SELECT e.id, o.order_number, e.created_at AS at, (e.amount_cents - e.tip_cents)::int AS base_cents, e.tip_cents, e.amount_cents AS total_cents, e.payout_id, p.status AS payout_status, p.paid_at,
            d.pay_breakdown
       FROM driver_earnings e JOIN deliveries d ON d.id = e.delivery_id JOIN suborders s ON s.id = d.suborder_id JOIN orders o ON o.id = s.order_id LEFT JOIN payouts p ON p.id = e.payout_id
      WHERE e.driver_id = $1 AND e.created_at BETWEEN $2 AND $3 ORDER BY e.created_at DESC LIMIT 1000`, [driverId, from, to])).rows;
  const sum = (k: string) => lines.reduce((a, l) => a + (l[k] as number), 0);
  const payouts = (await pool.query(`SELECT id, amount_cents, status, created_at, paid_at, provider_transfer_id AS reference FROM payouts WHERE driver_id = $1 AND created_at BETWEEN $2 AND $3 ORDER BY created_at DESC`, [driverId, from, to])).rows;
  const unpaid = (await pool.query(`SELECT COALESCE(sum(amount_cents),0)::int AS n FROM driver_earnings WHERE driver_id = $1 AND payout_id IS NULL`, [driverId])).rows[0].n;
  return {
    period: { from: from.toISOString(), to: to.toISOString() }, lines,
    totals: { base_cents: sum('base_cents'), tips_cents: sum('tip_cents'), total_cents: sum('total_cents') },
    payouts, paid_cents: payouts.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount_cents, 0), unpaid_cents: unpaid,
    notes: ['Tips are shown separately and always go entirely to the driver.'],
  };
}

export async function activeHold(payee: { vendorId?: string; driverId?: string }) {
  return (await pool.query(
    `SELECT id, reason, created_at FROM payout_holds WHERE released_at IS NULL AND (($1::uuid IS NOT NULL AND vendor_id = $1) OR ($2::uuid IS NOT NULL AND driver_id = $2)) ORDER BY created_at DESC LIMIT 1`,
    [payee.vendorId ?? null, payee.driverId ?? null])).rows[0] ?? null;
}

/** Everything finance should see before creating a payout: the orders in it, what is still held, earlier payouts, holds and any mismatch with the ledger. */
export async function vendorSettlementPreview(vendorId: string) {
  const v = (await pool.query('SELECT id, name, kind, payout_status, stripe_account_id IS NOT NULL AS has_account FROM vendors WHERE id = $1', [vendorId])).rows[0];
  if (!v) throw bad('no_vendor', 'Vendor not found.');
  const days = await holdDays(v.kind);
  const rows = (await pool.query(
    `SELECT s.id, o.order_number, s.completed_at, ${NET} AS net_cents, s.commission_cents, s.subtotal_cents AS merchandise_cents,
            (s.completed_at < now() - make_interval(days => $2)) AS eligible, s.completed_at + make_interval(days => $2) AS eligible_at
       FROM suborders s JOIN orders o ON o.id = s.order_id
      WHERE s.vendor_id = $1 AND s.status IN ('delivered','collected') AND s.payout_id IS NULL ORDER BY s.completed_at`, [vendorId, days])).rows;
  const eligible = rows.filter((r) => r.eligible), held = rows.filter((r) => !r.eligible);
  const sum = (a: typeof rows, k: string) => a.reduce((x, r) => x + (r[k] as number), 0);
  const bal = await vendorBalance(vendorId);
  const expected = (await pool.query(
    `SELECT COALESCE(sum(${NET}),0)::int AS n FROM suborders s LEFT JOIN payouts p ON p.id = s.payout_id WHERE s.vendor_id = $1 AND (s.payout_id IS NULL OR p.status <> 'paid')`, [vendorId])).rows[0].n;
  const previous = (await pool.query(`SELECT id, amount_cents, status, created_at, paid_at, provider_transfer_id AS reference FROM payouts WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 5`, [vendorId])).rows;
  const hold = await activeHold({ vendorId });
  const threshold = await getSetting<number>('payout.approval_threshold_cents');
  const amount = sum(eligible, 'net_cents');
  return {
    vendor: v, hold_days: days, eligible_lines: eligible, held_lines: held,
    gross_cents: sum(eligible, 'merchandise_cents'), commission_cents: sum(eligible, 'commission_cents'), net_payable_cents: amount,
    held_back_cents: sum(held, 'net_cents'), in_progress_cents: bal.in_progress_cents, owed_cents: bal.owed_cents, previous_payouts: previous, active_hold: hold,
    needs_approval: threshold > 0 && amount > threshold, approval_threshold_cents: threshold,
    method: v.has_account && v.payout_status === 'enabled' ? 'provider_transfer' : 'manual_bank_transfer',
    discrepancy_cents: bal.owed_cents - expected,   // the ledger and the order records must agree; anything else needs a person
  };
}

/** Create a payout from every unpaid delivered earning of a driver. Honours holds and the approval threshold exactly like vendor payouts. */
export async function createDriverPayout(driverId: string, actor: string) {
  if (await activeHold({ driverId })) throw conflict('payout_on_hold', 'Payouts to this driver are on hold.');
  const threshold = await getSetting<number>('payout.approval_threshold_cents');
  return tx(async (c) => {
    const es = (await c.query('SELECT id, amount_cents FROM driver_earnings WHERE driver_id = $1 AND payout_id IS NULL FOR UPDATE', [driverId])).rows;
    const amount = es.reduce((a, e) => a + e.amount_cents, 0);
    if (amount <= 0) throw bad('nothing_payable', 'No unpaid earnings.');
    const status = threshold > 0 && amount > threshold ? 'awaiting_approval' : 'pending';
    const row = (await c.query(`INSERT INTO payouts(payee_type, driver_id, amount_cents, created_by, status) VALUES ('driver',$1,$2,$3,$4) RETURNING *`, [driverId, amount, actor, status])).rows[0];
    await c.query('UPDATE driver_earnings SET payout_id = $2 WHERE id = ANY($1::uuid[])', [es.map((e) => e.id), row.id]);
    await audit(actor, 'payout.created', 'payout', row.id, { driverId, amount, status }, c);
    if (status === 'awaiting_approval') {
      const payee = (await c.query('SELECT u.full_name FROM drivers d JOIN users u ON u.id = d.user_id WHERE d.id = $1', [driverId])).rows[0]?.full_name;
      const who = (await c.query('SELECT full_name FROM users WHERE id = $1', [actor])).rows[0]?.full_name;
      await notifyStaff(c, { event: 'payout_needs_approval', perm: 'payouts.approve', template: 'staff_payout_needs_approval', vars: { amount: (amount / 100).toFixed(2), payee, who }, key: `payout_approval:${row.id}` });
    }
    return row as { id: string; status: string };
  });
}

/**
 * A payout above the threshold waits here. The approver must hold payouts.approve and must not be the person who created it.
 * Approval then runs the normal settle step (provider transfer or a manual bank transfer to be marked paid).
 */
export async function approvePayout(payoutId: string, actor: string) {
  await tx(async (c) => {
    const p = (await c.query('SELECT * FROM payouts WHERE id = $1 FOR UPDATE', [payoutId])).rows[0];
    if (!p) throw bad('no_payout', 'Payout not found.');
    if (p.status !== 'awaiting_approval') throw conflict('wrong_state', 'This payout is not waiting for approval.');
    if (p.created_by && p.created_by === actor) throw conflict('second_person_required', 'A different person must approve this payout.');
    await c.query(`UPDATE payouts SET status = 'pending', approved_by = $2, approved_at = now() WHERE id = $1`, [payoutId, actor]);
    await audit(actor, 'payout.approved', 'payout', payoutId, { amount: p.amount_cents }, c);
  });
  return settlePayout(payoutId, actor);
}

/** Decline a payout that is waiting for approval: the orders or earnings go back to unpaid. Nothing was sent, so nothing is reversed. */
export async function cancelPayout(payoutId: string, actor: string, note: string) {
  return tx(async (c) => {
    const p = (await c.query('SELECT * FROM payouts WHERE id = $1 FOR UPDATE', [payoutId])).rows[0];
    if (!p) throw bad('no_payout', 'Payout not found.');
    if (p.status !== 'awaiting_approval') throw conflict('wrong_state', 'Only a payout waiting for approval can be cancelled.');
    await c.query(`UPDATE payouts SET status = 'cancelled', note = $2 WHERE id = $1`, [payoutId, note]);
    await c.query('UPDATE suborders SET payout_id = NULL WHERE payout_id = $1', [payoutId]);
    await c.query('UPDATE driver_earnings SET payout_id = NULL WHERE payout_id = $1', [payoutId]);
    await audit(actor, 'payout.cancelled', 'payout', payoutId, { note }, c);
    return { id: payoutId, status: 'cancelled' };
  });
}

/* --------------------------------------------------------------- reconciliation */

export type Exception = { key: string; kind: string; severity: 'high' | 'medium' | 'info'; title: string; detail: string; ref_type: string; ref_id: string; amount_cents?: number };

/**
 * Cross-checks between the source records (payments, refunds, payouts, earnings, orders) and the ledger. Read-only: it reports differences and never
 * posts a balancing entry. Comparing with the payment provider's own balance report needs their export; use the movements CSV for that.
 */
export async function reconcile() {
  const ex: Exception[] = [];
  const add = (e: Exception) => ex.push(e);
  const unbalanced = (await pool.query(`SELECT txn_id, sum(amount_cents)::int AS diff FROM ledger_entries GROUP BY txn_id HAVING sum(amount_cents) <> 0 LIMIT 100`)).rows;
  for (const r of unbalanced) add({ key: `unbalanced:${r.txn_id}`, kind: 'unbalanced_transaction', severity: 'high', title: 'Ledger transaction does not balance', detail: `Transaction ${r.txn_id} is off by ${r.diff} cents.`, ref_type: 'txn', ref_id: r.txn_id, amount_cents: r.diff });

  for (const r of (await pool.query(
    `SELECT p.id, o.order_number, p.amount_cents FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.status = 'succeeded' AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'payment_captured' AND l.ref_id = p.id::text) LIMIT 100`)).rows)
    add({ key: `payment_no_ledger:${r.id}`, kind: 'payment_not_in_ledger', severity: 'high', title: 'Payment succeeded but is not in the ledger', detail: `Order ${r.order_number}: the payment was confirmed but no ledger entry exists.`, ref_type: 'payment', ref_id: r.id, amount_cents: r.amount_cents });
  for (const r of (await pool.query(
    `SELECT p.id, o.order_number, p.amount_cents, COALESCE((SELECT sum(l.amount_cents) FROM ledger_entries l WHERE l.kind = 'payment_captured' AND l.ref_id = p.id::text AND l.account = 'cash_provider'),0)::int AS booked
       FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.status = 'succeeded' AND EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'payment_captured' AND l.ref_id = p.id::text)
        AND p.amount_cents <> COALESCE((SELECT sum(l.amount_cents) FROM ledger_entries l WHERE l.kind = 'payment_captured' AND l.ref_id = p.id::text AND l.account = 'cash_provider'),0) LIMIT 100`)).rows)
    add({ key: `payment_amount:${r.id}`, kind: 'payment_amount_mismatch', severity: 'high', title: 'Payment amount differs from the ledger', detail: `Order ${r.order_number}: the provider payment is ${r.amount_cents} cents but the ledger booked ${r.booked} cents.`, ref_type: 'payment', ref_id: r.id, amount_cents: r.amount_cents - r.booked });
  for (const r of (await pool.query(
    `SELECT r.id, o.order_number, r.amount_cents FROM refunds r JOIN orders o ON o.id = r.order_id WHERE r.status = 'succeeded' AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'refund' AND l.ref_id = r.id::text) LIMIT 100`)).rows)
    add({ key: `refund_no_ledger:${r.id}`, kind: 'refund_not_in_ledger', severity: 'high', title: 'Refund succeeded but is not in the ledger', detail: `Order ${r.order_number}: a refund was sent but no ledger entry exists.`, ref_type: 'refund', ref_id: r.id, amount_cents: r.amount_cents });
  for (const r of (await pool.query(
    `SELECT p.id, p.amount_cents, p.payee_type FROM payouts p WHERE p.status = 'paid' AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'payout' AND l.ref_id = p.id::text) LIMIT 100`)).rows)
    add({ key: `payout_no_ledger:${r.id}`, kind: 'payout_not_in_ledger', severity: 'high', title: 'Payout marked paid but is not in the ledger', detail: `A ${r.payee_type} payout of ${r.amount_cents} cents is paid but has no ledger entry.`, ref_type: 'payout', ref_id: r.id, amount_cents: r.amount_cents });
  for (const r of (await pool.query(
    `SELECT p.id, p.amount_cents, COALESCE(-(SELECT sum(l.amount_cents) FROM ledger_entries l WHERE l.kind = 'payout' AND l.ref_id = p.id::text AND l.account = 'cash_provider'),0)::int AS booked
       FROM payouts p WHERE p.status = 'paid' AND EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'payout' AND l.ref_id = p.id::text) AND p.amount_cents <> COALESCE(-(SELECT sum(l.amount_cents) FROM ledger_entries l WHERE l.kind = 'payout' AND l.ref_id = p.id::text AND l.account = 'cash_provider'),0) LIMIT 100`)).rows)
    add({ key: `payout_amount:${r.id}`, kind: 'payout_amount_mismatch', severity: 'high', title: 'Payout amount differs from the ledger', detail: `The payout is ${r.amount_cents} cents; the ledger booked ${r.booked} cents.`, ref_type: 'payout', ref_id: r.id, amount_cents: r.amount_cents - r.booked });
  for (const r of (await pool.query(
    `SELECT e.id, e.delivery_id, e.amount_cents FROM driver_earnings e WHERE NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'driver_earning' AND l.ref_id = e.delivery_id::text) LIMIT 100`)).rows)
    add({ key: `earning_no_ledger:${r.id}`, kind: 'earning_not_in_ledger', severity: 'high', title: 'Driver earning is not in the ledger', detail: `A delivery earning of ${r.amount_cents} cents has no ledger entry.`, ref_type: 'earning', ref_id: r.id, amount_cents: r.amount_cents });
  for (const r of (await pool.query(
    `SELECT o.id, o.order_number, o.total_cents FROM orders o WHERE o.payment_status IN ('paid','partially_refunded','refunded') AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'succeeded') AND o.total_cents > COALESCE((SELECT sum(l.amount_cents) FROM ledger_entries l WHERE l.order_id = o.id AND l.account = 'store_credit_liability' AND l.kind = 'payment_captured'),0) LIMIT 100`)).rows)
    add({ key: `order_paid_no_payment:${r.id}`, kind: 'order_paid_without_payment', severity: 'high', title: 'Order is marked paid without a confirmed payment', detail: `Order ${r.order_number} says paid but there is no succeeded payment.`, ref_type: 'order', ref_id: r.id, amount_cents: r.total_cents });
  for (const r of (await pool.query(
    `SELECT v.id, v.name,
            -(SELECT COALESCE(sum(l.amount_cents),0) FROM ledger_entries l WHERE l.vendor_id = v.id AND l.account = 'vendor_payable')::int AS owed,
            (SELECT COALESCE(sum(-(SELECT COALESCE(sum(l.amount_cents),0) FROM ledger_entries l WHERE l.suborder_id = s.id AND l.account = 'vendor_payable')),0)
               FROM suborders s LEFT JOIN payouts p ON p.id = s.payout_id WHERE s.vendor_id = v.id AND (s.payout_id IS NULL OR p.status <> 'paid'))::int AS expected
       FROM vendors v`)).rows.filter((r) => r.owed !== r.expected))
    add({ key: `vendor_balance:${r.id}`, kind: 'vendor_balance_mismatch', severity: 'high', title: 'Vendor balance differs from their orders', detail: `${r.name}: the ledger says ${r.owed} cents is owed but the unpaid orders add up to ${r.expected} cents.`, ref_type: 'vendor', ref_id: r.id, amount_cents: r.owed - r.expected });
  const stuck = (await pool.query(`SELECT id, amount_cents, payee_type, created_at FROM payouts WHERE status IN ('pending','failed') AND created_at < now() - interval '3 days' LIMIT 100`)).rows;
  for (const r of stuck) add({ key: `payout_stuck:${r.id}`, kind: 'payout_stuck', severity: 'medium', title: 'Payout has been waiting more than 3 days', detail: `A ${r.payee_type} payout of ${r.amount_cents} cents has not been paid. Retry it or pay it by bank transfer and mark it paid.`, ref_type: 'payout', ref_id: r.id, amount_cents: r.amount_cents });
  for (const r of (await pool.query(`SELECT id, amount_cents FROM payouts WHERE status = 'awaiting_approval' AND created_at < now() - interval '1 day' LIMIT 100`)).rows)
    add({ key: `payout_approval:${r.id}`, kind: 'payout_awaiting_approval', severity: 'info', title: 'Payout is waiting for approval', detail: `A payout of ${r.amount_cents} cents has waited more than a day for a second person.`, ref_type: 'payout', ref_id: r.id, amount_cents: r.amount_cents });

  const notes = (await pool.query(`SELECT DISTINCT ON (exception_key) exception_key, action, note, created_at, actor_id FROM finance_exception_notes ORDER BY exception_key, id DESC`)).rows;
  const byKey = new Map(notes.map((n) => [n.exception_key, n]));
  const items = ex.map((e) => { const n = byKey.get(e.key); return { ...e, status: n?.action === 'resolved' ? 'resolved' : n?.action === 'acknowledged' ? 'acknowledged' : 'open', last_note: n?.note ?? null }; });
  const cash = (await pool.query(`SELECT COALESCE(sum(amount_cents),0)::bigint AS n FROM ledger_entries WHERE account = 'cash_provider'`)).rows[0].n;
  return {
    checked_at: new Date().toISOString(), exceptions: items, open_count: items.filter((i) => i.status === 'open').length,
    ledger_cash_held_cents: Number(cash),
    checks: ['Every ledger transaction balances', 'Every succeeded payment, refund, payout and driver earning has a ledger entry with the same amount', 'No order is marked paid without a confirmed payment', 'Each vendor’s ledger balance equals the sum of their unpaid orders', 'No payout is stuck'],
    not_checked: 'The payment provider’s own balance and payout reports. Compare them using the movements CSV.',
  };
}

/** Every cash movement with its provider reference, for matching against the payment provider's report. */
export async function movements(fromS?: string, toS?: string) {
  const { from, to } = range(fromS, toS);
  return (await pool.query(
    `SELECT * FROM (
       SELECT p.created_at AS at, 'payment' AS type, p.provider, p.provider_payment_id AS provider_ref, p.amount_cents AS amount_cents, o.order_number AS reference,
              EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'payment_captured' AND l.ref_id = p.id::text) AS in_ledger
         FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.status = 'succeeded'
       UNION ALL
       SELECT r.decided_at, 'refund', pay.provider, r.provider_refund_id, -r.amount_cents, o.order_number, EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'refund' AND l.ref_id = r.id::text)
         FROM refunds r JOIN orders o ON o.id = r.order_id JOIN payments pay ON pay.id = r.payment_id WHERE r.status = 'succeeded'
       UNION ALL
       SELECT p.paid_at, 'payout_' || p.payee_type, CASE WHEN p.note = 'Paid manually' THEN 'manual' ELSE 'provider' END, p.provider_transfer_id, -p.amount_cents, p.id::text, EXISTS (SELECT 1 FROM ledger_entries l WHERE l.kind = 'payout' AND l.ref_id = p.id::text)
         FROM payouts p WHERE p.status = 'paid'
     ) m WHERE at BETWEEN $1 AND $2 ORDER BY at`, [from, to])).rows;
}

/**
 * Email the finance team about a high-severity difference the first time it appears (once per difference, never repeated).
 * Runs from the background job, not when someone opens the page. It only tells people; it changes nothing.
 */
export async function notifyReconciliationDifferences() {
  const r = await reconcile();
  let sent = 0;
  for (const e of r.exceptions.filter((x) => x.severity === 'high' && x.status === 'open'))
    sent += await notifyStaff(pool, { event: 'reconciliation_difference', perm: 'payouts.manage', template: 'staff_reconciliation_difference', vars: { title: e.title, detail: e.detail }, key: `recon:${e.key}` });
  return sent;
}
