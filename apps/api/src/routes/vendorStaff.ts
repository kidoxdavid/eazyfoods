import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit } from '../lib/auth.js';
import { requireLogin } from '../lib/permissions.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { hashPassword } from '../lib/password.js';
import { vendorIdsOf } from './vendorOrders.js';

/** The store owner manages their team: people who can sign in to the vendor portal for this business. */
export const vendorStaffRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  const owner = (req: any) => {
    const vid = vendorIdsOf(req.user)[0];
    if (!vid || !req.user.roles.some((r: any) => r.role === 'vendor_owner')) throw forbidden('Only the store owner can manage the team.');
    return vid as string;
  };
  const split = (n: string) => { const [first, ...rest] = (n || '').split(' '); return { first_name: first, last_name: rest.join(' ') }; };

  app.get('/staff', async (req) => {
    const vid = owner(req);
    const rows = (await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.disabled_at IS NULL AS is_active, r.role, u.created_at,
              (SELECT max(created_at) FROM sessions s WHERE s.user_id = u.id) AS last_login_at
         FROM user_roles r JOIN users u ON u.id = r.user_id WHERE r.vendor_id = $1 AND r.role IN ('vendor_owner','vendor_staff') AND u.deleted_at IS NULL ORDER BY (r.role = 'vendor_owner') DESC, u.full_name`, [vid])).rows;
    return rows.map((r) => ({ id: r.id, email: r.email, ...split(r.full_name), phone: r.phone, is_active: r.is_active, role: r.role === 'vendor_owner' ? 'store_owner' : 'staff', last_login_at: r.last_login_at, created_at: r.created_at }));
  });

  app.post('/staff', async (req, reply) => {
    const vid = owner(req);
    const b = z.object({ email: z.string().email().max(254), first_name: z.string().trim().min(1).max(60), last_name: z.string().trim().max(60).default(''), password: z.string().min(10).max(200), phone: z.string().max(25).nullish() }).parse(req.body);
    try {
      const id = await tx(async (c) => {
        const u = (await c.query('INSERT INTO users(email, password_hash, full_name, phone, email_verified_at) VALUES ($1,$2,$3,$4, now()) RETURNING id', [b.email.toLowerCase(), await hashPassword(b.password), `${b.first_name} ${b.last_name}`.trim(), b.phone ?? null])).rows[0].id;
        await c.query(`INSERT INTO user_roles(user_id, role, vendor_id) VALUES ($1,'vendor_staff',$2)`, [u, vid]);
        await audit(req.user!.id, 'vendor_staff.created', 'user', u, { vendor: vid }, c);
        return u as string;
      });
      return reply.code(201).send({ id });
    } catch (e: any) {
      if (e.code === '23505') throw conflict('email_taken', 'An account with this email already exists. Ask them to use a different email.');
      throw e;
    }
  });

  const member = async (vid: string, id: string) => {
    const r = (await pool.query(`SELECT 1 FROM user_roles WHERE user_id = $1 AND vendor_id = $2 AND role = 'vendor_staff'`, [id, vid])).rowCount;
    if (!r) throw notFound('Team member not found');
  };
  app.put<{ Params: { id: string } }>('/staff/:id', async (req) => {
    const vid = owner(req); const id = z.string().uuid().parse(req.params.id); await member(vid, id);
    const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body);
    await pool.query('UPDATE users SET disabled_at = CASE WHEN $2 THEN NULL ELSE now() END WHERE id = $1', [id, is_active]);
    if (!is_active) await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await audit(req.user!.id, is_active ? 'vendor_staff.enabled' : 'vendor_staff.disabled', 'user', id, {});
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>('/staff/:id', async (req) => {
    const vid = owner(req); const id = z.string().uuid().parse(req.params.id); await member(vid, id);
    await pool.query(`DELETE FROM user_roles WHERE user_id = $1 AND vendor_id = $2`, [id, vid]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await audit(req.user!.id, 'vendor_staff.removed', 'user', id, { vendor: vid });
    return { ok: true };
  });
};
