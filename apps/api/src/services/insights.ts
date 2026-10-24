import { pool } from '../db/pool.js';

export type Scope = { vendorId?: string | null; storeId?: string | null };
const TZ = `'America/Edmonton'`;
/** A sale counts once the customer has paid and the store has not rejected or cancelled it. */
const VALID = `s.status NOT IN ('awaiting_payment','expired','rejected','cancelled')`;
const PAID = `s.status NOT IN ('awaiting_payment','expired')`;

type Totals = { orders: number; gross_cents: number; units: number; customers: number; new_customers: number; cancelled: number; paid_orders: number };
const empty = (): Totals => ({ orders: 0, gross_cents: 0, units: 0, customers: 0, new_customers: 0, cancelled: 0, paid_orders: 0 });

/** One read-only analytics payload for the admin console (no scope) or a vendor (scoped to their vendor and optionally one store). */
export async function insights(scope: Scope, days: number) {
  const n = Math.min(Math.max(Math.round(days), 1), 365);
  const P = [scope.vendorId ?? null, scope.storeId ?? null, n];
  const where = `($1::uuid IS NULL OR s.vendor_id = $1) AND ($2::uuid IS NULL OR s.store_id = $2)`;
  const today = `(now() AT TIME ZONE ${TZ})::date`;
  const day = `(o.placed_at AT TIME ZONE ${TZ})::date`;

  const [tot, series, hours, dows, status, mix, products, stores, speed] = await Promise.all([
    pool.query(
      `WITH x AS (
         SELECT s.id, s.status, s.subtotal_cents, o.user_id, o.id AS order_id, ${day} AS d,
                min(${day}) OVER (PARTITION BY o.user_id) AS first_d,
                (SELECT COALESCE(sum(l.quantity - l.refunded_quantity), 0) FROM order_lines l WHERE l.suborder_id = s.id) AS units
           FROM suborders s JOIN orders o ON o.id = s.order_id
          WHERE ${PAID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} >= ${today} - (2 * $3::int - 1)
       ), t AS (SELECT *, CASE WHEN d > ${today} - $3::int THEN 'cur' ELSE 'prev' END AS period FROM x)
       SELECT period,
              count(DISTINCT order_id) FILTER (WHERE status NOT IN ('rejected','cancelled'))::int AS orders,
              COALESCE(sum(subtotal_cents) FILTER (WHERE status NOT IN ('rejected','cancelled')), 0)::int AS gross_cents,
              COALESCE(sum(units) FILTER (WHERE status NOT IN ('rejected','cancelled')), 0)::int AS units,
              count(DISTINCT user_id) FILTER (WHERE status NOT IN ('rejected','cancelled'))::int AS customers,
              count(DISTINCT user_id) FILTER (WHERE status NOT IN ('rejected','cancelled') AND first_d > ${today} - CASE WHEN period = 'cur' THEN $3::int ELSE 2 * $3::int END)::int AS new_customers,
              count(*) FILTER (WHERE status IN ('rejected','cancelled'))::int AS cancelled,
              count(*)::int AS paid_orders
         FROM t GROUP BY period`, P),
    pool.query(
      `SELECT to_char(g, 'YYYY-MM-DD') AS day, COALESCE(x.orders, 0)::int AS orders, COALESCE(x.gross, 0)::int AS gross_cents
         FROM generate_series(${today} - ($3::int - 1), ${today}, '1 day') g
         LEFT JOIN (SELECT ${day} AS d, count(DISTINCT o.id) AS orders, sum(s.subtotal_cents) AS gross FROM suborders s JOIN orders o ON o.id = s.order_id
                     WHERE ${VALID} AND o.placed_at IS NOT NULL AND ${where} GROUP BY 1) x ON x.d = g::date ORDER BY g`, P),
    pool.query(
      `SELECT h::int AS hour, COALESCE(c.n, 0)::int AS orders FROM generate_series(0, 23) h
         LEFT JOIN (SELECT extract(hour FROM o.placed_at AT TIME ZONE ${TZ})::int AS hr, count(DISTINCT o.id) AS n FROM suborders s JOIN orders o ON o.id = s.order_id
                     WHERE ${VALID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} > ${today} - $3::int GROUP BY 1) c ON c.hr = h ORDER BY h`, P),
    pool.query(
      `SELECT d::int AS dow, COALESCE(c.n, 0)::int AS orders FROM generate_series(0, 6) d
         LEFT JOIN (SELECT extract(dow FROM o.placed_at AT TIME ZONE ${TZ})::int AS wd, count(DISTINCT o.id) AS n FROM suborders s JOIN orders o ON o.id = s.order_id
                     WHERE ${VALID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} > ${today} - $3::int GROUP BY 1) c ON c.wd = d ORDER BY d`, P),
    pool.query(
      `SELECT s.status, count(*)::int AS n FROM suborders s JOIN orders o ON o.id = s.order_id WHERE ${PAID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} > ${today} - $3::int GROUP BY 1 ORDER BY 2 DESC`, P),
    pool.query(
      `SELECT s.fulfilment_method AS method, count(*)::int AS n FROM suborders s JOIN orders o ON o.id = s.order_id WHERE ${VALID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} > ${today} - $3::int GROUP BY 1`, P),
    pool.query(
      `SELECT l.product_name AS name, sum(l.quantity - l.refunded_quantity)::int AS units, sum(l.line_total_cents)::int AS gross_cents
         FROM order_lines l JOIN suborders s ON s.id = l.suborder_id JOIN orders o ON o.id = s.order_id
        WHERE ${VALID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} > ${today} - $3::int GROUP BY l.product_name ORDER BY gross_cents DESC LIMIT 8`, P),
    scope.vendorId ? Promise.resolve({ rows: [] as any[] }) : pool.query(
      `SELECT st.name, count(DISTINCT o.id)::int AS orders, sum(s.subtotal_cents)::int AS gross_cents FROM suborders s JOIN orders o ON o.id = s.order_id JOIN stores st ON st.id = s.store_id
        WHERE ${VALID} AND o.placed_at IS NOT NULL AND ${day} > ${today} - $3::int GROUP BY st.name ORDER BY gross_cents DESC LIMIT 8`.replace('$3::int', '$1::int'), [n]),
    pool.query(
      `SELECT round(avg(extract(epoch FROM (s.accepted_at - o.placed_at)) / 60) FILTER (WHERE s.accepted_at IS NOT NULL))::int AS accept_minutes,
              round(avg(extract(epoch FROM (s.ready_at - s.accepted_at)) / 60) FILTER (WHERE s.ready_at IS NOT NULL AND s.accepted_at IS NOT NULL))::int AS prep_minutes
         FROM suborders s JOIN orders o ON o.id = s.order_id WHERE ${PAID} AND o.placed_at IS NOT NULL AND ${where} AND ${day} > ${today} - $3::int`, P),
  ]);

  const by = Object.fromEntries(tot.rows.map((r) => [r.period, r])) as Record<string, Totals>;
  const cur = { ...empty(), ...by.cur }, prev = { ...empty(), ...by.prev };
  const aov = (t: Totals) => (t.orders ? Math.round(t.gross_cents / t.orders) : null);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  const delta = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : Math.round(((a - b) / b) * 1000) / 10);
  return {
    days: n,
    kpis: {
      orders: { value: cur.orders, prev: prev.orders, delta_pct: delta(cur.orders, prev.orders) },
      gross_cents: { value: cur.gross_cents, prev: prev.gross_cents, delta_pct: delta(cur.gross_cents, prev.gross_cents) },
      aov_cents: { value: aov(cur), prev: aov(prev), delta_pct: delta(aov(cur), aov(prev)) },
      units: { value: cur.units, prev: prev.units, delta_pct: delta(cur.units, prev.units) },
      customers: { value: cur.customers, prev: prev.customers, delta_pct: delta(cur.customers, prev.customers) },
      new_customers: { value: cur.new_customers, prev: prev.new_customers, delta_pct: delta(cur.new_customers, prev.new_customers) },
      cancel_rate_pct: { value: pct(cur.cancelled, cur.paid_orders), prev: pct(prev.cancelled, prev.paid_orders), delta_pct: null as number | null },
    },
    series: series.rows, by_hour: hours.rows, by_weekday: dows.rows, status_mix: status.rows, fulfilment_mix: mix.rows,
    top_products: products.rows, top_stores: stores.rows, speed: speed.rows[0],
    note: 'Gross sales are the value of items sold, before commission and refunds. They are not profit. "New customers" are people whose first order (in this scope) falls in the period.',
  };
}
