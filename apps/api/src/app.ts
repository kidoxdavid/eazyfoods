import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { loadUser } from './lib/auth.js';
import { hashToken } from './lib/password.js';
import { authRoutes } from './routes/auth.js';
import { catalogueRoutes } from './routes/catalogue.js';
import { searchRoutes } from './routes/search.js';
import { storeRoutes } from './routes/stores.js';
import { vendorRoutes } from './routes/vendor.js';
import { adminRoutes } from './routes/admin.js';
import { vendorOrderRoutes } from './routes/vendorOrders.js';
import { driverRoutes } from './routes/driver.js';
import { vendorMessageRoutes } from './routes/messages.js';
import { dishRoutes, kitchenRoutes } from './routes/kitchens.js';
import { marketingPublicRoutes, marketingRoutes } from './routes/marketing.js';
import { cardRoutes, customerRoutes } from './routes/customer.js';
import { vendorPortalRoutes } from './routes/vendorPortal.js';
import { supportRoutes } from './routes/support.js';
import { creditAdminRoutes, creditRoutes } from './routes/credit.js';
import { controlRoutes, featureRoutes } from './routes/control.js';
import { giftCardRoutes } from './routes/giftcards.js';
import { applySeo, robotsTxt, seoFor, seoIndexing, siteOrigin, sitemapXml } from './services/seo.js';
import { engagementRoutes } from './routes/engagement.js';
import { recipeRoutes } from './routes/recipes.js';
import { adRoutes } from './routes/ads.js';
import { vendorAnalyticsRoutes } from './routes/vendorAnalytics.js';
import { vendorAdRoutes } from './routes/vendorAds.js';
import { vendorStaffRoutes } from './routes/vendorStaff.js';
import { vendorReviewRoutes } from './routes/vendorReviews.js';
import { vendorCatalogueRoutes } from './routes/vendorCatalogue.js';
import { badgeRoutes } from './routes/badges.js';
import { uploadRoutes } from './routes/uploads.js';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mimeOf, readStored } from './lib/storage.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cartRoutes } from './routes/cart.js';
import { accountRoutes } from './routes/account.js';
import { orderRoutes } from './routes/orders.js';
import { paymentRoutes, webhookRoutes } from './routes/payments.js';
import { contentRoutes } from './routes/content.js';

export async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'] },
  });

  // Maps (driver navigation, live delivery position) are embedded as frames from these hosts only.
  await app.register(helmet, { contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'frame-src': ["'self'", 'https://maps.google.com', 'https://www.google.com', 'https://www.openstreetmap.org'] } } });
  await app.register(compress, { threshold: 1024 });   // gzip/brotli for HTML, JS, CSS and JSON (images and video are already compressed and are skipped)
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(multipart);
  // Uploads come from disk, or from the database when the host wiped the disk; either way the URL never changes.
  app.get<{ Params: { key: string } }>('/uploads/:key', async (req, reply) => {
    const buf = await readStored(req.params.key, 'public');
    if (!buf) return reply.code(404).send({ error: 'not_found' });
    reply.header('content-type', mimeOf(req.params.key)).header('cache-control', 'public, max-age=2592000, immutable').header('x-content-type-options', 'nosniff').header('accept-ranges', 'bytes');
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));   // video players (Safari especially) ask for byte ranges
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, buf.length - Number(m[2])); const end = m[1] && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
      if (start > end || start >= buf.length) return reply.code(416).header('content-range', `bytes */${buf.length}`).send();
      return reply.code(206).header('content-range', `bytes ${start}-${end}/${buf.length}`).header('content-length', end - start + 1).send(buf.subarray(start, end + 1));
    }
    return reply.send(buf);
  });

  app.decorateRequest('user', null);
  app.addHook('onRequest', loadUser);
  // CSRF defence in depth on top of SameSite=Lax: reject cross-origin state-changing browser requests.
  app.addHook('onRequest', async (req, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
    const origin = req.headers.origin;
    // Allowed: the configured site origin, or a request from the same host that served the page (single-host deployments).
    const sameHost = (() => { try { return !!origin && new URL(origin).host === String(req.headers['x-forwarded-host'] ?? req.headers.host); } catch { return false; } })();
    if (origin && origin !== config.WEB_ORIGIN && !sameHost) return reply.code(403).send({ error: 'bad_origin' });
  });

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof ZodError) {
      // Readable summary for the UI ("price_cents: Expected number"), with the raw issues kept for tooling.
      const message = err.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ` : '') + i.message).join('; ');
      return reply.code(400).send({ error: 'validation', message, issues: err.issues });
    }
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.code ?? 'error', message: err.message, ...(err.details ? { details: err.details } : {}) });
    if (config.NODE_ENV === 'test') console.error(err);
    req.log.error(err);
    pool.query('INSERT INTO error_events(message, stack, method, url, request_id, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [String(err.message).slice(0, 500), String(err.stack ?? '').slice(0, 4000), req.method, req.url.split('?')[0], req.id, req.user?.id ?? null]).catch(() => {});
    return reply.code(500).send({ error: 'internal', message: 'Something went wrong on our side. Please try again.' });
  });

  app.get('/health', async () => {
    const { pool } = await import('./db/pool.js');
    await pool.query('SELECT 1');
    return { ok: true };
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(catalogueRoutes, { prefix: '/api' });
  await app.register(searchRoutes, { prefix: '/api' });
  await app.register(storeRoutes, { prefix: '/api' });
  await app.register(vendorRoutes, { prefix: '/api/vendor' });
  await app.register(vendorOrderRoutes, { prefix: '/api/vendor' });
  await app.register(vendorPortalRoutes, { prefix: '/api/vendor' });
  await app.register(vendorMessageRoutes, { prefix: '/api/vendor' });
  await app.register(dishRoutes, { prefix: '/api/vendor' });
  await app.register(vendorCatalogueRoutes, { prefix: '/api/vendor' });
  await app.register(vendorReviewRoutes, { prefix: '/api/vendor' });
  await app.register(vendorStaffRoutes, { prefix: '/api/vendor' });
  await app.register(vendorAdRoutes, { prefix: '/api/vendor' });
  await app.register(vendorAnalyticsRoutes, { prefix: '/api/vendor' });
  await app.register(kitchenRoutes, { prefix: '/api' });
  await app.register(cardRoutes, { prefix: '/api' });
  await app.register(customerRoutes, { prefix: '/api' });
  await app.register(marketingRoutes, { prefix: '/api/marketing' });
  await app.register(creditAdminRoutes, { prefix: '/api/marketing' });
  await app.register(creditRoutes, { prefix: '/api' });
  await app.register(featureRoutes, { prefix: '/api' });
  await app.register(giftCardRoutes, { prefix: '/api' });
  await app.register(controlRoutes, { prefix: '/api/admin/control' });
  await app.register(marketingPublicRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(cartRoutes, { prefix: '/api' });
  await app.register(accountRoutes, { prefix: '/api' });
  await app.register(orderRoutes, { prefix: '/api' });
  await app.register(paymentRoutes, { prefix: '/api' });
  await app.register(webhookRoutes, { prefix: '/api' });
  await app.register(contentRoutes, { prefix: '/api' });
  await app.register(driverRoutes, { prefix: '/api' });
  await app.register(supportRoutes, { prefix: '/api' });
  await app.register(engagementRoutes, { prefix: '/api' });
  await app.register(recipeRoutes, { prefix: '/api' });
  await app.register(adRoutes, { prefix: '/api' });
  await app.register(uploadRoutes, { prefix: '/api' });
  await app.register(badgeRoutes, { prefix: '/api' });

  // Single-host deployment: serve the built web app (and its client-side routes) from the API when it has been built.
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (existsSync(join(dist, 'index.html'))) {
    await app.register(fastifyStatic, { root: dist, prefix: '/', wildcard: false, index: false, maxAge: '1h',
      setHeaders: (res, path) => {
        if (/[\\/]assets[\\/]/.test(path)) res.header('cache-control', 'public, max-age=31536000, immutable');   // hashed file names never change
        else if (/[\\/](sw\.js|offline\.html|site\.webmanifest)$/.test(path)) res.header('cache-control', 'no-cache');   // the service worker must update promptly
      } });
    const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
    // The first screen needs the same few small answers on every page (theme, announcement, homepage banners, menus).
    // Embedding them in the page removes a round trip, so the first paint already has the real content instead of a placeholder.
    const BOOT = ['/theme/active', '/content/home', '/home/banners', '/regions', '/categories', '/home/shape'];
    app.get('/robots.txt', async (req, reply) => reply.type('text/plain').header('cache-control', 'public, max-age=3600').send(robotsTxt(siteOrigin(req.headers.host), seoIndexing())));
    app.get('/sitemap.xml', async (req, reply) => {
      if (!seoIndexing()) return reply.code(404).send({ error: 'not_found' });
      return reply.type('application/xml').header('cache-control', 'public, max-age=3600').send(await sitemapXml(siteOrigin(req.headers.host)));
    });
    // Staff areas that have been rebuilt as their own app (portal.html: Tailwind, no customer styles). The list grows as each area is rebuilt.
    const PORTAL_AREAS = ['vendor'];
    const portalHtml = existsSync(join(dist, 'portal.html')) ? readFileSync(join(dist, 'portal.html'), 'utf8') : null;
    // Kitchens (home chefs and restaurants) manage dishes, slots and cuisines, which the grocery portal has no pages for, so a signed-in kitchen keeps the original console until its own portal is rebuilt.
    const keepsOwnApp = async (req: any, area: string) => {
      if (area !== 'vendor' || /^\/vendor\/(signin|signup)/.test(req.url)) return false;
      const token = req.cookies?.ez_vendor; if (!token) return false;
      try {
        const { rows } = await pool.query(
          `SELECT 1 FROM sessions se LEFT JOIN user_roles r ON r.user_id = se.user_id JOIN stores s ON s.vendor_id = COALESCE(se.acting_vendor_id, r.vendor_id)
            WHERE se.token_hash = $1 AND se.expires_at > now() AND s.kind = 'kitchen' LIMIT 1`, [hashToken(token)]);
        return rows.length > 0;
      } catch { return false; }
    };
    app.setNotFoundHandler(async (req, reply) => {
      const area = /^\/([a-z]+)(\/|\?|$)/.exec(req.url)?.[1];
      if (req.method === 'GET' && portalHtml && area && PORTAL_AREAS.includes(area) && !(await keepsOwnApp(req, area))) return reply.header('cache-control', 'no-cache').type('text/html').send(portalHtml);
      if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
        const entries = await Promise.all(BOOT.map(async (p) => { try { const r = await app.inject({ url: `/api${p}` }); return r.statusCode === 200 ? [p, r.json()] : null; } catch { return null; } }));
        const json = JSON.stringify(Object.fromEntries(entries.filter(Boolean) as [string, unknown][])).replace(/</g, '\\u003c');
        // A JSON data block (not a script), so the content-security policy that blocks inline scripts is not involved.
        return reply.header('cache-control', 'no-cache').type('text/html').send(applySeo(indexHtml, await seoFor(req.url, siteOrigin(req.headers.host)).catch(() => ({ title: 'EAZyfoods', description: '', canonical: siteOrigin(req.headers.host) })), seoIndexing()).replace('</head>', `<script type="application/json" id="boot">${json}</script></head>`));
      }
      return reply.code(404).send({ error: 'not_found' });
    });
  }
  return app;
}
