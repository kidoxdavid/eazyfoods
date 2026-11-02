import type { FastifyPluginAsync } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { requireLogin } from '../lib/permissions.js';
import { bad, conflict, notFound } from '../lib/errors.js';

/** A group order is shared by link. Everyone in it must be signed in (so each person's items are theirs), and the starter checks out. */

const ITEMS = `
  SELECT gi.user_id, split_part(u.full_name, ' ', 1) AS who, gi.offer_id, gi.quantity, o.price_cents, o.is_active, o.stock_on_hand - o.stock_reserved AS available,
         p.name, p.slug, b.name AS brand, p.pack_size, p.pack_unit, s.name AS store_name, s.slug AS store_slug,
         (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url
    FROM group_items gi JOIN users u ON u.id = gi.user_id JOIN offers_live o ON o.id = gi.offer_id
    JOIN products p ON p.id = o.product_id LEFT JOIN brands b ON b.id = p.brand_id JOIN storefronts s ON s.id = o.store_id
   WHERE gi.group_id = $1 ORDER BY gi.updated_at`;

async function load(token: string, userId: string) {
  const g = (await pool.query(`SELECT g.*, split_part(u.full_name, ' ', 1) AS owner_name FROM group_orders g JOIN users u ON u.id = g.owner_id WHERE g.token = $1`, [token])).rows[0];
  if (!g) throw notFound('This group order was not found.');
  const items = (await pool.query(ITEMS, [g.id])).rows;
  const closedByTime = !!g.deadline && new Date(g.deadline).getTime() < Date.now();
  const mine = items.filter((i) => i.user_id === userId);
  const total = items.reduce((a, i) => a + i.price_cents * i.quantity, 0);
  return {
    token: g.token, name: g.name, owner_name: g.owner_name, is_owner: g.owner_id === userId, status: g.status, deadline: g.deadline,
    open: g.status === 'open' && !closedByTime, items: items.map((i) => ({ ...i, mine: i.user_id === userId, user_id: undefined })),
    people: [...new Map(items.map((i) => [i.user_id, i.who])).values()], item_count: items.reduce((a, i) => a + i.quantity, 0), total_cents: total, my_item_count: mine.reduce((a, i) => a + i.quantity, 0),
  };
}

export const groupOrderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);

  app.post('/group-orders', async (req) => {
    const b = z.object({ name: z.string().trim().min(1).max(60), deadline: z.string().datetime().nullable().optional() }).parse(req.body);
    if (b.deadline && new Date(b.deadline).getTime() < Date.now() + 60_000) throw bad('bad_deadline', 'Pick a time in the future.');
    const open = (await pool.query(`SELECT count(*)::int AS n FROM group_orders WHERE owner_id = $1 AND status = 'open'`, [req.user!.id])).rows[0].n;
    if (open >= 5) throw conflict('too_many', 'You already have five open group orders. Close one first.');
    const token = randomBytes(9).toString('base64url');
    await pool.query('INSERT INTO group_orders(token, owner_id, name, deadline) VALUES ($1,$2,$3,$4)', [token, req.user!.id, b.name, b.deadline ?? null]);
    return load(token, req.user!.id);
  });

  app.get('/group-orders', async (req) => (await pool.query(
    `SELECT g.token, g.name, g.status, g.deadline, (SELECT COALESCE(sum(quantity), 0)::int FROM group_items WHERE group_id = g.id) AS item_count
       FROM group_orders g WHERE g.owner_id = $1 AND g.status = 'open' ORDER BY g.created_at DESC`, [req.user!.id])).rows);

  app.get<{ Params: { token: string } }>('/group-orders/:token', async (req) => load(req.params.token, req.user!.id));

  // Set my quantity of an item (0 takes it out).
  app.put<{ Params: { token: string; offerId: string } }>('/group-orders/:token/items/:offerId', async (req) => {
    const offerId = z.string().uuid().parse(req.params.offerId);
    const { quantity } = z.object({ quantity: z.number().int().min(0).max(99) }).parse(req.body);
    const g = (await load(req.params.token, req.user!.id));
    if (!g.open) throw conflict('group_closed', 'This group order is closed.');
    const row = (await pool.query('SELECT id FROM group_orders WHERE token = $1', [req.params.token])).rows[0];
    if (quantity === 0) await pool.query('DELETE FROM group_items WHERE group_id = $1 AND user_id = $2 AND offer_id = $3', [row.id, req.user!.id, offerId]);
    else {
      const o = (await pool.query(`SELECT o.is_active, o.stock_on_hand - o.stock_reserved AS available, s.orderable FROM offers_live o JOIN storefronts s ON s.id = o.store_id WHERE o.id = $1`, [offerId])).rows[0];
      if (!o || !o.is_active || !o.orderable) throw notFound('That product is not available from this store.');
      if (quantity > o.available) throw conflict('insufficient_stock', o.available > 0 ? `Only ${o.available} available.` : 'Out of stock.');
      await pool.query(`INSERT INTO group_items(group_id, user_id, offer_id, quantity) VALUES ($1,$2,$3,$4)
                        ON CONFLICT (group_id, user_id, offer_id) DO UPDATE SET quantity = $4, updated_at = now()`, [row.id, req.user!.id, offerId, quantity]);
    }
    return load(req.params.token, req.user!.id);
  });

  // The starter moves everything into their own basket (added to what is already there) and closes the group. Checkout is the normal checkout.
  app.post<{ Params: { token: string } }>('/group-orders/:token/to-basket', async (req) => {
    return tx(async (c) => {
      const g = (await c.query('SELECT * FROM group_orders WHERE token = $1 FOR UPDATE', [req.params.token])).rows[0];
      if (!g) throw notFound('This group order was not found.');
      if (g.owner_id !== req.user!.id) throw conflict('not_owner', 'Only the person who started this group order can check out.');
      const lines = (await c.query(`SELECT gi.offer_id, sum(gi.quantity)::int AS qty, min(o.stock_on_hand - o.stock_reserved)::int AS available
                                      FROM group_items gi JOIN offers_live o ON o.id = gi.offer_id AND o.is_active WHERE gi.group_id = $1 GROUP BY gi.offer_id`, [g.id])).rows;
      if (!lines.length) throw conflict('empty', 'Nobody has added anything yet.');
      const cid = (await c.query(`INSERT INTO carts(user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING id`, [req.user!.id])).rows[0].id;
      let skipped = 0;
      for (const l of lines) {
        const have = (await c.query('SELECT quantity FROM cart_items WHERE cart_id = $1 AND offer_id = $2', [cid, l.offer_id])).rows[0]?.quantity ?? 0;
        const qty = Math.min(99, have + l.qty, l.available);
        if (qty <= have) { skipped++; continue; }
        await c.query(`INSERT INTO cart_items(cart_id, offer_id, quantity, added_price_cents) SELECT $1, o.id, $3, o.price_cents FROM offers_live o WHERE o.id = $2
                       ON CONFLICT (cart_id, offer_id) DO UPDATE SET quantity = $3`, [cid, l.offer_id, qty]);
      }
      await c.query(`UPDATE group_orders SET status = 'closed' WHERE id = $1`, [g.id]);
      return { ok: true, moved: lines.length - skipped, skipped };
    });
  });

  app.post<{ Params: { token: string } }>('/group-orders/:token/close', async (req) => {
    const r = await pool.query(`UPDATE group_orders SET status = 'closed' WHERE token = $1 AND owner_id = $2`, [req.params.token, req.user!.id]);
    if (!r.rowCount) throw notFound('This group order was not found.');
    return load(req.params.token, req.user!.id);
  });
};
