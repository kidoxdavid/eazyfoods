import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, tx } from '../db/pool.js';
import { audit, COOKIES, createSession } from '../lib/auth.js';
import { hashToken } from '../lib/password.js';
import { bad, notFound } from '../lib/errors.js';
import { requireLogin, requirePerm } from '../lib/permissions.js';
import { allFlags, clearFeatureCache, VENDOR_CAPS, vendorCaps, type VendorCap } from '../services/features.js';
import { vendorIdsOf } from './vendorOrders.js';

const PORTALS = ['admin', 'marketing', 'vendor', 'chef', 'driver'] as const;
/** Existing yes/no settings that the control centre may flip. */
const PLATFORM_SWITCHES: Record<string, { label: string; description: string }> = {
  'kitchens.enabled': { label: 'Home chefs', description: 'Show home kitchens and let cooks sell meals. Turning this off hides them everywhere.' },
  'ordering.require_open': { label: 'Orders only while a store is open', description: 'Customers can only check out from stores that are open (unless pre-ordering).' },
  'vendor.require_verified_docs': { label: 'Require verified documents to publish', description: 'New vendors must have their documents verified before they can go live.' },
  'payout.auto_enabled': { label: 'Automatic payouts', description: 'Pay vendors automatically every hour once their hold period is over.' },
};

/** Public: which switches are on. Used by the shop to hide what has been turned off. */
export const featureRoutes: FastifyPluginAsync = async (app) => {
  app.get('/features', async (_req, reply) => { reply.header('cache-control', 'no-cache'); return allFlags(); });
  app.get<{ Params: { portal: string } }>('/portal-config/:portal', { preHandler: requireLogin }, async (req) => {
    const portal = z.enum(PORTALS).parse(req.params.portal);
    const r = (await pool.query('SELECT hidden_nav, notice, notice_tone FROM portal_config WHERE portal = $1', [portal])).rows[0];
    return r ?? { hidden_nav: [], notice: null, notice_tone: 'info' };
  });
  app.get('/vendor/capabilities', { preHandler: requireLogin }, async (req) => {
    const v = vendorIdsOf(req.user!)[0];
    return v ? vendorCaps(v) : {};
  });
};

export const controlRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requirePerm('control.manage'));

  // "Open their portal": the admin works inside a vendor's portal as that vendor's owner. This opens a separate vendor-window sign-in for the admin (the admin sign-in is untouched), until they exit. Audited both ways.
  app.post<{ Params: { vendorId: string } }>('/act-as/:vendorId', async (req, reply) => {
    const id = z.string().uuid().parse(req.params.vendorId);
    if (!(await pool.query('SELECT 1 FROM vendors WHERE id = $1', [id])).rowCount) throw notFound('Vendor not found');
    const old = req.cookies[COOKIES.vendor];
    if (old) await pool.query('DELETE FROM sessions WHERE token_hash = $1 AND acting_vendor_id IS NOT NULL', [hashToken(old)]);
    const tok = await createSession(req.user!.id, reply, 'vendor');
    await pool.query('UPDATE sessions SET acting_vendor_id = $2 WHERE token_hash = $1', [hashToken(tok), id]);
    await audit(req.user!.id, 'act_as.start', 'vendor', id);
    return { ok: true };
  });
  app.delete('/act-as', async (req, reply) => {
    const tok = req.cookies[COOKIES.vendor];
    if (tok) {
      const r = await pool.query('DELETE FROM sessions WHERE token_hash = $1 AND acting_vendor_id IS NOT NULL RETURNING 1', [hashToken(tok)]);
      if (r.rowCount) { await audit(req.user!.id, 'act_as.stop', 'user', req.user!.id); reply.clearCookie(COOKIES.vendor, { path: '/' }); }
    }
    return { ok: true };
  });

  app.get('/features', async () => (await pool.query('SELECT key, label, description, grp, enabled, updated_at FROM feature_flags ORDER BY grp, sort, key')).rows);
  app.put<{ Params: { key: string } }>('/features/:key', async (req) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    await tx(async (c) => {
      const r = await c.query('UPDATE feature_flags SET enabled = $2, updated_by = $3, updated_at = now() WHERE key = $1 RETURNING key', [req.params.key, enabled, req.user!.id]);
      if (!r.rowCount) throw notFound('Unknown switch');
      await audit(req.user!.id, 'feature.toggle', 'feature', req.params.key, { enabled }, c);
    });
    clearFeatureCache();
    return { ok: true };
  });

  app.get('/platform', async () => {
    const rows = (await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1::text[])', [Object.keys(PLATFORM_SWITCHES)])).rows;
    return Object.entries(PLATFORM_SWITCHES).map(([key, m]) => ({ key, ...m, enabled: rows.find((r) => r.key === key)?.value === true }));
  });
  app.put<{ Params: { key: string } }>('/platform/:key', async (req) => {
    if (!(req.params.key in PLATFORM_SWITCHES)) throw notFound('Unknown switch');
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    await tx(async (c) => {
      await c.query('INSERT INTO app_settings(key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()', [req.params.key, JSON.stringify(enabled)]);
      await audit(req.user!.id, 'platform.toggle', 'settings', req.params.key, { enabled }, c);
    });
    return { ok: true };
  });

  app.get('/portals', async () => (await pool.query('SELECT portal, hidden_nav, notice, notice_tone FROM portal_config ORDER BY portal')).rows);
  app.put<{ Params: { portal: string } }>('/portals/:portal', async (req) => {
    const portal = z.enum(PORTALS).parse(req.params.portal);
    const b = z.object({ hidden_nav: z.array(z.string().max(80)).max(60), notice: z.string().trim().max(300).nullable(), notice_tone: z.enum(['info', 'warn']).default('info') }).parse(req.body);
    // The page that lets an admin undo these changes can never be hidden.
    if (portal === 'admin' && b.hidden_nav.some((p) => /\/admin\/control/.test(p))) throw bad('cannot_hide', 'The control centre cannot be hidden.');
    await tx(async (c) => {
      await c.query('UPDATE portal_config SET hidden_nav = $2, notice = $3, notice_tone = $4, updated_by = $5, updated_at = now() WHERE portal = $1', [portal, b.hidden_nav, b.notice || null, b.notice_tone, req.user!.id]);
      await audit(req.user!.id, 'portal.customise', 'portal', portal, b, c);
    });
    return { ok: true };
  });

  app.get('/vendor-capabilities', async () => {
    const defaults = (await pool.query(`SELECT value FROM app_settings WHERE key = 'vendor.default_capabilities'`)).rows[0]?.value ?? {};
    const vendors = (await pool.query(`SELECT id, name, status, kind, capabilities FROM vendors ORDER BY name`)).rows;
    return { caps: VENDOR_CAPS, defaults, vendors: await Promise.all(vendors.map(async (v) => ({ ...v, effective: await vendorCaps(v.id) }))) };
  });
  app.put('/vendor-capabilities/defaults', async (req) => {
    const caps = z.record(z.enum(Object.keys(VENDOR_CAPS) as [VendorCap, ...VendorCap[]]), z.boolean()).parse(req.body);
    await tx(async (c) => {
      const cur = (await c.query(`SELECT value FROM app_settings WHERE key = 'vendor.default_capabilities' FOR UPDATE`)).rows[0]?.value ?? {};
      await c.query(`UPDATE app_settings SET value = $1::jsonb, updated_at = now() WHERE key = 'vendor.default_capabilities'`, [JSON.stringify({ ...cur, ...caps })]);
      await audit(req.user!.id, 'vendor.defaults', 'settings', 'vendor.default_capabilities', caps, c);
    });
    return { ok: true };
  });
  /** One vendor: true/false overrides the default, null goes back to the default. */
  app.put<{ Params: { id: string } }>('/vendor-capabilities/:id', async (req) => {
    const id = z.string().uuid().parse(req.params.id);
    const caps = z.record(z.enum(Object.keys(VENDOR_CAPS) as [VendorCap, ...VendorCap[]]), z.boolean().nullable()).parse(req.body);
    await tx(async (c) => {
      const cur = (await c.query('SELECT capabilities FROM vendors WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!cur) throw notFound('Vendor not found');
      const next: Record<string, boolean> = { ...cur.capabilities };
      for (const [k, v] of Object.entries(caps)) { if (v === null) delete next[k]; else next[k] = v; }
      await c.query('UPDATE vendors SET capabilities = $2::jsonb WHERE id = $1', [id, JSON.stringify(next)]);
      await audit(req.user!.id, 'vendor.capabilities', 'vendor', id, caps, c);
    });
    return { ok: true };
  });
};
