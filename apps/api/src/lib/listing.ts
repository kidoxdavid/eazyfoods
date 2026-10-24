import { pool } from '../db/pool.js';

/**
 * One definition of "a product card" so every grid (collections, deals, new arrivals, related, search) shows the same facts:
 * the best available price across orderable stores, whether it is on sale, stock, how many stores sell it, and a rating
 * that only appears once at least 3 verified purchasers have reviewed the product.
 */
/** Price per 100 g or per 100 ml, for weight/volume packs only. Sizes in other units (each, bunch, pack...) get no unit price rather than a made-up one. */
export const UNIT_QTY = (a = 'p') => `(CASE lower(${a}.pack_unit) WHEN 'g' THEN ${a}.pack_size / 100 WHEN 'kg' THEN ${a}.pack_size * 10 WHEN 'lb' THEN ${a}.pack_size * 4.53592 WHEN 'oz' THEN ${a}.pack_size * 0.283495
    WHEN 'ml' THEN ${a}.pack_size / 100 WHEN 'l' THEN ${a}.pack_size * 10 WHEN 'cl' THEN ${a}.pack_size / 10 END)`;
export const UNIT_BASIS = (a = 'p') => `(CASE WHEN lower(${a}.pack_unit) IN ('g','kg','lb','oz') THEN '100g' WHEN lower(${a}.pack_unit) IN ('ml','l','cl') THEN '100ml' END)`;

export const CARD_SELECT = `
  p.id, p.slug, p.name, p.pack_size, p.pack_unit, b.name AS brand, c.name AS category, c.slug AS category_slug, p.created_at,
  (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url,
  ${UNIT_BASIS()} AS unit_basis, round(off.min_price / NULLIF(${UNIT_QTY()}, 0))::int AS unit_price_cents,
  (SELECT jsonb_build_object('min_qty', t.min_qty, 'unit_price_cents', t.unit_price_cents) FROM offer_tiers t WHERE t.offer_id = off.offer_id ORDER BY t.min_qty LIMIT 1) AS multibuy,
  off.min_price, off.was_price, off.in_stock, off.on_sale, off.store_count, off.offer_id, off.store_name, off.store_slug, off.available,
  (SELECT CASE WHEN count(*) >= 3 THEN round(avg(r.rating)::numeric, 1)::float END FROM reviews r WHERE r.product_id = p.id AND NOT r.is_hidden) AS rating_avg,
  (SELECT count(*)::int FROM reviews r WHERE r.product_id = p.id AND NOT r.is_hidden) AS rating_count`;

export const CARD_FROM = `
  products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id
  JOIN LATERAL (
    SELECT COALESCE(min(o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0), min(o.price_cents)) AS min_price,
           max(o.compare_at_cents) AS was_price,
           COALESCE(bool_or(o.stock_on_hand - o.stock_reserved > 0), false) AS in_stock,
           COALESCE(bool_or(o.on_promotion), false) AS on_sale,
           count(DISTINCT o.store_id)::int AS store_count,
           (array_agg(o.id ORDER BY o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0))[1] AS offer_id,
           (array_agg(s.name ORDER BY o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0))[1] AS store_name,
           (array_agg(s.slug ORDER BY o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0))[1] AS store_slug,
           (array_agg(o.stock_on_hand - o.stock_reserved ORDER BY o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0))[1] AS available
      FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable
     WHERE o.product_id = p.id AND o.is_active) off ON off.store_count > 0`;

export async function productCards(where: string, params: unknown[], order = 'p.name', limit = 24) {
  const { rows } = await pool.query(
    `SELECT ${CARD_SELECT} FROM ${CARD_FROM} WHERE p.status = 'published' AND (${where}) ORDER BY ${order} LIMIT ${Math.min(limit, 100)}`, params);
  return rows.map(({ id: _id, created_at: _c, ...r }) => r);
}
