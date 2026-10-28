import { z } from 'zod';
import { pool } from '../db/pool.js';
import { getSetting } from './../lib/settings.js';
import { reconcile } from './settlements.js';

export const OverviewFilters = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  city: z.string().max(80).optional(), zone_id: z.string().uuid().optional(), store_id: z.string().uuid().optional(), vendor_id: z.string().uuid().optional(), driver_id: z.string().uuid().optional(),
  order_status: z.string().max(30).optional(), payment_status: z.enum(['paid', 'partially_refunded', 'refunded']).optional(), settlement_status: z.enum(['unpaid', 'in_payout', 'paid']).optional(),
});
export type OverviewFilters = z.infer<typeof OverviewFilters>;

export const DEFINITIONS: Record<string, string> = {
  merchandise_cents: 'Merchandise sold: item value of paid suborders that were not rejected or cancelled, before discounts, tax and delivery. This is the vendors’ sales, not EAZyfoods revenue.',
  delivery_fees_cents: 'Delivery fees collected from customers, before tax, net of delivery fees refunded. Revenue to EAZyfoods.',
  service_fees_cents: 'Customer service fees. Not charged yet, so always zero.',
  commission_cents: 'Marketplace commission kept, net of commission returned on vendor-funded refunds. Revenue to EAZyfoods.',
  driver_cost_cents: 'Base pay owed to drivers for completed deliveries (tips excluded). A cost to EAZyfoods.',
  tips_cents: 'Tips collected for drivers. Not EAZyfoods revenue: they belong entirely to drivers.',
  tax_cents: 'Tax collected on merchandise and delivery. Owed to the tax authority, not revenue.',
  discounts_cents: 'Discounts funded by EAZyfoods (coupons). Vendor-funded discounts reduce vendor proceeds, not this.',
  refunds_cents: 'Money refunded to customers in this scope, whoever funded it.',
  refund_loss_cents: 'Refunds that EAZyfoods absorbed instead of the vendor. A cost to EAZyfoods.',
  chargebacks_cents: 'Chargebacks are not tracked yet, so this is not shown.',
  processing_actual_cents: 'Payment-processing fees actually charged. Not imported from the provider yet, so not shown.',
  margin_before_processing_cents: 'Contribution margin from recorded figures: commission + delivery fees + service fees - driver cost - EAZyfoods-funded discounts - absorbed refunds. It is before payment-processing fees, which are not recorded yet.',
  margin_estimate_cents: 'The same margin after an ESTIMATE of processing fees (an assumption you set, not a provider charge). Treat it as an estimate.',
  vendor_liability_cents: 'What EAZyfoods owes vendors right now (ledger balance). A snapshot, not limited to the dates chosen.',
  driver_liability_cents: 'What EAZyfoods owes drivers right now (ledger balance). A snapshot.',
  settlements_pending_cents: 'Payouts created but not yet paid: waiting for approval, to be paid, or failed. A snapshot.',
};

/** The suborders in scope, as a reusable CTE and its parameters. Dates cover whole days of the order's payment time. */
function scope(f: OverviewFilters) {
  const from = f.from ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const to = f.to ?? new Date().toISOString().slice(0, 10);
  const p: unknown[] = [from, to];
  const w: string[] = ['o.placed_at IS NOT NULL', 'o.placed_at >= $1::date', 'o.placed_at < $2::date + 1'];
  const add = (sql: string, v: unknown) => { p.push(v); w.push(sql.replace('?', `$${p.length}`)); };
  if (f.city) add('st.city = ?', f.city);
  if (f.zone_id) add(`s.pricing_snapshot->'delivery'->>'zone_id' = ?::text`, f.zone_id);
  if (f.store_id) add('s.store_id = ?', f.store_id);
  if (f.vendor_id) add('s.vendor_id = ?', f.vendor_id);
  if (f.driver_id) add('d.driver_id = ?', f.driver_id);
  if (f.order_status) add('s.status = ?', f.order_status);
  if (f.payment_status) add('o.payment_status = ?', f.payment_status);
  if (f.settlement_status === 'unpaid') w.push('s.payout_id IS NULL');
  if (f.settlement_status === 'in_payout') w.push(`p.status IN ('awaiting_approval','pending','failed')`);
  if (f.settlement_status === 'paid') w.push(`p.status = 'paid'`);
  const sql = `FROM suborders s JOIN orders o ON o.id = s.order_id JOIN stores st ON st.id = s.store_id LEFT JOIN deliveries d ON d.suborder_id = s.id LEFT JOIN payouts p ON p.id = s.payout_id WHERE ${w.join(' AND ')}`;
  return { sql, p, from, to };
}

export async function overview(f: OverviewFilters) {
  const sc = scope(f);
  const LG = `lg AS (SELECT l.suborder_id,
            -sum(l.amount_cents) FILTER (WHERE l.account = 'commission_revenue') AS commission, -sum(l.amount_cents) FILTER (WHERE l.account = 'delivery_revenue') AS delivery,
            -sum(l.amount_cents) FILTER (WHERE l.account = 'tax_payable') AS tax, sum(l.amount_cents) FILTER (WHERE l.account = 'delivery_cost') AS driver_cost,
            sum(l.amount_cents) FILTER (WHERE l.account = 'refund_loss') AS refund_loss
       FROM ledger_entries l WHERE l.suborder_id IN (SELECT id FROM sc) GROUP BY l.suborder_id)`;
  // The ledger is summed per suborder first, so a suborder with many entries is never counted more than once.
  const m = (await pool.query(
    `WITH sc AS (SELECT s.id, s.order_id, s.status, s.subtotal_cents, s.discount_cents, s.tip_cents ${sc.sql}), ${LG}
     SELECT count(DISTINCT sc.order_id)::int AS orders,
            COALESCE(sum(sc.subtotal_cents) FILTER (WHERE sc.status NOT IN ('rejected','cancelled')),0)::int AS merchandise_cents,
            COALESCE(sum(sc.discount_cents),0)::int AS discounts_cents, COALESCE(sum(sc.tip_cents),0)::int AS tips_cents,
            COALESCE(sum(lg.commission),0)::int AS commission_cents, COALESCE(sum(lg.delivery),0)::int AS delivery_fees_cents, COALESCE(sum(lg.tax),0)::int AS tax_cents,
            COALESCE(sum(lg.driver_cost),0)::int AS driver_cost_cents, COALESCE(sum(lg.refund_loss),0)::int AS refund_loss_cents
       FROM sc LEFT JOIN lg ON lg.suborder_id = sc.id`, sc.p)).rows[0];
  const refunds = (await pool.query(`WITH sc AS (SELECT s.id ${sc.sql}) SELECT COALESCE(sum(r.amount_cents),0)::int AS n FROM refunds r JOIN sc ON sc.id = r.suborder_id WHERE r.status = 'succeeded'`, sc.p)).rows[0].n;
  const paid = (await pool.query(`WITH sc AS (SELECT DISTINCT o.id, o.total_cents ${sc.sql}) SELECT count(*)::int AS n, COALESCE(sum(total_cents),0)::bigint AS cents FROM sc`, sc.p)).rows[0];
  const bps = await getSetting<number>('finance.processing_assumption_bps'), fixed = await getSetting<number>('finance.processing_assumption_fixed_cents');
  const processingEstimate = Math.round((Number(paid.cents) * bps) / 10000) + paid.n * fixed;
  const margin = m.commission_cents + m.delivery_fees_cents - m.driver_cost_cents - m.discounts_cents - m.refund_loss_cents;

  const vendorLiab = (await pool.query(`SELECT COALESCE(-sum(amount_cents),0)::int AS n FROM ledger_entries WHERE account = 'vendor_payable' AND ($1::uuid IS NULL OR vendor_id = $1) AND ($2::uuid IS NULL OR vendor_id = (SELECT vendor_id FROM stores WHERE id = $2))`, [f.vendor_id ?? null, f.store_id ?? null])).rows[0].n;
  const driverLiab = (await pool.query(`SELECT COALESCE(-sum(amount_cents),0)::int AS n FROM ledger_entries WHERE account = 'driver_payable' AND ($1::uuid IS NULL OR driver_id = $1)`, [f.driver_id ?? null])).rows[0].n;
  const pending = (await pool.query(`SELECT COALESCE(sum(amount_cents),0)::int AS n, count(*)::int AS c FROM payouts WHERE status IN ('awaiting_approval','pending','failed') AND ($1::uuid IS NULL OR vendor_id = $1) AND ($2::uuid IS NULL OR driver_id = $2)`, [f.vendor_id ?? null, f.driver_id ?? null])).rows[0];
  const rec = await reconcile();
  const byDay = (await pool.query(
    `WITH sc AS (SELECT s.id, s.status, s.subtotal_cents, o.placed_at ${sc.sql}), ${LG}
     SELECT to_char(date_trunc('day', sc.placed_at), 'YYYY-MM-DD') AS day, count(*)::int AS suborders,
            COALESCE(sum(sc.subtotal_cents) FILTER (WHERE sc.status NOT IN ('rejected','cancelled')),0)::int AS merchandise_cents,
            COALESCE(sum(COALESCE(lg.commission,0) + COALESCE(lg.delivery,0)),0)::int AS revenue_cents
       FROM sc LEFT JOIN lg ON lg.suborder_id = sc.id GROUP BY 1 ORDER BY 1`, sc.p)).rows;
  return {
    period: { from: sc.from, to: sc.to }, filters: f,
    metrics: {
      orders: m.orders, merchandise_cents: m.merchandise_cents, delivery_fees_cents: m.delivery_fees_cents, service_fees_cents: 0, commission_cents: m.commission_cents,
      driver_cost_cents: m.driver_cost_cents, tips_cents: m.tips_cents, tax_cents: m.tax_cents, discounts_cents: m.discounts_cents, refunds_cents: refunds, refund_loss_cents: m.refund_loss_cents,
      chargebacks_cents: null, processing_actual_cents: null,
      margin_before_processing_cents: margin, margin_estimate_cents: margin - processingEstimate, processing_estimate_cents: processingEstimate,
      revenue_cents: m.commission_cents + m.delivery_fees_cents,
      vendor_liability_cents: vendorLiab, driver_liability_cents: driverLiab, settlements_pending_cents: pending.n, settlements_pending_count: pending.c, reconciliation_open: rec.open_count,
    },
    assumptions: { processing_bps: bps, processing_fixed_cents: fixed, note: 'Processing fees are an assumption used only for the estimated margin.' },
    definitions: DEFINITIONS, by_day: byDay,
  };
}

/** The records behind the numbers: one row per suborder in scope, with its own figures, so any total can be traced. */
export async function overviewTransactions(f: OverviewFilters, limit: number, offset: number) {
  const sc = scope(f);
  const total = (await pool.query(`SELECT count(*)::int AS n ${sc.sql}`, sc.p)).rows[0].n;
  const rows = (await pool.query(
    `WITH sc AS (SELECT s.id, s.order_id, o.order_number, o.placed_at, o.payment_status, s.status, st.name AS store_name, st.city, s.subtotal_cents AS merchandise_cents, s.discount_cents, s.tip_cents,
                        s.commission_cents AS commission_charged_cents, s.delivery_cents AS delivery_charged_cents, p.status AS payout_status, p.id AS payout_id, d.driver_id ${sc.sql} ORDER BY o.placed_at DESC LIMIT ${Math.min(Math.max(limit, 1), 200)} OFFSET ${Math.max(offset, 0)})
     SELECT sc.*, COALESCE(-sum(l.amount_cents) FILTER (WHERE l.account = 'commission_revenue'),0)::int AS commission_cents,
                  COALESCE(-sum(l.amount_cents) FILTER (WHERE l.account = 'delivery_revenue'),0)::int AS delivery_fees_cents,
                  COALESCE(sum(l.amount_cents) FILTER (WHERE l.account = 'delivery_cost'),0)::int AS driver_cost_cents,
                  COALESCE(sum(l.amount_cents) FILTER (WHERE l.account = 'refund_loss'),0)::int AS refund_loss_cents,
                  COALESCE(-sum(l.amount_cents) FILTER (WHERE l.account = 'vendor_payable'),0)::int AS vendor_net_cents,
                  count(l.id)::int AS ledger_entries
       FROM sc LEFT JOIN ledger_entries l ON l.suborder_id = sc.id GROUP BY sc.id, sc.order_id, sc.order_number, sc.placed_at, sc.payment_status, sc.status, sc.store_name, sc.city, sc.merchandise_cents, sc.discount_cents, sc.tip_cents, sc.commission_charged_cents, sc.delivery_charged_cents, sc.payout_status, sc.payout_id, sc.driver_id ORDER BY sc.placed_at DESC`, sc.p)).rows;
  return { total, rows };
}
