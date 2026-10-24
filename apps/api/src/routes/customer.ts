import { assertVendorCan, featureOn, requireFeature } from '../services/features.js';
import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { bad, notFound } from '../lib/errors.js';
import { productCards } from '../lib/listing.js';
import { can, requireLogin } from '../lib/permissions.js';
import { vendorIdsOf } from './vendorOrders.js';
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

  // Frequently bought together: products that share paid orders with this one. Only shown when at least 3 different orders back it.
  app.get<{ Params: { slug: string } }>('/products/:slug/together', async (req) => {
    if (!(await featureOn('shop.frequently_bought'))) return [];
    const rows = (await pool.query(
      `WITH me AS (SELECT id FROM products WHERE slug = $1),
            mine AS (SELECT DISTINCT s.order_id FROM order_lines l JOIN suborders s ON s.id = l.suborder_id JOIN orders o ON o.id = s.order_id
                      WHERE l.product_id = (SELECT id FROM me) AND o.payment_status IN ('paid','partially_refunded')),
            co AS (SELECT l.product_id, count(DISTINCT s.order_id)::int AS n FROM order_lines l JOIN suborders s ON s.id = l.suborder_id
                    WHERE s.order_id IN (SELECT order_id FROM mine) AND l.product_id <> (SELECT id FROM me) GROUP BY l.product_id HAVING count(DISTINCT s.order_id) >= 3)
       SELECT p.slug FROM co JOIN products p ON p.id = co.product_id ORDER BY co.n DESC LIMIT 4`, [req.params.slug])).rows.map((r) => r.slug as string);
    if (!rows.length) return [];
    const cards = await productCards('p.slug = ANY($1::text[])', [rows], 'p.name', 4);
    return rows.map((s) => cards.find((c) => c.slug === s)).filter(Boolean);
  });

  // Weekly flyer: everything on sale or on a multi-buy price right now, grouped by store.
  app.get('/flyer', async () => {
    await requireFeature('shop.flyer');
    const rows = (await pool.query(
      `SELECT s.slug AS store_slug, s.name AS store_name, p.slug, p.name, b.name AS brand, p.pack_size, p.pack_unit,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url,
              o.id AS offer_id, o.price_cents, o.compare_at_cents, o.on_promotion, o.stock_on_hand - o.stock_reserved AS available,
              (SELECT jsonb_build_object('min_qty', t.min_qty, 'unit_price_cents', t.unit_price_cents) FROM offer_tiers t WHERE t.offer_id = o.id ORDER BY t.min_qty LIMIT 1) AS multibuy
         FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable AND s.kind = 'grocery'
         JOIN products p ON p.id = o.product_id AND p.status = 'published' LEFT JOIN brands b ON b.id = p.brand_id
        WHERE o.is_active AND o.stock_on_hand - o.stock_reserved > 0
          AND (o.on_promotion OR o.compare_at_cents > o.price_cents OR EXISTS (SELECT 1 FROM offer_tiers t WHERE t.offer_id = o.id))
        ORDER BY s.name, (o.compare_at_cents - o.price_cents)::float / NULLIF(o.compare_at_cents, 0) DESC NULLS LAST, p.name LIMIT 300`)).rows;
    const stores = new Map<string, { slug: string; name: string; items: any[] }>();
    for (const { store_slug, store_name, ...it } of rows) (stores.get(store_slug) ?? stores.set(store_slug, { slug: store_slug, name: store_name, items: [] }).get(store_slug)!).items.push(it);
    return { stores: [...stores.values()] };
  });

  // Questions about a product. Answered by a store that sells it (or staff); hidden ones never show.
  app.get<{ Params: { slug: string } }>('/products/:slug/questions', async (req) => {
    if (!(await featureOn('shop.questions'))) return [];
    const rows = (await pool.query(
      `SELECT q.id, q.question, q.answer, q.answered_at, q.created_at, split_part(u.full_name, ' ', 1) AS first_name,
              (SELECT st.name FROM stores st WHERE st.vendor_id = au.vendor_id ORDER BY st.name LIMIT 1) AS answered_by_store
         FROM product_questions q JOIN products p ON p.id = q.product_id JOIN users u ON u.id = q.user_id
         LEFT JOIN LATERAL (SELECT vendor_id FROM user_roles WHERE user_id = q.answered_by AND vendor_id IS NOT NULL LIMIT 1) au ON true
        WHERE p.slug = $1 AND NOT q.is_hidden AND q.answer IS NOT NULL ORDER BY q.answered_at DESC LIMIT 20`, [req.params.slug])).rows;
    return rows;
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
  // Switches an admin can turn off: whole groups of customer routes answer "switched off" instead of working.
  app.addHook('preHandler', async (req) => {
    const u = req.url;
    if (/^\/api\/(lists|me\/buy-again)/.test(u)) await requireFeature('shop.lists');
    else if (/^\/api\/alerts/.test(u)) await requireFeature('shop.alerts');
    else if (/^\/api\/(questions|products\/[^/]+\/questions)/.test(u)) await requireFeature('shop.questions');
  });

  app.post<{ Params: { slug: string } }>('/products/:slug/questions', rl(5, '1 hour'), async (req, reply) => {
    const { question } = z.object({ question: z.string().trim().min(5).max(400) }).parse(req.body);
    const p = (await pool.query(`SELECT id FROM products WHERE slug = $1 AND status IN ('published','dish_live')`, [req.params.slug])).rows[0];
    if (!p) throw notFound('Product not found');
    await pool.query('INSERT INTO product_questions(product_id, user_id, question) VALUES ($1,$2,$3)', [p.id, req.user!.id, question]);
    return reply.code(201).send({ ok: true, message: 'Thanks. Your question is shown once a store or our team answers it.' });
  });

  // Questions waiting for an answer: from products this vendor sells (staff with catalogue rights see all).
  app.get('/questions/open', async (req) => {
    const staff = can(req.user, 'catalog.manage'); const vids = vendorIdsOf(req.user!);
    if (!staff && !vids.length) return [];
    return (await pool.query(
      `SELECT q.id, q.question, q.created_at, p.name AS product_name, p.slug AS product_slug FROM product_questions q JOIN products p ON p.id = q.product_id
        WHERE q.answer IS NULL AND NOT q.is_hidden AND ($1 OR EXISTS (SELECT 1 FROM store_offers o JOIN stores s ON s.id = o.store_id WHERE o.is_active AND o.product_id = q.product_id AND s.vendor_id = ANY($2::uuid[])))
        ORDER BY q.created_at LIMIT 100`, [staff, vids])).rows;
  });
  app.post<{ Params: { id: string } }>('/questions/:id/answer', async (req) => {
    const id = uuid.parse(req.params.id);
    const { answer, hide } = z.object({ answer: z.string().trim().min(2).max(1000).optional(), hide: z.boolean().optional() }).parse(req.body);
    const staff = can(req.user, 'catalog.manage'); const vids = vendorIdsOf(req.user!);
    const q = (await pool.query('SELECT product_id FROM product_questions WHERE id = $1', [id])).rows[0];
    if (!q) throw notFound('Question not found');
    const sells = vids.length > 0 && (await pool.query('SELECT 1 FROM store_offers o JOIN stores s ON s.id = o.store_id WHERE o.is_active AND o.product_id = $1 AND s.vendor_id = ANY($2::uuid[]) LIMIT 1', [q.product_id, vids])).rowCount;
    if (!staff && !sells) throw notFound('Question not found');
    if (!staff) for (const v of vids) await assertVendorCan(v, 'questions');   // 404, not 403: do not reveal questions on products you do not sell
    if (hide) await pool.query('UPDATE product_questions SET is_hidden = true WHERE id = $1', [id]);
    else if (answer) await pool.query('UPDATE product_questions SET answer = $2, answered_by = $3, answered_at = now() WHERE id = $1', [id, answer, req.user!.id]);
    else throw bad('nothing_to_do', 'Write an answer or hide the question.');
    return { ok: true };
  });

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
    const rem = (await pool.query('SELECT every_days, next_at FROM list_reminders WHERE list_id = $1', [l.id])).rows[0];
    return { id: l.id, name: l.name, share_token: l.share_token, reminder: rem ?? null, items: await listItems(l.id) };
  });
  app.put<{ Params: { id: string } }>('/lists/:id', async (req) => {
    const l = await own(req, uuid.parse(req.params.id));
    const b = z.object({ name: z.string().trim().min(1).max(60) }).parse(req.body);
    await pool.query('UPDATE shopping_lists SET name = $2, updated_at = now() WHERE id = $1', [l.id, b.name]);
    return { ok: true };
  });
  // "Remind me to restock": an email every N days with a one-tap link back to the list. Stops with one click here or by deleting the list.
  app.put<{ Params: { id: string } }>('/lists/:id/reminder', async (req) => {
    const l = await own(req, uuid.parse(req.params.id));
    const { every_days } = z.object({ every_days: z.number().int().min(7).max(90).nullable() }).parse(req.body);
    if (every_days == null) { await pool.query('DELETE FROM list_reminders WHERE list_id = $1', [l.id]); return { reminder: null }; }
    const r = await pool.query(`INSERT INTO list_reminders(list_id, user_id, every_days, next_at) VALUES ($1,$2,$3, now() + make_interval(days => $3))
      ON CONFLICT (list_id) DO UPDATE SET every_days = $3, next_at = now() + make_interval(days => $3) RETURNING every_days, next_at`, [l.id, req.user!.id, every_days]);
    return { reminder: r.rows[0] };
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
