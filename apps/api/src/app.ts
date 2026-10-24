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
import { applySeo, robotsTxt, seoFor, seoIndexing, siteOrigin, sitemapXml } from './services/seo.js';
import { engagementRoutes } from './routes/engagement.js';
import { recipeRoutes } from './routes/recipes.js';
import { adRoutes } from './routes/ads.js';
import { uploadRoutes } from './routes/uploads.js';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { publicDir } from './lib/storage.js';
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

  await app.register(helmet);
  await app.register(compress, { threshold: 1024 });   // gzip/brotli for HTML, JS, CSS and JSON (images and video are already compressed and are skipped)
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(multipart);
  await app.register(fastifyStatic, { root: publicDir, prefix: '/uploads/', decorateReply: false, immutable: true, maxAge: '30d', dotfiles: 'deny' });

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
  await app.register(kitchenRoutes, { prefix: '/api' });
  await app.register(cardRoutes, { prefix: '/api' });
  await app.register(customerRoutes, { prefix: '/api' });
  await app.register(marketingRoutes, { prefix: '/api/marketing' });
  await app.register(creditAdminRoutes, { prefix: '/api/marketing' });
  await app.register(creditRoutes, { prefix: '/api' });
  await app.register(featureRoutes, { prefix: '/api' });
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
    const BOOT = ['/theme/active', '/content/home', '/home/banners', '/regions', '/categories'];
    app.get('/robots.txt', async (req, reply) => reply.type('text/plain').header('cache-control', 'public, max-age=3600').send(robotsTxt(siteOrigin(req.headers.host), seoIndexing())));
    app.get('/sitemap.xml', async (req, reply) => {
      if (!seoIndexing()) return reply.code(404).send({ error: 'not_found' });
      return reply.type('application/xml').header('cache-control', 'public, max-age=3600').send(await sitemapXml(siteOrigin(req.headers.host)));
    });
    app.setNotFoundHandler(async (req, reply) => {
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
