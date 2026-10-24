import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { bad } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { getProvider } from '../payments/provider.js';
import { postPayout } from './ledger.js';
import { notifyVendorOwners } from './notify.js';

/** Days between delivery and the order becoming payable. Home kitchens are paid sooner (their food is delivered and consumed quickly, and they carry little stock). */
export async function holdDays(kind: 'store' | 'chef') {
  return getSetting<number>(kind === 'chef' ? 'payout.hold_days_kitchen' : 'payout.hold_days');
}

const ELIGIBLE = `s.status IN ('delivered','collected') AND s.payout_id IS NULL AND s.completed_at < now() - make_interval(days => $2)`;
const NET = `-(SELECT COALESCE(sum(l.amount_cents),0) FROM ledger_entries l WHERE l.suborder_id = s.id AND l.account = 'vendor_payable')::int`;

/** What a vendor is owed in total, what is payable now, and what is still inside the hold period. */
export async function vendorBalance(vendorId: string) {
  const v = (await pool.query('SELECT kind FROM vendors WHERE id = $1', [vendorId])).rows[0];
  const days = await holdDays(v.kind);
  const r = (await pool.query(
    `SELECT COALESCE(sum(${NET}) FILTER (WHERE ${ELIGIBLE}), 0)::int AS payable_now_cents,
            COALESCE(sum(${NET}) FILTER (WHERE s.status IN ('delivered','collected') AND s.payout_id IS NULL AND NOT (s.completed_at < now() - make_interval(days => $2))), 0)::int AS in_hold_cents,
            min(s.completed_at + make_interval(days => $2)) FILTER (WHERE s.status IN ('delivered','collected') AND s.payout_id IS NULL AND s.completed_at >= now() - make_interval(days => $2)) AS next_eligible_at,
            COALESCE(sum(${NET}) FILTER (WHERE s.status IN ('placed','accepted','preparing','ready','out_for_delivery')), 0)::int AS in_progress_cents
       FROM suborders s WHERE s.vendor_id = $1`, [vendorId, days])).rows[0];
  const owed = (await pool.query(`SELECT COALESCE(-sum(amount_cents), 0)::int AS n FROM ledger_entries WHERE vendor_id = $1 AND account = 'vendor_payable'`, [vendorId])).rows[0].n;
  return { owed_cents: owed, hold_days: days, ...r };
}

/** Bundle every payable order of a vendor into one payout row. Nothing is sent yet. */
export async function createVendorPayout(vendorId: string, actor: string | null, trigger: 'manual' | 'auto') {
  const v = (await pool.query('SELECT kind FROM vendors WHERE id = $1', [vendorId])).rows[0];
  if (!v) throw bad('no_vendor', 'Vendor not found.');
  const days = await holdDays(v.kind);
  return tx(async (c) => {
    const subs = (await c.query(`SELECT s.id, ${NET} AS net FROM suborders s WHERE s.vendor_id = $1 AND ${ELIGIBLE} FOR UPDATE OF s`, [vendorId, days])).rows;
    const amount = subs.reduce((a, s) => a + s.net, 0);
    if (amount <= 0) throw bad('nothing_payable', 'Nothing is payable to this vendor yet (orders must be delivered and past the hold period).');
    const row = (await c.query(`INSERT INTO payouts(payee_type, vendor_id, amount_cents, created_by, trigger) VALUES ('vendor',$1,$2,$3,$4) RETURNING *`, [vendorId, amount, actor, trigger])).rows[0];
    await c.query('UPDATE suborders SET payout_id = $2 WHERE id = ANY($1::uuid[])', [subs.map((s) => s.id), row.id]);
    await audit(actor, 'payout.created', 'payout', row.id, { vendorId, amount, trigger }, c);
    return row as { id: string; amount_cents: number };
  });
}

/**
 * Try to pay a payout through the provider (Stripe Connect transfer) when the payee's account is enabled; otherwise leave it for a manual bank transfer.
 * Safe to call again after a failure: the transfer carries a stable idempotency key, and a paid payout is never paid twice.
 */
export async function settlePayout(payoutId: string, actor: string | null) {
  const p = (await pool.query(
    `SELECT p.*, v.stripe_account_id, v.payout_status FROM payouts p LEFT JOIN vendors v ON v.id = p.vendor_id WHERE p.id = $1`, [payoutId])).rows[0];
  if (!p) throw bad('no_payout', 'Payout not found.');
  if (p.status === 'paid') return { id: p.id, status: 'paid' as const, amount_cents: p.amount_cents };
  const provider = getProvider();
  if (p.payee_type === 'vendor' && p.stripe_account_id && p.payout_status === 'enabled' && provider.transfer) {
    await pool.query('UPDATE payouts SET attempts = attempts + 1 WHERE id = $1', [p.id]);
    try {
      const t = await provider.transfer({ destinationAccount: p.stripe_account_id, amountCents: p.amount_cents, idempotencyKey: `payout:${p.id}` });
      const paid = await tx(async (c, after) => {
        const cur = (await c.query(`SELECT status FROM payouts WHERE id = $1 FOR UPDATE`, [p.id])).rows[0];
        if (cur.status === 'paid') return false;
        await c.query(`UPDATE payouts SET status='paid', provider_transfer_id=$2, paid_at=now(), note=NULL WHERE id=$1`, [p.id, t.transferId]);
        await postPayout(c, { id: p.id, payee_type: 'vendor', vendor_id: p.vendor_id, amount: p.amount_cents });
        await audit(actor, 'payout.paid', 'payout', p.id, { transfer: t.transferId }, c);
        after.push(() => notifyVendorOwners(pool, p.vendor_id, 'payout_paid', { amount: (p.amount_cents / 100).toFixed(2) }));
        return true;
      });
      void paid;
      return { id: p.id, status: 'paid' as const, amount_cents: p.amount_cents };
    } catch (e: any) {
      await pool.query(`UPDATE payouts SET status='failed', note=$2 WHERE id=$1`, [p.id, String(e.message).slice(0, 300)]);
      return { id: p.id, status: 'failed' as const, amount_cents: p.amount_cents, error: String(e.message) };
    }
  }
  return { id: p.id, status: 'pending' as const, amount_cents: p.amount_cents, message: 'No enabled payout account. Pay by bank transfer, then mark it paid with the reference.' };
}

/**
 * Optional automatic payouts (finance turns it on): every vendor with an enabled payout account and at least the minimum payable is paid,
 * and failed transfers are retried a few times. Safe to run repeatedly and from several instances.
 */
export async function runAutoPayouts() {
  if (!(await getSetting<boolean>('payout.auto_enabled'))) return { created: 0, retried: 0, skipped: 'disabled' as const };
  const min = await getSetting<number>('payout.auto_min_cents');
  let created = 0, retried = 0;
  const failed = (await pool.query(`SELECT p.id FROM payouts p JOIN vendors v ON v.id = p.vendor_id WHERE p.status = 'failed' AND p.attempts < 5 AND v.payout_status = 'enabled'`)).rows;
  for (const f of failed) { const r = await settlePayout(f.id, null); if (r.status === 'paid') retried++; }
  const vendors = (await pool.query(`SELECT id FROM vendors WHERE payout_status = 'enabled' AND status = 'approved' AND stripe_account_id IS NOT NULL`)).rows;
  for (const v of vendors) {
    const b = await vendorBalance(v.id);
    if (b.payable_now_cents < min) continue;
    try { const p = await createVendorPayout(v.id, null, 'auto'); await settlePayout(p.id, null); created++; }
    catch (e: any) { if (e.code !== 'nothing_payable') console.error('auto payout failed', v.id, e); }
  }
  return { created, retried };
}
