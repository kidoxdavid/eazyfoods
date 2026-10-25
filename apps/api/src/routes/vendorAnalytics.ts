import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { canManageStore } from '../lib/auth.js';
import { requireLogin } from '../lib/permissions.js';
import { forbidden } from '../lib/errors.js';

/** Sales analytics for one store, answering exactly what the original vendor Analytics page asks for. Completed orders only (delivered or collected). */
const TZ = `'America/Edmonton'`;
const DONE = `s.status IN ('delivered','collected')`;
const range = z.object({ start_date: z.string().regex(/^\d{4}-\d\d-\d\d$/), end_date: z.string().regex(/^\d{4}-\d\d-\d\d$/), group_by: z.enum(['day', 'week', 'month']).default('day') });
const day = `(o.placed_at AT TIME ZONE ${TZ})::date`;

export const vendorAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const store = async (req: any) => {
    const id = z.string().uuid().parse(req.params.storeId);
    if (!(await canManageStore(req.user, id))) throw forbidden();
    return id;
  };
  const base = `FROM suborders s JOIN orders o ON o.id = s.order_id WHERE s.store_id = $1 AND ${day} >= $2::date AND ${day} <= $3::date`;
  const money = (c: number) => (c ?? 0) / 100;

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/analytics/sales-report', async (req) => {
    const sid = await store(req); const q = range.parse(req.query);
    const t = (await pool.query(`SELECT count(*)::int AS n, COALESCE(sum(s.subtotal_cents),0)::int AS rev, COALESCE(sum(s.commission_cents),0)::int AS com ${base} AND ${DONE}`, [sid, q.start_date, q.end_date])).rows[0];
    const top = (await pool.query(
      `SELECT l.product_id, l.product_name, sum(l.quantity - l.refunded_quantity)::int AS total_sold, sum(l.line_total_cents)::int AS revenue
         FROM order_lines l JOIN suborders s ON s.id = l.suborder_id JOIN orders o ON o.id = s.order_id
        WHERE s.store_id = $1 AND ${day} >= $2::date AND ${day} <= $3::date AND ${DONE} GROUP BY l.product_id, l.product_name ORDER BY revenue DESC LIMIT 10`, [sid, q.start_date, q.end_date])).rows;
    return { period_start: q.start_date, period_end: q.end_date, total_orders: t.n, total_revenue: money(t.rev), total_commission: money(t.com), net_payout: money(t.rev - t.com), average_order_value: t.n ? money(t.rev / t.n) : 0,
      top_products: top.map((r) => ({ product_id: r.product_id, product_name: r.product_name, total_sold: r.total_sold, revenue: money(r.revenue) })) };
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/analytics/sales-trends', async (req) => {
    const sid = await store(req); const q = range.parse(req.query);
    const bucket = q.group_by === 'week' ? `date_trunc('week', ${day})::date` : q.group_by === 'month' ? `date_trunc('month', ${day})::date` : day;
    const rows = (await pool.query(
      `SELECT to_char(${bucket}, 'YYYY-MM-DD') AS d, count(*)::int AS order_count, COALESCE(sum(s.subtotal_cents),0)::int AS revenue, COALESCE(sum(s.subtotal_cents - s.commission_cents),0)::int AS net ${base} AND ${DONE} GROUP BY 1 ORDER BY 1`, [sid, q.start_date, q.end_date])).rows;
    const label = (d: string) => (q.group_by === 'month' ? new Date(d + 'T12:00:00').toLocaleString('en-US', { month: 'short', year: 'numeric' }) : q.group_by === 'week' ? `Week of ${d}` : d);
    return { group_by: q.group_by, trends: rows.map((r) => ({ date: label(r.d), order_count: r.order_count, revenue: money(r.revenue), net_payout: money(r.net) })) };
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/analytics/revenue-breakdown', async (req) => {
    const sid = await store(req); const q = range.parse(req.query);
    const rows = (await pool.query(
      `SELECT c.id AS category_id, COALESCE(c.name, 'Uncategorized') AS category_name, sum(l.line_total_cents)::int AS revenue, sum(l.quantity - l.refunded_quantity)::int AS quantity
         FROM order_lines l JOIN suborders s ON s.id = l.suborder_id JOIN orders o ON o.id = s.order_id JOIN products p ON p.id = l.product_id LEFT JOIN categories c ON c.id = p.category_id
        WHERE s.store_id = $1 AND ${day} >= $2::date AND ${day} <= $3::date AND ${DONE} GROUP BY c.id, c.name ORDER BY revenue DESC`, [sid, q.start_date, q.end_date])).rows;
    return { breakdown: rows.map((r) => ({ category_id: r.category_id ?? 'uncategorized', category_name: r.category_name, revenue: money(r.revenue), quantity: r.quantity })) };
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/analytics/product-performance', async (req) => {
    const sid = await store(req); const q = range.parse(req.query);
    const rows = (await pool.query(
      `SELECT l.product_id, l.product_name, sum(l.quantity - l.refunded_quantity)::int AS total_sold, sum(l.line_total_cents)::int AS revenue, count(DISTINCT s.id)::int AS order_count
         FROM order_lines l JOIN suborders s ON s.id = l.suborder_id JOIN orders o ON o.id = s.order_id
        WHERE s.store_id = $1 AND ${day} >= $2::date AND ${day} <= $3::date AND ${DONE} GROUP BY l.product_id, l.product_name ORDER BY revenue DESC LIMIT 20`, [sid, q.start_date, q.end_date])).rows;
    return { products: rows.map((r) => ({ product_id: r.product_id, product_name: r.product_name, total_sold: r.total_sold, revenue: money(r.revenue), order_count: r.order_count })) };
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/analytics/fulfillment-metrics', async (req) => {
    const sid = await store(req); const q = range.parse(req.query);
    const rows = (await pool.query(`SELECT s.status, count(*)::int AS n ${base} AND s.status NOT IN ('awaiting_payment','expired') GROUP BY 1`, [sid, q.start_date, q.end_date])).rows;
    const avg = (await pool.query(`SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (s.completed_at - o.placed_at)) / 60))::int, 0) AS m ${base} AND ${DONE} AND s.completed_at IS NOT NULL`, [sid, q.start_date, q.end_date])).rows[0].m;
    const NAME: Record<string, string> = { placed: 'new', accepted: 'accepted', preparing: 'picking', ready: 'ready', out_for_delivery: 'in_transit', delivered: 'delivered', collected: 'picked_up', rejected: 'cancelled', cancelled: 'cancelled' };
    const status_breakdown: Record<string, number> = {};
    for (const r of rows) status_breakdown[NAME[r.status] ?? r.status] = (status_breakdown[NAME[r.status] ?? r.status] ?? 0) + r.n;
    const total = rows.reduce((a, r) => a + r.n, 0);
    const completed = rows.filter((r) => ['delivered', 'collected'].includes(r.status)).reduce((a, r) => a + r.n, 0);
    const cancelled = rows.filter((r) => ['rejected', 'cancelled'].includes(r.status)).reduce((a, r) => a + r.n, 0);
    return { total_orders: total, completed_orders: completed, cancelled_orders: cancelled, cancellation_rate: total ? Math.round((cancelled / total) * 10000) / 100 : 0, average_fulfillment_time_minutes: avg, status_breakdown };
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/analytics/comparison', async (req) => {
    const sid = await store(req);
    const q = z.object({ period1_start: z.string(), period1_end: z.string(), period2_start: z.string(), period2_end: z.string() }).parse(req.query);
    const stats = async (a: string, b: string) => {
      const t = (await pool.query(`SELECT count(*)::int AS n, COALESCE(sum(s.subtotal_cents),0)::int AS rev, COALESCE(sum(s.subtotal_cents - s.commission_cents),0)::int AS net ${base} AND ${DONE}`, [sid, a, b])).rows[0];
      return { total_orders: t.n, total_revenue: money(t.rev), net_payout: money(t.net), avg_order_value: t.n ? money(t.rev / t.n) : 0 };
    };
    const [p1, p2] = [await stats(q.period1_start, q.period1_end), await stats(q.period2_start, q.period2_end)];
    const chg = (o: number, n: number) => (o === 0 ? (n > 0 ? 100 : 0) : ((n - o) / o) * 100);
    return { period1: p1, period2: p2, changes: { orders: chg(p1.total_orders, p2.total_orders), revenue: chg(p1.total_revenue, p2.total_revenue), payout: chg(p1.net_payout, p2.net_payout), avg_order_value: chg(p1.avg_order_value, p2.avg_order_value) } };
  });
};
