// Builds the route inventory from the apps' own routing files, so the list can never drift from what is really served.
// Usage: node qa/inventory.mjs   (writes qa/routes.json)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/src');
const APPS = [
  { app: 'customer', file: 'App.tsx', prefix: '', email: 'customer@example.test' },
  { app: 'vendor', file: 'portal/vendor/App.jsx', prefix: '/vendor', email: 'owner1@example.test' },
  { app: 'chef', file: 'portal/chef/App.jsx', prefix: '/vendor', email: 'chef1@example.test' },
  { app: 'driver', file: 'portal/driver/App.jsx', prefix: '/driver', email: 'driver@example.test' },
  { app: 'marketing', file: 'portal/marketing/App.jsx', prefix: '/marketing', email: 'marketing@example.test' },
  { app: 'finance', file: 'portal/finance/App.jsx', prefix: '/finance', email: 'finance@example.test' },
  { app: 'admin', file: 'portal/admin/App.jsx', prefix: '/admin', email: 'admin@example.test' },
  { app: 'hub', file: 'portal/hub/App.jsx', prefix: '/portals', email: null },
];
const SKIP = new Set(['*', '/*', '/admin/*', '/marketing/*', '/vendor/*', '/driver/*', '/finance/*', '/portals']);   // wildcards and hand-offs between apps
const PUBLIC_AUTH = /^\/(signin|signup|login|register|forgot|reset|verify)$/;
const out = [];
for (const a of APPS) {
  const src = readFileSync(resolve(web, a.file), 'utf8');
  const paths = [...new Set([...src.matchAll(/path="([^"]*)"/g)].map((m) => m[1]))];
  if (a.app === 'hub') paths.push('/');
  for (let p of paths) {
    if (SKIP.has(p) && !(a.app === 'hub')) continue;
    if (!p.startsWith('/')) p = '/' + p;                                  // the driver app writes its routes without a leading slash
    out.push({ app: a.app, route: p, url: (a.prefix + (p === '/' ? '' : p)) || '/', dynamic: p.includes(':'), signedIn: a.email !== null && !PUBLIC_AUTH.test(p), email: a.email });
  }
}
const seen = new Set(); const uniq = out.filter((r) => { const k = r.app + r.url; if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'routes.json'), JSON.stringify(uniq, null, 1));
const byApp = {}; for (const r of uniq) byApp[r.app] = (byApp[r.app] ?? 0) + 1;
console.log(uniq.length, 'routes', JSON.stringify(byApp), 'dynamic:', uniq.filter((r) => r.dynamic).length);
