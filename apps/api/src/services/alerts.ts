import { pool } from '../db/pool.js';
import { notify } from './notify.js';

/**
 * Send the alerts people asked for: "tell me when it is back" and "tell me if the price drops". Each alert fires once, then switches itself off.
 * A price-drop alert fires only when the best in-stock price is below what it was when the person asked.
 */
export async function runProductAlerts() {
  const rows = (await pool.query(
    `SELECT a.id, a.kind, a.price_at_creation_cents, u.id AS user_id, u.email, p.slug, p.name, cur.min_price, cur.in_stock
       FROM product_alerts a JOIN users u ON u.id = a.user_id AND u.disabled_at IS NULL AND u.deleted_at IS NULL JOIN products p ON p.id = a.product_id AND p.status = 'published'
       JOIN LATERAL (SELECT min(o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0) AS min_price, COALESCE(bool_or(o.stock_on_hand - o.stock_reserved > 0), false) AS in_stock
                       FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE o.product_id = p.id AND o.is_active) cur ON true
      WHERE a.active`)).rows;
  let sent = 0;
  for (const r of rows) {
    const money = (c: number) => `$${(c / 100).toFixed(2)}`;
    let msg: string | null = null, headline = '';
    if (r.kind === 'back_in_stock' && r.in_stock) { headline = `${r.name} is back in stock`; msg = `Good news: ${r.name} is available again, from ${money(r.min_price)}.`; }
    if (r.kind === 'price_drop' && r.in_stock && r.price_at_creation_cents != null && r.min_price < r.price_at_creation_cents) { headline = `Price drop: ${r.name}`; msg = `${r.name} is now ${money(r.min_price)}, down from ${money(r.price_at_creation_cents)} when you asked.`; }
    if (!msg) continue;
    const claimed = await pool.query(`UPDATE product_alerts SET active = false, notified_at = now() WHERE id = $1 AND active RETURNING id`, [r.id]);   // claim first so two instances never both send
    if (!claimed.rowCount) continue;
    await notify(pool, { userId: r.user_id, email: r.email, template: 'product_alert', vars: { headline, message: msg, slug: r.slug }, transactional: true });
    sent++;
  }
  return sent;
}
