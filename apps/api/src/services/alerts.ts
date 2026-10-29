import { pool } from '../db/pool.js';
import { notify, notifyVendorOwners } from './notify.js';

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

/** Restock reminders the customer asked for on a shopping list. The next one is booked before sending, so a crash never double-sends. */
export async function runListReminders() {
  const due = (await pool.query(
    `SELECT r.list_id, r.every_days, l.name, u.id AS user_id, u.email FROM list_reminders r JOIN shopping_lists l ON l.id = r.list_id
       JOIN users u ON u.id = r.user_id AND u.disabled_at IS NULL AND u.deleted_at IS NULL
      WHERE r.next_at <= now() AND EXISTS (SELECT 1 FROM shopping_list_items i WHERE i.list_id = r.list_id) LIMIT 100`)).rows;
  let sent = 0;
  for (const d of due) {
    const claimed = await pool.query(`UPDATE list_reminders SET next_at = now() + make_interval(days => every_days) WHERE list_id = $1 AND next_at <= now() RETURNING list_id`, [d.list_id]);
    if (!claimed.rowCount) continue;
    await notify(pool, { userId: d.user_id, email: d.email, template: 'list_reminder', vars: { list: d.name, list_id: d.list_id }, transactional: true });   // requested by the customer, not marketing
    sent++;
  }
  await pool.query(`UPDATE list_reminders SET next_at = now() + make_interval(days => every_days) WHERE next_at <= now()`);   // empty lists just skip this round
  return sent;
}

/**
 * Tell each vendor which items are running low or sold out. One digest per vendor; an item is reported once, and again only after it was
 * restocked above its level and fell below it again. The items are claimed before sending so a crash never double-sends.
 */
export async function runLowStockAlerts() {
  // Restocked items become reportable again.
  await pool.query(`UPDATE store_offers SET low_stock_notified_at = NULL WHERE low_stock_notified_at IS NOT NULL AND stock_on_hand - stock_reserved > low_stock_threshold`);
  const vendors = (await pool.query(
    `SELECT DISTINCT s.vendor_id FROM store_offers o JOIN stores s ON s.id = o.store_id JOIN vendors v ON v.id = s.vendor_id AND v.low_stock_emails
      WHERE o.is_active AND o.low_stock_notified_at IS NULL AND o.stock_on_hand - o.stock_reserved <= o.low_stock_threshold LIMIT 100`)).rows;
  let sent = 0;
  for (const v of vendors) {
    const items = (await pool.query(
      `UPDATE store_offers o SET low_stock_notified_at = now() FROM stores s, products p, vendors vd
        WHERE s.id = o.store_id AND p.id = o.product_id AND vd.id = s.vendor_id AND s.vendor_id = $1 AND o.is_active AND o.low_stock_notified_at IS NULL AND o.stock_on_hand - o.stock_reserved <= o.low_stock_threshold
        RETURNING p.name, s.name AS store, o.stock_on_hand - o.stock_reserved AS available, vd.name AS vendor`, [v.vendor_id])).rows;
    if (!items.length) continue;
    const lines = items.slice(0, 30).map((i) => `- ${i.name} (${i.store}): ${i.available <= 0 ? 'sold out' : `${i.available} left`}`).join('\n') + (items.length > 30 ? `\n…and ${items.length - 30} more` : '');
    await notifyVendorOwners(pool, v.vendor_id, 'vendor_low_stock', { count: items.length, vendor: items[0].vendor, items: lines });
    sent++;
  }
  return sent;
}
