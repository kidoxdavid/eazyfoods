import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../db/pool.js';
import { requireLogin, can } from '../lib/permissions.js';
import { vendorIdsOf } from './vendorOrders.js';

const n = async (sql: string, args: unknown[] = []) => ((await pool.query(sql, args)).rows[0]?.n ?? 0) as number;

/**
 * "Something is waiting for you" counts for each portal's menu, keyed by the menu item's path. Red badges in the sidebar come from here.
 * Only counts what the signed-in role could act on; zero means no badge.
 */
export const badgeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  app.get('/admin/badges', async (req) => {
    const u = req.user!; const out: Record<string, number> = {};
    if (can(u, 'vendors.manage')) {
      out['/admin/vendors'] = await n(`SELECT count(*)::int n FROM vendors WHERE status = 'submitted'`);
      out['/admin/messages'] = await n(`SELECT count(*)::int n FROM vendor_messages WHERE NOT from_staff AND read_by_other_at IS NULL`);
    }
    if (can(u, 'drivers.manage')) out['/admin/drivers'] = await n(`SELECT ((SELECT count(*) FROM drivers WHERE status = 'applied') + (SELECT count(*) FROM driver_messages WHERE NOT from_staff AND read_by_other_at IS NULL))::int AS n`);
    if (can(u, 'dispatch.manage')) out['/admin/dispatch'] = await n(`SELECT count(*)::int n FROM deliveries d JOIN suborders s ON s.id = d.suborder_id WHERE d.status = 'unassigned' AND s.status = 'ready'`);
    if (can(u, 'refunds.approve')) out['/admin/refunds'] = await n(`SELECT count(*)::int n FROM refunds WHERE status = 'requested'`);
    if (can(u, 'support.manage')) out['/admin/support'] = await n(`SELECT count(*)::int n FROM support_tickets WHERE status = 'open'`);
    if (can(u, 'ads.manage')) out['/admin/ads'] = await n(`SELECT count(*)::int n FROM ad_campaigns WHERE status = 'pending'`);
    if (can(u, 'catalog.manage')) out['/admin/catalogue'] = await n(`SELECT count(*)::int n FROM products WHERE status = 'pending'`);
    return out;
  });

  app.get('/marketing/badges', async (req) => {
    const out: Record<string, number> = {};
    if (can(req.user!, 'marketing.manage')) {
      out['/marketing/emails'] = await n(`SELECT count(*)::int n FROM email_campaigns WHERE status = 'draft'`);
      out['/marketing/social'] = await n(`SELECT count(*)::int n FROM social_posts WHERE status = 'scheduled' AND scheduled_for < now() + interval '3 days'`);
    }
    return out;
  });

  app.get('/vendor/badges', async (req) => {
    const vids = vendorIdsOf(req.user!);
    if (!vids.length) return {};
    return {
      '/vendor/questions': await n(`SELECT count(DISTINCT q.id)::int n FROM product_questions q JOIN store_offers o ON o.product_id = q.product_id JOIN stores s ON s.id = o.store_id
                                     WHERE s.vendor_id = ANY($1::uuid[]) AND q.answer IS NULL AND NOT q.is_hidden`, [vids]),
      '/vendor/orders': await n(`SELECT count(*)::int n FROM suborders WHERE vendor_id = ANY($1::uuid[]) AND status = 'placed'`, [vids]),
    };
  });

  app.get('/driver/badges', async () => ({
    '/driver/available': await n(`SELECT count(*)::int n FROM deliveries d JOIN suborders s ON s.id = d.suborder_id WHERE d.status = 'unassigned' AND s.status = 'ready'`),
  }));
};
