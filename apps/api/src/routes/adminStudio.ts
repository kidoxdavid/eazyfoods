import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requirePerm } from '../lib/permissions.js';
import { bad, notFound } from '../lib/errors.js';
import { isOurImageUrl } from '../lib/storage.js';
import { HEX } from '../lib/themes.js';

const uuid = z.string().uuid();
const hex = z.string().regex(HEX, 'Use a colour like #1f5b3a');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const link = z.string().max(300).regex(/^(\/[^\s]*)?$/, 'Links must stay on this site and start with /');

const palette = z.object({ primary: hex, deep: hex, tint: hex, glow: hex, hero_from: hex, hero_to: hex });
const themeBody = z.object({
  name: z.string().min(2).max(60), kind: z.enum(['festival', 'season', 'holiday', 'custom']), emoji: z.string().max(8).default(''),
  motif: z.enum(['none', 'confetti', 'snow', 'leaves', 'stars']).default('none'),
  starts_on: date, ends_on: date, repeats_yearly: z.boolean().default(false), priority: z.number().int().min(0).max(100).default(50),
  status: z.enum(['auto', 'on', 'off']).default('auto'), palette,
  headline: z.string().min(2).max(90), subtitle: z.string().max(220).default(''), cta_label: z.string().max(40).default(''), cta_link: link.default(''),
  banner_text: z.string().max(160).default(''), notes: z.string().max(400).default(''),
});

const slugOf = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'theme';

/** Admin "Studio": themes, homepage banners and homepage layout. All of it needs content.manage. */
export const adminStudioRoutes: FastifyPluginAsync = async (app) => {
  const content = requirePerm('content.manage');

  app.get('/themes', { preHandler: content }, async () =>
    (await pool.query('SELECT * FROM themes ORDER BY (status = \'on\') DESC, kind, starts_on, name')).rows);

  app.post('/themes', { preHandler: content }, async (req, reply) => {
    const b = themeBody.parse(req.body);
    let slug = slugOf(b.name), n = 1;
    while ((await pool.query('SELECT 1 FROM themes WHERE slug = $1', [slug])).rowCount) slug = `${slugOf(b.name)}-${++n}`;
    const t = (await pool.query(
      `INSERT INTO themes(slug,name,kind,emoji,motif,starts_on,ends_on,repeats_yearly,priority,status,palette,headline,subtitle,cta_label,cta_link,banner_text,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [slug, b.name, b.kind, b.emoji, b.motif, b.starts_on, b.ends_on, b.repeats_yearly, b.priority, b.status, b.palette, b.headline, b.subtitle, b.cta_label, b.cta_link, b.banner_text, b.notes])).rows[0];
    await audit(req.user!.id, 'theme.created', 'theme', t.id, { slug });
    return reply.code(201).send(t);
  });

  app.put<{ Params: { id: string } }>('/themes/:id', { preHandler: content }, async (req) => {
    const id = uuid.parse(req.params.id);
    const b = themeBody.parse(req.body);
    const t = (await pool.query(
      `UPDATE themes SET name=$2,kind=$3,emoji=$4,motif=$5,starts_on=$6,ends_on=$7,repeats_yearly=$8,priority=$9,status=$10,palette=$11,headline=$12,subtitle=$13,cta_label=$14,cta_link=$15,banner_text=$16,notes=$17,updated_at=now()
        WHERE id=$1 RETURNING *`,
      [id, b.name, b.kind, b.emoji, b.motif, b.starts_on, b.ends_on, b.repeats_yearly, b.priority, b.status, b.palette, b.headline, b.subtitle, b.cta_label, b.cta_link, b.banner_text, b.notes])).rows[0];
    if (!t) throw notFound('Theme not found');
    await audit(req.user!.id, 'theme.updated', 'theme', id, { status: b.status });
    return t;
  });

  /** Quick switch: force on, follow dates, or turn off. Only one theme is forced at a time. */
  app.post<{ Params: { id: string } }>('/themes/:id/status', { preHandler: content }, async (req) => {
    const id = uuid.parse(req.params.id);
    const { status } = z.object({ status: z.enum(['auto', 'on', 'off']) }).parse(req.body);
    if (status === 'on') await pool.query(`UPDATE themes SET status = 'auto' WHERE status = 'on' AND id <> $1`, [id]);
    const r = await pool.query('UPDATE themes SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
    if (!r.rowCount) throw notFound('Theme not found');
    await audit(req.user!.id, 'theme.status', 'theme', id, { status });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/themes/:id', { preHandler: content }, async (req) => {
    const id = uuid.parse(req.params.id);
    await pool.query('DELETE FROM themes WHERE id = $1', [id]);
    await audit(req.user!.id, 'theme.deleted', 'theme', id);
    return { ok: true };
  });

  // ---------- Homepage banners ----------
  const bannerBody = z.object({
    title: z.string().min(2).max(90), subtitle: z.string().max(220).default(''), cta_label: z.string().max(40).default(''), cta_link: link.default('/'),
    image_url: z.string().refine(isOurImageUrl, 'Upload the image through EAZyfoods first.').nullable().optional(),
    from_color: hex.default('#0b3a24'), to_color: hex.default('#1d7a4c'), status: z.enum(['draft', 'live']).default('draft'),
    starts_at: z.string().datetime().nullable().optional(), ends_at: z.string().datetime().nullable().optional(),
  });
  app.get('/banners', { preHandler: content }, async () => (await pool.query('SELECT * FROM home_banners ORDER BY position, created_at')).rows);
  app.post('/banners', { preHandler: content }, async (req, reply) => {
    const b = bannerBody.parse(req.body);
    const pos = (await pool.query('SELECT COALESCE(max(position), 0) + 1 AS p FROM home_banners')).rows[0].p;
    const r = (await pool.query(
      `INSERT INTO home_banners(title,subtitle,cta_label,cta_link,image_url,from_color,to_color,status,starts_at,ends_at,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.title, b.subtitle, b.cta_label, b.cta_link, b.image_url ?? null, b.from_color, b.to_color, b.status, b.starts_at ?? null, b.ends_at ?? null, pos])).rows[0];
    await audit(req.user!.id, 'banner.created', 'banner', r.id);
    return reply.code(201).send(r);
  });
  app.put<{ Params: { id: string } }>('/banners/:id', { preHandler: content }, async (req) => {
    const id = uuid.parse(req.params.id); const b = bannerBody.parse(req.body);
    const r = (await pool.query(
      `UPDATE home_banners SET title=$2,subtitle=$3,cta_label=$4,cta_link=$5,image_url=$6,from_color=$7,to_color=$8,status=$9,starts_at=$10,ends_at=$11 WHERE id=$1 RETURNING *`,
      [id, b.title, b.subtitle, b.cta_label, b.cta_link, b.image_url ?? null, b.from_color, b.to_color, b.status, b.starts_at ?? null, b.ends_at ?? null])).rows[0];
    if (!r) throw notFound('Banner not found');
    await audit(req.user!.id, 'banner.updated', 'banner', id);
    return r;
  });
  app.post('/banners/order', { preHandler: content }, async (req) => {
    const { ids } = z.object({ ids: z.array(uuid).max(50) }).parse(req.body);
    await pool.query('UPDATE home_banners SET position = x.i FROM (SELECT id, ord::int AS i FROM unnest($1::uuid[]) WITH ORDINALITY AS u(id, ord)) x WHERE home_banners.id = x.id', [ids]);
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>('/banners/:id', { preHandler: content }, async (req) => {
    const id = uuid.parse(req.params.id);
    await pool.query('DELETE FROM home_banners WHERE id = $1', [id]);
    await audit(req.user!.id, 'banner.deleted', 'banner', id);
    return { ok: true };
  });

  // ---------- Homepage layout (order and visibility of the sections) ----------
  app.put('/layout', { preHandler: content }, async (req) => {
    const b = z.object({ sections: z.array(z.object({ id: z.enum(['regions', 'deals', 'departments', 'collections_a', 'new', 'collections_b', 'stores', 'kitchens', 'recipes', 'trust']), enabled: z.boolean() })).min(9).max(10) }).parse(req.body);
    if (new Set(b.sections.map((s) => s.id)).size !== b.sections.length) throw bad('duplicate_section', 'Each section must appear once.');
    await pool.query(`INSERT INTO content_blocks(key, value) VALUES ('home_layout', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`, [b]);
    await audit(req.user!.id, 'layout.updated', 'content', 'home_layout', b);
    return { ok: true };
  });
};
