import { featureOn } from '../services/features.js';
import { isCanadianPostal, normalisePostal } from '../services/pricing.js';
import type { FastifyPluginAsync } from 'fastify';
import { ACCENTS } from '../lib/themes.js';
import { pool } from '../db/pool.js';

export const storeRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { region?: string } }>('/stores', async (req) => {
    const { rows } = await pool.query(
      `SELECT s.slug, s.name, s.description, s.city, s.is_open, s.min_order_cents, s.is_test_data,
              COALESCE(json_agg(DISTINCT jsonb_build_object('slug', r.slug, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') AS regions
         FROM storefronts s
         LEFT JOIN store_regions sr ON sr.store_id = s.id LEFT JOIN regions r ON r.id = sr.region_id
        WHERE s.orderable AND s.kind = 'grocery' AND ($1::text IS NULL OR EXISTS (SELECT 1 FROM store_regions x JOIN regions rr ON rr.id = x.region_id WHERE x.store_id = s.id AND rr.slug = $1))
        GROUP BY s.id, s.slug, s.name, s.description, s.city, s.is_open, s.min_order_cents, s.is_test_data ORDER BY s.name`,
      [req.query.region ?? null],
    );
    return rows;
  });

  // Which stores bring to this area, and at what fee and speed. Postal-area level only; checkout re-checks the exact address.
  app.get('/stores-compare', async (req, reply) => {
    if (!(await featureOn('shop.compare_stores'))) return reply.code(404).send({ error: 'not_found' });
    const raw = String((req.query as any).postal ?? '');
    if (!isCanadianPostal(raw.length === 3 ? raw + '0A0' : raw)) return reply.code(400).send({ error: 'invalid_postal', message: 'Enter a Canadian postal code, e.g. T2A 0A0.' });
    const fsa = normalisePostal(raw).slice(0, 3);
    const z = (await pool.query(`SELECT z.id, z.fee_cents, z.free_over_cents, z.eta_minutes FROM delivery_zone_fsas f JOIN delivery_zones z ON z.id = f.zone_id AND z.is_active WHERE f.fsa = $1`, [fsa])).rows[0];
    if (!z) return { fsa, serviceable: false, stores: [] };
    const stores = (await pool.query(
      `SELECT s.slug, s.name, s.is_open, s.min_order_cents, s.offers_delivery, s.offers_pickup, s.is_test_data,
              (SELECT CASE WHEN count(*) >= 3 THEN round(avg(r.rating)::numeric, 1)::float END FROM reviews r WHERE r.store_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden) AS rating_avg,
              (SELECT count(*)::int FROM store_offers o WHERE o.store_id = s.id AND o.is_active AND o.stock_on_hand > o.stock_reserved) AS items_in_stock
         FROM storefronts s JOIN store_delivery_zones sz ON sz.store_id = s.id AND sz.zone_id = $1
        WHERE s.orderable AND s.kind = 'grocery' AND s.offers_delivery ORDER BY s.is_open DESC, s.name`, [z.id])).rows;
    return { fsa, serviceable: true, fee_cents: z.fee_cents, free_over_cents: z.free_over_cents, eta_minutes: z.eta_minutes, stores };
  });

  app.get<{ Params: { slug: string } }>('/stores/:slug', async (req, reply) => {
    const s = (await pool.query(`SELECT * FROM storefronts WHERE slug = $1 AND orderable AND kind = 'grocery'`, [req.params.slug])).rows[0];
    if (!s) return reply.code(404).send({ error: 'not_found' });
    const [hours, regions, products, branding] = await Promise.all([
      pool.query('SELECT dow, opens, closes FROM store_hours WHERE store_id = $1 ORDER BY dow, opens', [s.id]),
      pool.query('SELECT r.slug, r.name FROM store_regions sr JOIN regions r ON r.id = sr.region_id WHERE sr.store_id = $1', [s.id]),
      pool.query(
        `SELECT p.slug, p.name, p.pack_size, p.pack_unit, b.name AS brand, c.name AS category, c.slug AS category_slug, o.id AS offer_id, o.price_cents, o.compare_at_cents, o.on_promotion,
                (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url,
                (o.stock_on_hand - o.stock_reserved) > 0 AS in_stock, GREATEST(o.stock_on_hand - o.stock_reserved, 0) AS available
           FROM offers_live o JOIN products p ON p.id = o.product_id AND p.status = 'published'
           LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id
          WHERE o.store_id = $1 AND o.is_active ORDER BY p.name`, [s.id]),
      pool.query('SELECT accent, tagline, story, announcement, featured_slugs, website, instagram, facebook FROM store_branding WHERE store_id = $1', [s.id]),
    ]);
    const br = branding.rows[0];
    return {
      slug: s.slug, name: s.name, description: s.description, address_line: s.address_line, city: s.city, province: s.province,
      postal_code: s.postal_code, phone: s.phone, is_open: s.is_open, min_order_cents: s.min_order_cents, is_test_data: s.is_test_data,
      logo_url: s.logo_url, cover_url: s.cover_url, policies: s.policies, offers_delivery: s.offers_delivery, offers_pickup: s.offers_pickup, ordering_paused: s.ordering_paused,
      hours: hours.rows, regions: regions.rows, products: products.rows,
      branding: br ? { accent: br.accent && ACCENTS[br.accent] ? { primary: ACCENTS[br.accent].primary, deep: ACCENTS[br.accent].deep, tint: ACCENTS[br.accent].tint, glow: ACCENTS[br.accent].glow } : null,
        tagline: br.tagline, story: br.story, announcement: br.announcement, featured_slugs: br.featured_slugs, website: br.website, instagram: br.instagram, facebook: br.facebook } : null,
    };
  });
};
