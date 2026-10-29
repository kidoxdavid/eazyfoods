import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { pool, tx } from '../db/pool.js';
import { audit, canManageStore } from '../lib/auth.js';
import { requireLogin } from '../lib/permissions.js';
import { bad, conflict, forbidden, notFound } from '../lib/errors.js';
import { norm, slugify } from '../lib/norm.js';
import { isOurImageUrl } from '../lib/storage.js';
import { featureOn } from '../services/features.js';
import { vendorIdsOf } from './vendorOrders.js';
import { rl } from '../lib/ratelimit.js';
import { barcodeCode, lookupBarcode } from '../services/barcodeLookup.js';
import { isCanadianPostal, normalisePostal } from '../services/pricing.js';

/**
 * The vendor's own product list: shared catalogue products they sell plus products they created, each with this store's price and stock.
 * Shaped like the original EAZyfoods vendor portal expects (price / sale_price / stock_quantity / status), so that portal's pages work unchanged.
 */
const LIST_SQL = `
  SELECT p.id, o.id AS offer_id, p.name, p.description, p.slug, p.sku, p.barcode, p.category_id, p.status AS product_status, p.pack_unit, p.sold_by,
         o.price_cents, o.compare_at_cents, o.stock_on_hand, o.stock_reserved, o.low_stock_threshold, o.is_active, o.track_expiry, o.expiry_date, o.is_featured, o.is_newly_stocked, o.updated_at,
         (p.suggested_by_vendor_id = s.vendor_id OR p.owner_store_id = s.id) AS owned, s.id AS store_id, c.name AS category_name,
         (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image_url,
         (SELECT COALESCE(json_agg(url ORDER BY sort_order, id), '[]') FROM product_images WHERE product_id = p.id) AS images
    FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id LEFT JOIN categories c ON c.id = p.category_id
   WHERE o.store_id = $1 AND p.status <> 'archived'`;

const dollars = (c: number | null) => (c == null ? null : c / 100);
export function shape(r: any) {
  const onSale = r.compare_at_cents != null && r.compare_at_cents > r.price_cents;
  const available = r.stock_on_hand - r.stock_reserved;
  const images: string[] = r.images ?? [];
  return {
    id: r.id, offer_id: r.offer_id, store_id: r.store_id, name: r.name, description: r.description ?? '', slug: r.slug, sku: r.sku ?? '', barcode: r.barcode ?? '',
    category_id: r.category_id, category_name: r.category_name, unit: r.pack_unit || 'piece',
    price: dollars(onSale ? r.compare_at_cents : r.price_cents), sale_price: onSale ? dollars(r.price_cents) : null,
    stock_quantity: r.stock_on_hand, reserved: r.stock_reserved, low_stock_threshold: r.low_stock_threshold,
    track_expiry: r.track_expiry, expiry_date: r.expiry_date ? new Date(r.expiry_date).toISOString().slice(0, 10) : null,
    status: !r.is_active ? 'hidden' : available <= 0 ? 'out_of_stock' : 'active',
    is_featured: r.is_featured, is_newly_stocked: r.is_newly_stocked, image_url: r.image_url, images: images.slice(1),
    owned: !!r.owned, pending_review: r.product_status === 'pending', updated_at: r.updated_at,
  };
}

const cents = (d: number | string) => Math.round(Number(d) * 100);
const img = z.string().refine(isOurImageUrl, 'Upload the image through EAZyfoods first.').nullable().optional().or(z.literal(''));
const body = z.object({
  name: z.string().trim().min(2).max(160), description: z.string().max(1500).optional().nullable(),
  price: z.coerce.number().positive().max(10000), sale_price: z.coerce.number().positive().max(10000).nullable().optional().or(z.literal('')),
  category_id: z.string().uuid().nullable().optional().or(z.literal('')), sku: z.string().max(64).optional().nullable(), barcode: z.string().max(32).optional().nullable(),
  unit: z.string().max(20).optional().nullable(), stock_quantity: z.coerce.number().int().min(0).max(100000).default(0), low_stock_threshold: z.coerce.number().int().min(0).max(100000).default(3),
  track_expiry: z.boolean().default(false), expiry_date: z.string().optional().nullable().or(z.literal('')),
  status: z.enum(['active', 'hidden', 'out_of_stock', 'draft']).default('active'), is_featured: z.boolean().default(false), is_newly_stocked: z.boolean().default(false),
  image_url: img, images: z.array(z.string()).nullable().optional(),
});

export const vendorCatalogueRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const store = async (req: any) => {
    const id = z.string().uuid().parse(req.params.storeId);
    if (!(await canManageStore(req.user, id))) throw forbidden();
    return id;
  };
  const one = async (sid: string, pid: string) => {
    const r = (await pool.query(`${LIST_SQL} AND p.id = $2`, [sid, pid])).rows[0];
    if (!r) throw notFound('Product not found');
    return shape(r);
  };

  // ---- More than one store under the same vendor (the original "Stores" page) ----
  const vendorOf = (req: any) => { const v = vendorIdsOf(req.user)[0]; if (!v) throw forbidden('This account is not linked to a store.'); return v as string; };
  const storeBody = z.object({
    name: z.string().trim().min(2).max(120), description: z.string().max(1500).nullish(), address_line: z.string().trim().min(3).max(160), city: z.string().trim().min(1).max(80).default('Calgary'),
    postal_code: z.string().refine(isCanadianPostal, 'Enter a valid Canadian postal code'), phone: z.string().max(25).nullish(), min_order_cents: z.number().int().min(0).max(100000).nullish(),
    offers_delivery: z.boolean().default(true), offers_pickup: z.boolean().default(false), ordering_paused: z.boolean().default(false),
  });
  app.post('/stores', async (req, reply) => {
    const vid = vendorOf(req); const b = storeBody.parse(req.body);
    const kind = (await pool.query('SELECT kind FROM vendors WHERE id = $1', [vid])).rows[0].kind;
    const out = await tx(async (c) => {
      let slug = slugify(b.name), n = 1;
      while ((await c.query('SELECT 1 FROM stores WHERE slug = $1', [slug])).rowCount) slug = `${slugify(b.name)}-${++n}`;
      const st = (await c.query(
        `INSERT INTO stores(vendor_id, slug, name, description, address_line, city, postal_code, phone, min_order_cents, offers_delivery, offers_pickup, ordering_paused, kind, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending') RETURNING id`,
        [vid, slug, b.name, b.description ?? null, b.address_line, b.city, normalisePostal(b.postal_code), b.phone ?? null, b.min_order_cents ?? null, b.offers_delivery, b.offers_pickup, b.ordering_paused, kind === 'chef' ? 'kitchen' : 'grocery'])).rows[0];
      await audit(req.user!.id, 'store.created_by_vendor', 'store', st.id, {}, c);
      return st.id as string;
    });
    return reply.code(201).send({ id: out, status: 'pending', message: 'Store added. It goes live once our team publishes it.' });
  });

  // Delete a store: gone completely when it never had orders, otherwise taken off the marketplace (suspended) and its history kept.
  app.delete<{ Params: { storeId: string } }>('/stores/:storeId', async (req) => {
    const sid = await store(req);
    return tx(async (c) => {
      const left = (await c.query('SELECT count(*)::int n FROM stores WHERE vendor_id = (SELECT vendor_id FROM stores WHERE id = $1) AND status <> \'suspended\'', [sid])).rows[0].n;
      if (left <= 1) throw conflict('last_store', 'You need at least one store. Add another one first, or contact EAZyfoods to close your account.');
      let deleted = false;
      await c.query('SAVEPOINT delstore');
      try {
        const offers = `(SELECT id FROM store_offers WHERE store_id = $1)`;
        for (const t of ['offer_tiers', 'offer_promotions', 'cart_items', 'inventory_reservations']) await c.query(`DELETE FROM ${t} WHERE offer_id IN ${offers}`, [sid]);
        await c.query('DELETE FROM store_offers WHERE store_id = $1', [sid]);
        await c.query('DELETE FROM stores WHERE id = $1', [sid]);
        deleted = true; await c.query('RELEASE SAVEPOINT delstore');
      } catch (e: any) { await c.query('ROLLBACK TO SAVEPOINT delstore'); if (e.code !== '23503') throw e; }
      if (!deleted) { await c.query(`UPDATE store_offers SET is_active = false WHERE store_id = $1`, [sid]); await c.query(`UPDATE stores SET status = 'suspended' WHERE id = $1`, [sid]); }
      await audit(req.user!.id, deleted ? 'store.deleted_by_vendor' : 'store.closed_by_vendor', 'store', sid, {}, c);
      return { deleted, closed: !deleted, message: deleted ? 'Store deleted.' : 'This store has orders, so it was closed instead of deleted. Its history is kept.' };
    });
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/catalogue', async (req) => (await pool.query(`${LIST_SQL} ORDER BY lower(p.name)`, [await store(req)])).rows.map(shape));

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/catalogue/expiring', async (req) => {
    const rows = (await pool.query(`${LIST_SQL} AND o.track_expiry AND o.expiry_date IS NOT NULL AND o.expiry_date <= current_date + 14 ORDER BY o.expiry_date`, [await store(req)])).rows;
    return rows.map(shape);
  });

  // Every stock movement in this store, newest first (the original Inventory page).
  app.get<{ Params: { storeId: string } }>('/stores/:storeId/adjustments', async (req) => {
    const sid = await store(req);
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(500).default(50) }).parse(req.query);
    return (await pool.query(
      `SELECT a.id, a.created_at, a.reason, a.note, a.delta, a.resulting_on_hand, p.name AS product_name, p.id AS product_id, u.full_name AS actor
         FROM inventory_adjustments a JOIN store_offers o ON o.id = a.offer_id JOIN products p ON p.id = o.product_id LEFT JOIN users u ON u.id = a.actor_user_id
        WHERE o.store_id = $1 ORDER BY a.id DESC LIMIT $2`, [sid, limit])).rows;
  });

  app.get<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/catalogue/:productId', async (req) => one(await store(req), z.string().uuid().parse(req.params.productId)));

  app.get<{ Params: { storeId: string }; Querystring: { code?: string } }>('/stores/:storeId/barcode', async (req) => {
    const sid = await store(req);
    const code = z.string().min(3).max(32).parse(req.query.code);
    const r = (await pool.query(`${LIST_SQL} AND p.barcode = $2`, [sid, code])).rows[0];
    if (!r) throw notFound('No product with that barcode in your store');
    return shape(r);
  });

  // Fills in a new product from a public database when the barcode is not in the catalogue yet. Never blocks: "found: false" just means type it in.
  app.get<{ Params: { storeId: string }; Querystring: { code?: string } }>('/stores/:storeId/barcode/suggest', rl(120, '1 hour'), async (req) => {
    await store(req);
    const code = barcodeCode.parse(req.query.code);
    const mine = (await pool.query('SELECT 1 FROM products WHERE barcode = $1', [code])).rowCount;
    if (mine) return { found: false, exists: true };
    const s = await lookupBarcode(code);
    return s ? { found: true, exists: false, suggestion: s } : { found: false, exists: false };
  });

  // Create a product and list it in this store. It waits for approval when the platform switch says so.
  app.post<{ Params: { storeId: string } }>('/stores/:storeId/catalogue', async (req, reply) => {
    const sid = await store(req);
    const b = body.parse(req.body);
    const review = await featureOn('vendor.products_need_review');
    const price = cents(b.price), sale = b.sale_price ? cents(b.sale_price as number) : null;
    if (sale != null && sale >= price) throw bad('invalid_sale_price', 'The sale price must be lower than the regular price.');
    const out = await tx(async (c) => {
      const st = (await c.query('SELECT vendor_id, kind FROM stores WHERE id = $1', [sid])).rows[0];
      let slug = slugify(b.name), n = 1;
      while ((await c.query('SELECT 1 FROM products WHERE slug = $1', [slug])).rowCount) slug = `${slugify(b.name)}-${++n}`;
      const p = (await c.query(
        `INSERT INTO products(slug,name,name_norm,description,category_id,sku,barcode,pack_unit,sold_by,status,suggested_by_vendor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'unit',$9,$10) RETURNING id`,
        [slug, b.name, norm(b.name), b.description || null, b.category_id || null, b.sku || null, b.barcode || null, b.unit || null, review ? 'pending' : 'published', st.vendor_id])).rows[0];
      const urls = [b.image_url, ...(b.images ?? [])].filter((u): u is string => !!u && isOurImageUrl(u));
      for (const [i, u] of urls.entries()) await c.query('INSERT INTO product_images(product_id, url, alt, sort_order, uploaded_by) VALUES ($1,$2,$3,$4,$5)', [p.id, u, b.name, i, req.user!.id]);
      const o = (await c.query(
        `INSERT INTO store_offers(store_id, product_id, price_cents, compare_at_cents, stock_on_hand, low_stock_threshold, is_active, track_expiry, expiry_date, is_featured, is_newly_stocked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [sid, p.id, sale ?? price, sale != null ? price : null, b.stock_quantity, b.low_stock_threshold, b.status !== 'hidden' && b.status !== 'draft', b.track_expiry, b.track_expiry && b.expiry_date ? b.expiry_date : null, b.is_featured, b.is_newly_stocked])).rows[0];
      if (b.stock_quantity > 0) await c.query(`INSERT INTO inventory_adjustments(offer_id, delta, reason, note, actor_user_id, resulting_on_hand) VALUES ($1,$2,'initial','Initial stock',$3,$2)`, [o.id, b.stock_quantity, req.user!.id]);
      await audit(req.user!.id, 'product.created_by_vendor', 'product', p.id, { store: sid, review }, c);
      return p.id as string;
    }).catch((e) => { if (e.code === '23505') throw conflict('duplicate_barcode', 'A product with that barcode already exists. Search for it instead.'); throw e; });
    return reply.code(201).send({ ...(await one(sid, out)), needs_review: review });
  });

  app.put<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/catalogue/:productId', async (req) => {
    const sid = await store(req); const pid = z.string().uuid().parse(req.params.productId);
    const b = body.parse(req.body);
    const price = cents(b.price), sale = b.sale_price ? cents(b.sale_price as number) : null;
    if (sale != null && sale >= price) throw bad('invalid_sale_price', 'The sale price must be lower than the regular price.');
    await tx(async (c) => {
      const cur = (await c.query(`SELECT o.id, o.stock_on_hand, o.stock_reserved, (p.suggested_by_vendor_id = s.vendor_id OR p.owner_store_id = s.id) AS owned
                                    FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE o.store_id = $1 AND o.product_id = $2 FOR UPDATE OF o`, [sid, pid])).rows[0];
      if (!cur) throw notFound('Product not found');
      if (b.stock_quantity < cur.stock_reserved) throw bad('below_reserved', `${cur.stock_reserved} are reserved for open orders; stock cannot be lower than that.`);
      if (cur.owned) {
        await c.query(`UPDATE products SET name=$2, name_norm=$3, description=$4, category_id=$5, sku=$6, barcode=$7, pack_unit=$8 WHERE id=$1`,
          [pid, b.name, norm(b.name), b.description || null, b.category_id || null, b.sku || null, b.barcode || null, b.unit || null]);
        const sent = req.body as Record<string, unknown>;
        if ('image_url' in sent || 'images' in sent) {   // only touch the pictures when the form sent them
        const urls = [b.image_url, ...(b.images ?? [])].filter((u): u is string => !!u && isOurImageUrl(u));
        await c.query('DELETE FROM product_images WHERE product_id = $1', [pid]);
        for (const [i, u] of urls.entries()) await c.query('INSERT INTO product_images(product_id, url, alt, sort_order, uploaded_by) VALUES ($1,$2,$3,$4,$5)', [pid, u, b.name, i, req.user!.id]);
        }
      }
      await c.query(
        `UPDATE store_offers SET price_cents=$2, compare_at_cents=$3, stock_on_hand=$4, low_stock_threshold=$5, is_active=$6, track_expiry=$7, expiry_date=$8, is_featured=$9, is_newly_stocked=$10, updated_at=now() WHERE id=$1`,
        [cur.id, sale ?? price, sale != null ? price : null, b.stock_quantity, b.low_stock_threshold, b.status !== 'hidden' && b.status !== 'draft', b.track_expiry, b.track_expiry && b.expiry_date ? b.expiry_date : null, b.is_featured, b.is_newly_stocked]);
      if (b.stock_quantity !== cur.stock_on_hand) await c.query(`INSERT INTO inventory_adjustments(offer_id, delta, reason, note, actor_user_id, resulting_on_hand) VALUES ($1,$2,'correction','Set from product page',$3,$4)`, [cur.id, b.stock_quantity - cur.stock_on_hand, req.user!.id, b.stock_quantity]);
      await audit(req.user!.id, 'product.updated_by_vendor', 'product', pid, { store: sid }, c);
    }).catch((e) => { if (e.code === '23505') throw conflict('duplicate_barcode', 'Another product already uses that barcode.'); throw e; });
    return one(sid, pid);
  });

  // Remove from this store. If nothing refers to it the listing is deleted outright (and the product too when this vendor created it and nobody else sells it);
  // if it has orders behind it, it is hidden and the history stays.
  app.delete<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/catalogue/:productId', async (req) => {
    const sid = await store(req); const pid = z.string().uuid().parse(req.params.productId);
    return tx(async (c) => {
      const o = (await c.query(`SELECT o.id, (p.suggested_by_vendor_id = s.vendor_id OR p.owner_store_id = s.id) AS owned FROM store_offers o JOIN products p ON p.id = o.product_id JOIN stores s ON s.id = o.store_id WHERE o.store_id = $1 AND o.product_id = $2 FOR UPDATE OF o`, [sid, pid])).rows[0];
      if (!o) throw notFound('Product not found');
      let deleted = false;
      await c.query('SAVEPOINT del2');
      try {
        await c.query('DELETE FROM offer_tiers WHERE offer_id = $1', [o.id]); await c.query('DELETE FROM offer_promotions WHERE offer_id = $1', [o.id]); await c.query('DELETE FROM cart_items WHERE offer_id = $1', [o.id]);
        await c.query('DELETE FROM inventory_reservations WHERE offer_id = $1', [o.id]);
        await c.query('DELETE FROM store_offers WHERE id = $1', [o.id]);
        deleted = true; await c.query('RELEASE SAVEPOINT del2');
      } catch (e: any) { await c.query('ROLLBACK TO SAVEPOINT del2'); if (e.code !== '23503') throw e; }
      if (!deleted) {
        await c.query('UPDATE store_offers SET is_active = false, updated_at = now() WHERE id = $1', [o.id]);
      } else if (o.owned && !(await c.query('SELECT 1 FROM store_offers WHERE product_id = $1', [pid])).rowCount) {
        await c.query('SAVEPOINT delp');
        try { await c.query('DELETE FROM product_images WHERE product_id = $1', [pid]); await c.query('DELETE FROM products WHERE id = $1', [pid]); await c.query('RELEASE SAVEPOINT delp'); }
        catch (e: any) { await c.query('ROLLBACK TO SAVEPOINT delp'); if (e.code !== '23503') throw e; await c.query(`UPDATE products SET status = 'archived' WHERE id = $1`, [pid]); }
      }
      await audit(req.user!.id, deleted ? 'product.deleted_by_vendor' : 'product.hidden_by_vendor', 'product', pid, { store: sid }, c);
      return { deleted, hidden: !deleted, message: deleted ? 'Product deleted.' : 'This product has orders, so it was hidden from customers instead of deleted. Its history is kept.' };
    });
  });

  // Give a product a barcode, or (regenerate) replace it with a new one. Only for products this vendor created: a shared catalogue product's barcode is the manufacturer's.
  app.post<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/catalogue/:productId/barcode', async (req) => {
    const sid = await store(req); const pid = z.string().uuid().parse(req.params.productId);
    const { regenerate } = z.object({ regenerate: z.boolean().default(false) }).parse(req.body ?? {});
    const p = await one(sid, pid);
    if (p.barcode && !regenerate) return { barcode: p.barcode };
    if (!p.owned) throw bad('not_yours', 'Only products you created can be given a new barcode.');
    for (let i = 0; i < 20; i++) {
      const base = '200' + String(randomInt(0, 1e9)).padStart(9, '0');   // 200-299 prefixes are for in-store use
      const check = (10 - (base.split('').reduce((a, d, k) => a + Number(d) * (k % 2 ? 3 : 1), 0) % 10)) % 10;
      const code = base + check;
      const r = await pool.query('UPDATE products SET barcode = $2 WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM products WHERE barcode = $2) RETURNING barcode', [pid, code]);
      if (r.rowCount) { await audit(req.user!.id, p.barcode ? 'product.barcode_regenerated' : 'product.barcode_generated', 'product', pid, { store: sid, previous: p.barcode || null }); return { barcode: code, previous: p.barcode || null }; }
    }
    throw conflict('barcode_failed', 'Could not generate a barcode. Try again.');
  });

  // Remove a product's barcode (it can be generated again, or typed in, later).
  app.delete<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/catalogue/:productId/barcode', async (req) => {
    const sid = await store(req); const pid = z.string().uuid().parse(req.params.productId);
    const p = await one(sid, pid);
    if (!p.owned) throw bad('not_yours', 'Only products you created can have their barcode removed.');
    if (!p.barcode) return { barcode: null };
    await pool.query('UPDATE products SET barcode = NULL WHERE id = $1', [pid]);
    await audit(req.user!.id, 'product.barcode_removed', 'product', pid, { store: sid, previous: p.barcode });
    return { barcode: null, previous: p.barcode };
  });
};
