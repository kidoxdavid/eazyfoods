/* EAZyfoods service worker. Deliberately small and safe:
   - app files (hashed, never change) are cached for speed and offline start-up
   - pages try the network first and fall back to a friendly offline page
   - /api and uploads are NEVER cached: prices, stock, baskets and orders must always be live */
const VERSION = 'v1';
const SHELL = `ez-shell-${VERSION}`;
const ASSETS = `ez-assets-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/offline.html', '/logo-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, ASSETS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.open(ASSETS).then(async (c) => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }));
    return;
  }
  if (req.mode === 'navigate') e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
});
