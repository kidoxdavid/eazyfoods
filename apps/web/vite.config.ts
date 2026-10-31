import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const api = `http://localhost:${process.env.API_PORT ?? 4000}`;
const BOOT = ['/theme/active', '/content/home', '/home/banners', '/regions', '/categories'];

/** Development twin of what the API does in production: embed the first screen's data in the page so the first paint has real content. */
const bootData = (): Plugin => ({
  name: 'boot-data',
  apply: 'serve',
  async transformIndexHtml(html) {
    const entries = await Promise.all(BOOT.map(async (p) => { try { const r = await fetch(`${api}/api${p}`); return r.ok ? [p, await r.json()] : null; } catch { return null; } }));
    const json = JSON.stringify(Object.fromEntries(entries.filter(Boolean) as [string, unknown][])).replace(/</g, '\\u003c');
    return html.replace('</head>', `<script type="application/json" id="boot">${json}</script></head>`);
  },
});

/** Staff areas are their own app (portal.html, Tailwind, no customer styles). In development this serves it for those paths, like the API does in production. */
const PORTAL_AREAS = ['kitchen', 'vendor', 'driver', 'marketing', 'admin', 'finance', 'portals'];   // grows as each area is rebuilt
const portalRoutes = (): Plugin => ({
  name: 'portal-routes',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, _res, next) => {
      const m = /^\/([a-z]+)(\/|\?|$)/.exec(req.url ?? '');
      if (m && PORTAL_AREAS.includes(m[1])) {
        req.url = '/portal.html';
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), bootData(), portalRoutes()],
  server: { host: true, port: Number(process.env.WEB_PORT ?? 5173), proxy: { '/api': api, '/uploads': api } },
  build: { rollupOptions: { input: { main: 'index.html', portal: 'portal.html' }, output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] } } } },
});
