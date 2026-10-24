import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { bad, notFound } from '../lib/errors.js';
import { productCards } from '../lib/listing.js';
import { requireLogin } from '../lib/permissions.js';
import { rl } from '../lib/ratelimit.js';

const uuid = z.string().uuid();
const slug = z.string().min(1).max(120);

/** Public: cards for a few product slugs (recently viewed, shared lists). Orderable products only, in the order asked. */
export const cardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/products-cards', async (req) => {
    const { slugs } = z.object({ slugs: z.string().max(1500) }).parse(req.query);
    const list = [...new Set(slugs.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 16);
    if (!list.length) return [];
    const cards = await productCards('p.slug = ANY($1::text[])', [list], 'p.name', 16);
    return list.map((s) => cards.find((c) => c.slug === s)).filter(Boolean);
  });

  app.get<{ Params: { token: string } }>('/lists/shared/:token', rl(60, '1 minute'), async (req) => {
    const l = (await pool.query(`SELECT l.id, l.name, split_part(u.full_name, ' ', 1) AS owner FROM shopping_lists l JOIN users u ON u.id = l.user_id WHERE l.share_token = $1`, [req.params.token])).rows[0];
    if (!l) throw notFound('This list is not shared any more.');
    return { name: l.name, owner: l.owner, items: await listItems(l.id) };
  });
};

async function listItems(listId: string) {
  const items = (await pool.query(`SELECT i.quantity, p.slug FROM shopping_list_items i JOIN products p ON p.id = i.product_id WHERE i.list_id = $1 ORDER BY i.added_at`, [listId])).rows as { quantity: number; slug: string }[];
  if (!items.length) return [];
  const cards = await productCards('p.slug = ANY($1::text[])', [items.map((i) => i.slug)], 'p.name', 100);
  const gone = items.filter((i) => !cards.some((c) => c.slug === i.slug));
  return [...items.flatMap((i) => { const c = cards.find((x) => x.slug === i.slug); return c ? [{ ...c, list_quantity: i.quantity }] : []; }), ...gone.map((g) => ({ slug: g.slug, unavailable: true, list_quantity: g.quantity }))];
}

/** Signed-in customer features: buy again, shopping lists, alerts. */
export const customerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  // ---------- Buy again: what you have actually received before, most-bought first ----------
  app.get('/me/buy-again', async (req) => {
    const ids = (await pool.query(
      `SELECT l.product_id, count(*) AS times, max(o.placed_at) AS last
         FROM order_lines l JOIN suborders s ON s.id = l.suborder_id AND s.status IN ('delivered','collected') JOIN orders o ON o.id = s.order_id
        WHERE o.user_id = $1 AND l.quantity - l.refunded_quantity > 0 GROUP BY l.product_id ORDER BY times DESC, last DESC LIMIT 16`, [req.user!.id])).rows.map((r) => r.product_id as string);
    if (!ids.length) return [];
    const slugs = new Map((await pool.query('SELECT id, slug FROM products WHERE id = ANY($1::uuid[])', [ids])).rows.map((r) => [r.id as string, r.slug as string]));
    const cards = await productCards('p.id = ANY($1::uuid[])', [ids], 'p.name', 16);
    return ids.map((id) => cards.find((c) => c.slug === slugs.get(id))).filter(Boolean);
  });

  // ---------- Shopping lists ----------
  const own = async (req: any, id: string) => {
    const l = (await pool.query('SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2', [id, req.user.id])).rows[0];
    if (!l) throw notFound('List not found');
    return l;
  };
  app.get('/lists', async (req) => (await pool.query(
    `SELECT l.id, l.name, l.share_token IS NOT NULL AS shared, (SELECT count(*)::int FROM shopping_list_items i WHERE i.list_id = l.id) AS items FROM shopping_lists l WHERE l.user_id = $1 ORDER BY l.updated_at DESC`, [req.user!.id])).rows);
  app.post('/lists', rl(30, '1 hour'), async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(60) }).parse(req.body);
    if ((await pool.query('SELECT count(*)::int n FROM shopping_lists WHERE user_id = $1', [req.user!.id])).rows[0].n >= 30) throw bad('too_many_lists', 'You can keep up to 30 lists.');
    return reply.code(201).send((await pool.query('INSERT INTO shopping_lists(user_id, name) VALUES ($1,$2) RETURNING id, name', [req.user!.id, b.name])).rows[0]);
  });
  app.get<{ Params: { id: string } }>('/lists/:id', async (req) => {
    const l = await own(req, uuid.parse(req.params.id));
    return { id: l.id, name: l.name, share_token: l.share_token, items: await listItems(l.id) };
  });
  app.put<{ Params: { id: string } }>('/lists/:id', async (req) => {
    const l = await own(req, uuid.parse(req.params.id));
    const b = z.object({ name: z.string().trim().min(1).max(60) }).parse(req.body);
    await pool.query('UPDATE shopping_lists SET name = $2, updated_at = now() WHERE id = $1', [l.id, b.name]);
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>('/lists/:id', async (req) => { const l = await own(req, uuid.parse(req.params.id)); await pool.query('DELETE FROM shopping_lists WHERE id = $1', [l.id]); return { ok: true }; });
  app.put<{ Params: { id: string } }>('/lists/:id/items', async (req) => {
    const l = await own(req, uuid.parse(req.params.id));
    const b = z.object({ slug, quantity: z.number().int().min(0).max(99) }).parse(req.body);
    const p = (await pool.query(`SELECT id FROM products WHERE slug = $1 AND status = 'published'`, [b.slug])).rows[0];
    if (!p) throw notFound('Product not found');
    if (b.quantity === 0) await pool.query('DELETE FROM shopping_list_items WHERE list_id = $1 AND product_id = $2', [l.id, p.id]);
    else {
      if ((await pool.query('SELECT count(*)::int n FROM shopping_list_items WHERE list_id = $1', [l.id])).rows[0].n >= 100) throw bad('list_full', 'A list holds up to 100 items.');
      await pool.query(`INSERT INTO shopping_list_items(list_id, product_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (list_id, product_id) DO UPDATE SET quantity = $3`, [l.id, p.id, b.quantity]);
    }
    await pool.query('UPDATE shopping_lists SET updated_at = now() WHERE id = $1', [l.id]);
    return { ok: true };
  });
  /** Anyone with the link can read the list (never change it). Turning sharing off kills the old link. */
  app.post<{ Params: { id: string } }>('/lists/:id/share', async (req) => {
    const l = await own(req, uuid.parse(req.params.id));
    const token = l.share_token ?? randomBytes(18).toString('base64url');
    await pool.query('UPDATE shopping_lists SET share_token = $2 WHERE id = $1', [l.id, token]);
    return { token };
  });
  app.delete<{ Params: { id: string } }>('/lists/:id/share', async (req) => { const l = await own(req, uuid.parse(req.params.id)); await pool.query('UPDATE shopping_lists SET share_token = NULL WHERE id = $1', [l.id]); return { ok: true }; });
  /** Copy a shared list into your own account. */
  app.post<{ Params: { token: string } }>('/lists/shared/:token/copy', rl(20, '1 hour'), async (req, reply) => {
    const src = (await pool.query('SELECT id, name FROM shopping_lists WHERE share_token = $1', [req.params.token])).rows[0];
    if (!src) throw notFound('This list is not shared any more.');
    const l = (await pool.query('INSERT INTO shopping_lists(user_id, name) VALUES ($1,$2) RETURNING id, name', [req.user!.id, `${src.name} (copy)`.slice(0, 60)])).rows[0];
    await pool.query('INSERT INTO shopping_list_items(list_id, product_id, quantity) SELECT $1, product_id, quantity FROM shopping_list_items WHERE list_id = $2', [l.id, src.id]);
    return reply.code(201).send(l);
  });

  // ---------- Alerts ----------
  app.get('/alerts', async (req) => (await pool.query(
    `SELECT a.id, a.kind, a.price_at_creation_cents, a.created_at, p.slug, p.name FROM product_alerts a JOIN products p ON p.id = a.product_id WHERE a.user_id = $1 AND a.active ORDER BY a.created_at DESC`, [req.user!.id])).rows);
  app.post('/alerts', rl(60, '1 hour'), async (req, reply) => {
    const b = z.object({ slug, kind: z.enum(['back_in_stock', 'price_drop']) }).parse(req.body);
    const p = (await pool.query(`SELECT id FROM products WHERE slug = $1 AND status = 'published'`, [b.slug])).rows[0];
    if (!p) throw notFound('Product not found');
    if ((await pool.query('SELECT count(*)::int n FROM product_alerts WHERE user_id = $1 AND active', [req.user!.id])).rows[0].n >= 50) throw bad('too_many_alerts', 'You can have up to 50 alerts at once.');
    const price = (await pool.query(`SELECT min(o.price_cents) FILTER (WHERE o.stock_on_hand - o.stock_reserved > 0) AS n FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE o.product_id = $1 AND o.is_active`, [p.id])).rows[0].n as number | null;
    if (b.kind === 'price_drop' && price == null) throw bad('not_in_stock', 'This is out of stock right now. Ask to be told when it is back instead.');
    if (b.kind === 'back_in_stock' && price != null) throw bad('in_stock', 'This is in stock now.');
    await pool.query(
      `INSERT INTO product_alerts(user_id, product_id, kind, price_at_creation_cents) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, product_id, kind) DO UPDATE SET active = true, notified_at = NULL, price_at_creation_cents = $4, created_at = now()`, [req.user!.id, p.id, b.kind, b.kind === 'price_drop' ? price : null]);
    return reply.code(201).send({ ok: true });
  });
  app.delete<{ Params: { id: string } }>('/alerts/:id', async (req) => { await pool.query('DELETE FROM product_alerts WHERE id = $1 AND user_id = $2', [uuid.parse(req.params.id), req.user!.id]); return { ok: true }; });
};
