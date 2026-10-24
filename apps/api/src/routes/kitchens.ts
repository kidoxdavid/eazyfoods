import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit, canManageStore } from '../lib/auth.js';
import { bad, forbidden, notFound } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { norm, slugify } from '../lib/norm.js';
import { requireLogin, requirePerm } from '../lib/permissions.js';
import { isOurImageUrl, isOurVideoUrl } from '../lib/storage.js';
import { assertVendorCan, featureOn } from '../services/features.js';
import { ACCENTS } from '../lib/themes.js';
import { notifyVendorOwners } from '../services/notify.js';
import { listSlots } from '../services/slots.js';

/** Canada's priority food allergens, plus gluten sources. Cooks must declare allergens for every dish. */
export const ALLERGENS = ['peanuts', 'tree_nuts', 'sesame', 'milk', 'eggs', 'fish', 'crustaceans', 'molluscs', 'soy', 'wheat', 'gluten', 'mustard', 'sulphites'] as const;
/** Declared by the cook; EAZyfoods does not verify these and says so wherever they are shown. */
export const DISH_TAGS = ['halal', 'vegan', 'vegetarian', 'pescatarian', 'gluten_free', 'dairy_free'] as const;

const kitchensOn = async () => getSetting<boolean>('kitchens.enabled').catch(() => true);

/** Public: browse home kitchens. Street addresses of cooks are never published; only city and postal area. */
export const kitchenRoutes: FastifyPluginAsync = async (app) => {
  app.get('/kitchens', async (req) => {
    if (!(await kitchensOn())) return [];
    const { cuisine, type } = z.object({ cuisine: z.string().max(40).optional(), type: z.enum(['home', 'restaurant']).optional() }).parse(req.query);
    const restaurants = await featureOn('shop.restaurants');
    return (await pool.query(
      `SELECT s.slug, s.name, s.description, s.city, left(s.postal_code, 3) AS area, ks.kitchen_type, CASE WHEN ks.kitchen_type = 'restaurant' THEN s.address_line END AS address_line, s.is_open, s.min_order_cents, s.is_test_data, s.logo_url, s.cover_url, s.cuisines, s.ordering_paused,
              (SELECT count(*)::int FROM store_offers o JOIN products p ON p.id = o.product_id AND p.status = 'dish_live' WHERE o.store_id = s.id AND o.is_active) AS dish_count,
              (SELECT min(o.price_cents)::int FROM offers_live o JOIN products p ON p.id = o.product_id AND p.status = 'dish_live' WHERE o.store_id = s.id AND o.is_active) AS from_cents
         FROM storefronts s JOIN stores ks ON ks.id = s.id
        WHERE s.orderable AND s.kind = 'kitchen' AND ($1::text IS NULL OR $1 = ANY(s.cuisines)) AND ($2::text IS NULL OR ks.kitchen_type = $2) AND ($3 OR ks.kitchen_type = 'home')
        ORDER BY s.is_open DESC, s.name`, [cuisine ?? null, type ?? null, restaurants])).rows;
  });

  /** Bookable pre-order slots for any store that takes pre-orders (kitchens by default). */
  app.get<{ Params: { slug: string } }>('/slots/:slug', async (req) => {
    const s = (await pool.query(`SELECT id, name, preorders_enabled, preorder_lead_minutes, preorder_max_days, slot_minutes, timezone FROM storefronts WHERE slug = $1 AND orderable`, [req.params.slug])).rows[0];
    if (!s) throw notFound('Store not found');
    if (!s.preorders_enabled) return { enabled: false, slots: [] };
    return { enabled: true, timezone: s.timezone, lead_minutes: s.preorder_lead_minutes, max_days: s.preorder_max_days, slot_minutes: s.slot_minutes, slots: await listSlots(pool, s.id) };
  });

  app.get('/kitchens/cuisines', async () =>
    (await pool.query(`SELECT c AS name, count(*)::int AS kitchens FROM storefronts s, unnest(s.cuisines) c WHERE s.orderable AND s.kind = 'kitchen' GROUP BY c ORDER BY kitchens DESC, c`)).rows);

  /** A dish page link (e.g. from an old basket) resolves to the kitchen that sells it. */
  app.get<{ Params: { slug: string } }>('/kitchens/dish/:slug', async (req) => {
    const r = (await pool.query(`SELECT s.slug AS kitchen_slug FROM products p JOIN stores s ON s.id = p.owner_store_id WHERE p.slug = $1 AND p.status = 'dish_live'`, [req.params.slug])).rows[0];
    if (!r) throw notFound('Dish not found');
    return r;
  });

  app.get<{ Params: { slug: string } }>('/kitchens/:slug', async (req) => {
    if (!(await kitchensOn())) throw notFound('Kitchen not found');
    const s = (await pool.query(`SELECT * FROM storefronts WHERE slug = $1 AND orderable AND kind = 'kitchen'`, [req.params.slug])).rows[0];
    if (!s) throw notFound('Kitchen not found');
    const ext = (await pool.query('SELECT kitchen_type, video_url, address_line, phone FROM stores WHERE id = $1', [s.id])).rows[0];
    if (ext.kitchen_type === 'restaurant' && !(await featureOn('shop.restaurants'))) throw notFound('Kitchen not found');
    const showVideo = await featureOn('shop.vendor_videos');
    const restaurant = ext.kitchen_type === 'restaurant';
    const [hours, dishes, branding] = await Promise.all([
      pool.query('SELECT dow, opens, closes FROM store_hours WHERE store_id = $1 ORDER BY dow, opens', [s.id]),
      pool.query(
        `SELECT p.slug, p.name, p.description, p.cuisine, p.spice_level, p.serves, p.prep_minutes, p.allergens, p.ingredients, p.dish_tags, p.menu_section, p.video_url,
                o.id AS offer_id, o.price_cents, o.compare_at_cents, o.on_promotion, GREATEST(o.stock_on_hand - o.stock_reserved, 0) AS available,
                (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url
           FROM offers_live o JOIN products p ON p.id = o.product_id AND p.status = 'dish_live'
          WHERE o.store_id = $1 AND o.is_active ORDER BY p.menu_section NULLS LAST, p.name`, [s.id]),
      pool.query('SELECT accent, tagline, story, announcement, website, instagram, facebook FROM store_branding WHERE store_id = $1', [s.id]),
    ]);
    const br = branding.rows[0];
    return {
      slug: s.slug, name: s.name, description: s.description, city: s.city, area: (s.postal_code ?? '').slice(0, 3), kitchen_type: ext.kitchen_type, address_line: restaurant ? ext.address_line : null, postal_code: restaurant ? s.postal_code : null, phone: restaurant ? ext.phone : null, video_url: showVideo ? ext.video_url : null, is_open: s.is_open, min_order_cents: s.min_order_cents,
      is_test_data: s.is_test_data, logo_url: s.logo_url, cover_url: s.cover_url, policies: s.policies, offers_delivery: s.offers_delivery, offers_pickup: s.offers_pickup, ordering_paused: s.ordering_paused,
      cuisines: s.cuisines, preorders_enabled: s.preorders_enabled, hours: hours.rows, dishes: dishes.rows.map((d) => (showVideo ? d : { ...d, video_url: null })),
      branding: br ? { ...br, accent: br.accent && ACCENTS[br.accent] ? { primary: ACCENTS[br.accent].primary, deep: ACCENTS[br.accent].deep, tint: ACCENTS[br.accent].tint, glow: ACCENTS[br.accent].glow } : null } : null,
      allergen_notice: 'Allergens and dietary labels are declared by the cook and are not verified by EAZyfoods. If you have a severe allergy, message the cook before ordering.',
    };
  });
};

const img = z.string().refine(isOurImageUrl, 'Upload the image through EAZyfoods first.').nullable().optional();
const dishBody = z.object({
  name: z.string().trim().min(2).max(80), description: z.string().trim().max(600).nullable().optional(), cuisine: z.string().trim().max(40).nullable().optional(),
  price_cents: z.number().int().min(100).max(50000), portions: z.number().int().min(0).max(200),
  serves: z.string().trim().max(30).nullable().optional(), spice_level: z.number().int().min(0).max(3).nullable().optional(), prep_minutes: z.number().int().min(5).max(1440).nullable().optional(),
  allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length), allergens_confirmed: z.literal(true, { errorMap: () => ({ message: 'Confirm the allergen list is complete before saving.' }) }),
  ingredients: z.string().trim().max(800).nullable().optional(), dish_tags: z.array(z.enum(DISH_TAGS)).max(DISH_TAGS.length).default([]),
  image_url: img, is_active: z.boolean().default(true),
  menu_section: z.string().trim().min(2).max(40).nullable().optional(),
  video_url: z.string().refine(isOurVideoUrl, 'Upload the video through EAZyfoods first.').nullable().optional(),
});

const DISH_SELECT = `SELECT p.id AS product_id, p.slug, p.name, p.description, p.cuisine, p.spice_level, p.serves, p.prep_minutes, p.allergens, p.ingredients, p.dish_tags, p.status, p.menu_section, p.video_url,
       o.id AS offer_id, o.price_cents, o.stock_on_hand, o.stock_reserved, o.is_active,
       (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url
  FROM store_offers o JOIN products p ON p.id = o.product_id AND p.owner_store_id = o.store_id`;

/** Vendor side: a cook manages their own menu. */
export const dishRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const kitchen = async (req: any) => {
    const id = z.string().uuid().parse(req.params.storeId);
    if (!(await canManageStore(req.user, id))) throw forbidden();
    const s = (await pool.query('SELECT id, slug, kind, vendor_id FROM stores WHERE id = $1', [id])).rows[0];
    if (s?.kind !== 'kitchen') throw bad('not_a_kitchen', 'Menus are only for kitchens and restaurants.');
    return s as { id: string; slug: string; kind: string; vendor_id: string };
  };

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/dishes', async (req) => {
    const s = await kitchen(req);
    return { dishes: (await pool.query(`${DISH_SELECT} WHERE o.store_id = $1 AND p.status IN ('dish_live','draft') ORDER BY p.name`, [s.id])).rows, allergens: ALLERGENS, tags: DISH_TAGS };
  });

  app.post<{ Params: { storeId: string } }>('/stores/:storeId/dishes', async (req, reply) => {
    const s = await kitchen(req);
    const b = dishBody.parse(req.body);
    const out = await tx(async (c) => {
      let slug = slugify(`${s.slug}-${b.name}`).slice(0, 90), n = 1;
      while ((await c.query('SELECT 1 FROM products WHERE slug = $1', [slug])).rowCount) slug = `${slugify(`${s.slug}-${b.name}`).slice(0, 84)}-${++n}`;
      const p = (await c.query(
        `INSERT INTO products(slug, name, name_norm, description, status, sold_by, tax_class, owner_store_id, cuisine, spice_level, serves, prep_minutes, allergens, ingredients, dish_tags, menu_section, video_url)
         VALUES ($1,$2,$3,$4,'dish_live','unit','standard',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [slug, b.name, norm(b.name), b.description ?? null, s.id, b.cuisine ?? null, b.spice_level ?? null, b.serves ?? null, b.prep_minutes ?? null, b.allergens, b.ingredients ?? null, b.dish_tags, b.menu_section ?? null, b.video_url ?? null])).rows[0];
      if (b.video_url) await assertVendorCan(s.vendor_id, 'videos', c);
      if (b.image_url) await c.query('INSERT INTO product_images(product_id, url, alt, sort_order) VALUES ($1,$2,$3,0)', [p.id, b.image_url, b.name]);
      const o = (await c.query('INSERT INTO store_offers(store_id, product_id, price_cents, stock_on_hand, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id', [s.id, p.id, b.price_cents, b.portions, b.is_active])).rows[0];
      await c.query(`INSERT INTO inventory_adjustments(offer_id, delta, reason, actor_user_id, resulting_on_hand) VALUES ($1,$2,'initial',$3,$2)`, [o.id, b.portions, req.user!.id]);
      await audit(req.user!.id, 'dish.created', 'product', p.id, { name: b.name }, c);
      return { product_id: p.id as string, offer_id: o.id as string, slug };
    });
    return reply.code(201).send(out);
  });

  app.put<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/dishes/:productId', async (req) => {
    const s = await kitchen(req);
    const pid = z.string().uuid().parse(req.params.productId);
    const b = dishBody.parse(req.body);
    await tx(async (c) => {
      const o = (await c.query(`SELECT o.id, o.stock_on_hand, o.stock_reserved FROM store_offers o JOIN products p ON p.id = o.product_id AND p.owner_store_id = o.store_id WHERE o.store_id = $1 AND o.product_id = $2 AND p.status IN ('dish_live','draft') FOR UPDATE OF o`, [s.id, pid])).rows[0];
      if (!o) throw notFound('Dish not found');
      if (b.portions < o.stock_reserved) throw bad('below_reserved', `${o.stock_reserved} portions are reserved for open orders; you cannot set fewer than that.`);
      await c.query(`UPDATE products SET name=$2, name_norm=$3, description=$4, cuisine=$5, spice_level=$6, serves=$7, prep_minutes=$8, allergens=$9, ingredients=$10, dish_tags=$11, menu_section=$12, video_url = CASE WHEN $13::boolean THEN $14 ELSE video_url END WHERE id=$1`,
        [pid, b.name, norm(b.name), b.description ?? null, b.cuisine ?? null, b.spice_level ?? null, b.serves ?? null, b.prep_minutes ?? null, b.allergens, b.ingredients ?? null, b.dish_tags, b.menu_section ?? null, b.video_url !== undefined, b.video_url ?? null]);
      if (b.video_url) await assertVendorCan(s.vendor_id, 'videos', c);
      if (b.image_url !== undefined) { await c.query('DELETE FROM product_images WHERE product_id = $1', [pid]); if (b.image_url) await c.query('INSERT INTO product_images(product_id, url, alt, sort_order) VALUES ($1,$2,$3,0)', [pid, b.image_url, b.name]); }
      await c.query('UPDATE store_offers SET price_cents = $2, stock_on_hand = $3, is_active = $4, updated_at = now() WHERE id = $1', [o.id, b.price_cents, b.portions, b.is_active]);
      if (b.portions !== o.stock_on_hand) await c.query(`INSERT INTO inventory_adjustments(offer_id, delta, reason, note, actor_user_id, resulting_on_hand) VALUES ($1,$2,'correction','Portions set from menu',$3,$4)`, [o.id, b.portions - o.stock_on_hand, req.user!.id, b.portions]);
      await audit(req.user!.id, 'dish.updated', 'product', pid, { name: b.name }, c);
    });
    return { ok: true };
  });

  /** Quick change of today's portions, without re-submitting the dish. */
  app.put<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/dishes/:productId/portions', async (req) => {
    const s = await kitchen(req);
    const pid = z.string().uuid().parse(req.params.productId);
    const { portions } = z.object({ portions: z.number().int().min(0).max(200) }).parse(req.body);
    await tx(async (c) => {
      const o = (await c.query(`SELECT o.id, o.stock_on_hand, o.stock_reserved FROM store_offers o JOIN products p ON p.id = o.product_id AND p.owner_store_id = o.store_id WHERE o.store_id = $1 AND o.product_id = $2 AND p.status IN ('dish_live','draft') FOR UPDATE OF o`, [s.id, pid])).rows[0];
      if (!o) throw notFound('Dish not found');
      if (portions < o.stock_reserved) throw bad('below_reserved', `${o.stock_reserved} portions are reserved for open orders; you cannot set fewer than that.`);
      if (portions === o.stock_on_hand) return;
      await c.query('UPDATE store_offers SET stock_on_hand = $2, updated_at = now() WHERE id = $1', [o.id, portions]);
      await c.query(`INSERT INTO inventory_adjustments(offer_id, delta, reason, note, actor_user_id, resulting_on_hand) VALUES ($1,$2,'correction','Portions set from menu',$3,$4)`, [o.id, portions - o.stock_on_hand, req.user!.id, portions]);
    });
    return { ok: true };
  });

  app.delete<{ Params: { storeId: string; productId: string } }>('/stores/:storeId/dishes/:productId', async (req) => {
    const s = await kitchen(req);
    const pid = z.string().uuid().parse(req.params.productId);
    await tx(async (c) => {
      const r = await c.query(`UPDATE products SET status = 'archived' WHERE id = $1 AND owner_store_id = $2 RETURNING id`, [pid, s.id]);
      if (!r.rowCount) throw notFound('Dish not found');
      await c.query('UPDATE store_offers SET is_active = false WHERE store_id = $1 AND product_id = $2', [s.id, pid]);
      await audit(req.user!.id, 'dish.archived', 'product', pid, {}, c);
    });
    return { ok: true };
  });
};

/** Staff: see every dish and hide one that breaks the rules. */
export const adminDishRoutes: FastifyPluginAsync = async (app) => {
  const perm = requirePerm('catalog.manage', 'vendors.manage');
  app.get('/dishes', { preHandler: perm }, async () => (await pool.query(
    `SELECT p.id, p.name, p.status, p.allergens, p.dish_tags, p.cuisine, o.price_cents, s.name AS kitchen, s.slug AS kitchen_slug, v.id AS vendor_id
       FROM products p JOIN stores s ON s.id = p.owner_store_id JOIN vendors v ON v.id = s.vendor_id LEFT JOIN store_offers o ON o.product_id = p.id AND o.store_id = s.id
      WHERE p.owner_store_id IS NOT NULL AND p.status <> 'archived' ORDER BY s.name, p.name LIMIT 500`)).rows);
  app.post<{ Params: { id: string } }>('/dishes/:id/hide', { preHandler: perm }, async (req) => {
    const id = z.string().uuid().parse(req.params.id); const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body);
    await tx(async (c) => {
      const r = (await c.query(`UPDATE products p SET status = 'draft' FROM stores s WHERE p.id = $1 AND p.owner_store_id = s.id AND p.status = 'dish_live' RETURNING p.name, s.vendor_id`, [id])).rows[0];
      if (!r) throw notFound('Dish not found or already hidden');
      // Tell the cook why, in the same messaging channel they already use.
      const t = (await c.query('INSERT INTO vendor_threads(vendor_id, subject, created_by) VALUES ($1,$2,$3) RETURNING id', [r.vendor_id, `Dish hidden: ${r.name}`, req.user!.id])).rows[0];
      await c.query('INSERT INTO vendor_messages(thread_id, author_user_id, from_staff, body) VALUES ($1,$2,true,$3)', [t.id, req.user!.id, `We hid "${r.name}" from your menu. Reason: ${reason}\n\nPlease correct it and message us so we can restore it.`]);
      await notifyVendorOwners(c, r.vendor_id, 'vendor_message', { subject: `Dish hidden: ${r.name}` });
      await audit(req.user!.id, 'dish.hidden', 'product', id, { reason }, c);
    });
    return { ok: true };
  });
  app.post<{ Params: { id: string } }>('/dishes/:id/restore', { preHandler: perm }, async (req) => {
    const id = z.string().uuid().parse(req.params.id);
    const r = await pool.query(`UPDATE products SET status = 'dish_live' WHERE id = $1 AND owner_store_id IS NOT NULL AND status = 'draft' RETURNING id`, [id]);
    if (!r.rowCount) throw notFound('Dish not found or not hidden');
    await audit(req.user!.id, 'dish.restored', 'product', id);
    return { ok: true };
  });
};
