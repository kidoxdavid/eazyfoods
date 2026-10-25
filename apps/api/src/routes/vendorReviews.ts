import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { audit, canManageStore } from '../lib/auth.js';
import { requireLogin } from '../lib/permissions.js';
import { bad, forbidden, notFound } from '../lib/errors.js';

/** A store reads and answers the reviews it received. Shaped for the original portal's Reviews page. */
export const vendorReviewRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const store = async (req: any) => {
    const id = z.string().uuid().parse(req.params.storeId);
    if (!(await canManageStore(req.user, id))) throw forbidden();
    return id;
  };

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/reviews', async (req) => {
    const sid = await store(req);
    const { rating } = z.object({ rating: z.coerce.number().int().min(1).max(5).optional() }).parse(req.query);
    return (await pool.query(
      `SELECT r.id, r.rating, NULL::text AS title, r.body AS comment, r.created_at, r.vendor_response, r.vendor_response_at, (r.read_by_vendor_at IS NOT NULL) AS is_read, true AS is_verified_purchase,
              p.name AS product_name, split_part(u.full_name, ' ', 1) AS customer_name, r.photo_url
         FROM reviews r JOIN users u ON u.id = r.user_id LEFT JOIN products p ON p.id = r.product_id
        WHERE r.store_id = $1 AND NOT r.is_hidden AND ($2::int IS NULL OR r.rating = $2) ORDER BY r.created_at DESC LIMIT 200`, [sid, rating ?? null])).rows;
  });

  app.get<{ Params: { storeId: string } }>('/stores/:storeId/reviews/summary', async (req) => {
    const sid = await store(req);
    const r = (await pool.query(
      `SELECT count(*)::int AS count, round(avg(rating)::numeric, 1)::float AS average, count(*) FILTER (WHERE read_by_vendor_at IS NULL)::int AS unread,
              count(*) FILTER (WHERE rating = 5)::int AS r5, count(*) FILTER (WHERE rating = 4)::int AS r4, count(*) FILTER (WHERE rating = 3)::int AS r3, count(*) FILTER (WHERE rating = 2)::int AS r2, count(*) FILTER (WHERE rating = 1)::int AS r1
         FROM reviews WHERE store_id = $1 AND NOT is_hidden`, [sid])).rows[0];
    return { count: r.count, average: r.count >= 1 ? r.average : null, unread: r.unread, distribution: { 5: r.r5, 4: r.r4, 3: r.r3, 2: r.r2, 1: r.r1 } };
  });

  app.put<{ Params: { storeId: string } }>('/stores/:storeId/reviews/mark-read', async (req) => {
    const sid = await store(req);
    await pool.query('UPDATE reviews SET read_by_vendor_at = now() WHERE store_id = $1 AND read_by_vendor_at IS NULL', [sid]);
    return { ok: true };
  });

  app.put<{ Params: { storeId: string; id: string } }>('/stores/:storeId/reviews/:id/respond', async (req) => {
    const sid = await store(req);
    const { response } = z.object({ response: z.string().trim().min(2).max(1000) }).parse(req.body);
    const r = await pool.query('UPDATE reviews SET vendor_response = $3, vendor_response_at = now() WHERE id = $2 AND store_id = $1 RETURNING id', [sid, z.string().uuid().parse(req.params.id), response]);
    if (!r.rowCount) throw notFound('Review not found');
    await audit(req.user!.id, 'review.responded', 'review', r.rows[0].id, {});
    return { ok: true };
  });

  app.post<{ Params: { storeId: string; id: string } }>('/stores/:storeId/reviews/:id/report', async (req) => {
    const sid = await store(req);
    const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body);
    const r = await pool.query('UPDATE reviews SET vendor_report_reason = $3, vendor_reported_at = now() WHERE id = $2 AND store_id = $1 RETURNING id', [sid, z.string().uuid().parse(req.params.id), reason]);
    if (!r.rowCount) throw bad('not_found', 'Review not found');
    await audit(req.user!.id, 'review.reported_by_vendor', 'review', r.rows[0].id, { reason });
    return { ok: true };
  });
};
