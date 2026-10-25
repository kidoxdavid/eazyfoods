import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requireLogin } from '../lib/permissions.js';
import { bad, forbidden, notFound } from '../lib/errors.js';
import { getSetting } from '../lib/settings.js';
import { isOurImageUrl } from '../lib/storage.js';
import { assertVendorCan } from '../services/features.js';
import { vendorIdsOf } from './vendorOrders.js';

const SEL = `SELECT c.id, c.title, c.body, c.placement, c.status, c.review_note, c.cpc_cents, c.budget_cents, c.starts_at, c.ends_at, c.image_url, c.store_id, c.created_at,
       (SELECT slug FROM products WHERE id = c.product_id) AS product_slug,
       count(e.*) FILTER (WHERE e.type='impression')::int AS impressions, count(e.*) FILTER (WHERE e.type='click')::int AS clicks,
       (count(e.*) FILTER (WHERE e.type='click') * c.cpc_cents)::int AS spent_cents
  FROM ad_campaigns c LEFT JOIN ad_events e ON e.campaign_id = c.id`;

/** Manage an existing ad: read, edit while it is waiting for approval, pause and resume, delete. Creating one is in vendorPortal. */
export const vendorAdRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const vid = (req: any) => { const v = vendorIdsOf(req.user)[0]; if (!v) throw forbidden('This account is not linked to a store.'); return v as string; };
  const owned = async (req: any) => {
    const id = z.string().uuid().parse(req.params.id);
    const r = (await pool.query(`${SEL} WHERE c.id = $1 AND c.vendor_id = $2 GROUP BY c.id`, [id, vid(req)])).rows[0];
    if (!r) throw notFound('Ad not found');
    return r;
  };

  app.get('/ads-config', async () => ({
    min_budget_cents: await getSetting<number>('ads.min_budget_cents'), min_cpc_cents: await getSetting<number>('ads.min_cpc_cents'),
  }));
  app.get<{ Params: { id: string } }>('/ads/:id', async (req) => owned(req));

  app.put<{ Params: { id: string } }>('/ads/:id', async (req) => {
    const ad = await owned(req);
    if (!['pending', 'rejected'].includes(ad.status)) throw bad('not_editable', 'An approved ad cannot be edited. Pause it or create a new one.');
    await assertVendorCan(vid(req), 'ads');
    const b = z.object({ title: z.string().min(3).max(80), body: z.string().max(200).nullish(), image_url: z.string().refine(isOurImageUrl, 'Upload the image through EAZyfoods first.').nullish(), starts_at: z.coerce.date(), ends_at: z.coerce.date() }).parse(req.body);
    if (b.ends_at <= b.starts_at) throw bad('invalid_dates', 'The end must be after the start.');
    await pool.query(`UPDATE ad_campaigns SET title = $2, body = $3, image_url = COALESCE($4, image_url), starts_at = $5, ends_at = $6, status = 'pending', review_note = NULL WHERE id = $1`, [ad.id, b.title, b.body ?? null, b.image_url ?? null, b.starts_at, b.ends_at]);
    await audit(req.user!.id, 'ad.edited', 'ad', ad.id, {});
    return { ok: true, status: 'pending' };
  });

  const flip = (path: string, from: string, to: string) => app.post<{ Params: { id: string } }>(`/ads/:id/${path}`, async (req) => {
    const ad = await owned(req);
    const r = await pool.query('UPDATE ad_campaigns SET status = $3 WHERE id = $1 AND status = $2 RETURNING id', [ad.id, from, to]);
    if (!r.rowCount) throw bad('invalid_state', `Only a ${from} ad can be ${path === 'pause' ? 'paused' : 'resumed'}.`);
    await audit(req.user!.id, `ad.${path}`, 'ad', ad.id, {});
    return { ok: true };
  });
  flip('pause', 'approved', 'paused'); flip('activate', 'paused', 'approved');

  app.delete<{ Params: { id: string } }>('/ads/:id', async (req) => {
    const ad = await owned(req);
    if (ad.impressions + ad.clicks > 0) {
      await pool.query(`UPDATE ad_campaigns SET status = 'paused' WHERE id = $1`, [ad.id]);
      return { deleted: false, message: 'This ad has results, so it was paused and kept for your reports.' };
    }
    await pool.query('DELETE FROM ad_campaigns WHERE id = $1', [ad.id]);
    await audit(req.user!.id, 'ad.deleted', 'ad', ad.id, {});
    return { deleted: true };
  });
};
