import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../db/pool.js';
import { notFound } from '../lib/errors.js';
import { can } from '../lib/permissions.js';
import { pickActive, todayInCalgary } from '../lib/themes.js';

export const contentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/content/home', async () => {
    const rows = (await pool.query('SELECT key, value FROM content_blocks')).rows;
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
  /** The theme that is live today (or, for staff only, a theme being previewed). Never cached: it changes by date. */
  app.get('/theme/active', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    const themes = (await pool.query(`SELECT id, slug, name, kind, emoji, motif, palette, headline, subtitle, cta_label, cta_link, banner_text, status, starts_on::text AS starts_on, ends_on::text AS ends_on, repeats_yearly, priority FROM themes`)).rows;
    const preview = String((req.query as any)?.preview ?? '');
    const t = preview && can(req.user, 'content.manage') ? themes.find((x) => x.slug === preview) ?? null : pickActive(themes, todayInCalgary());
    if (!t) return { theme: null };
    const { status, starts_on, ends_on, repeats_yearly, priority, ...pub } = t;
    return { theme: { ...pub, preview: !!preview } };
  });
  app.get('/home/banners', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return (await pool.query(
      `SELECT id, title, subtitle, cta_label, cta_link, image_url, video_url, from_color, to_color FROM home_banners
        WHERE status = 'live' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()) ORDER BY position, created_at`)).rows;
  });
  app.get<{ Params: { slug: string } }>('/pages/:slug', async (req) => {
    const p = (await pool.query(`SELECT slug, title, body, needs_legal_review, updated_at FROM pages WHERE slug = $1 AND status = 'published'`, [req.params.slug])).rows[0];
    if (!p) throw notFound('Page not found');
    return p;
  });
  app.get('/pages', async () => (await pool.query(`SELECT slug, title FROM pages WHERE status = 'published' ORDER BY title`)).rows);
};
