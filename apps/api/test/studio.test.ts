import { describe, expect, it } from 'vitest';
import { call, login, storeId } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { ACCENTS, inWindow, pickActive } from '../src/lib/themes.js';

// WCAG relative luminance contrast.
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('theme rules', () => {
  it('yearly windows compare month and day and may wrap over New Year', () => {
    const t = { starts_on: '2026-12-26', ends_on: '2027-01-01', repeats_yearly: true };
    expect(inWindow(t, '2031-12-31')).toBe(true);
    expect(inWindow(t, '2031-01-01')).toBe(true);
    expect(inWindow(t, '2031-06-01')).toBe(false);
  });
  it('one-off windows only match their own dates', () => {
    const t = { starts_on: '2027-03-22', ends_on: '2027-03-29', repeats_yearly: false };
    expect(inWindow(t, '2027-03-25')).toBe(true);
    expect(inWindow(t, '2028-03-25')).toBe(false);
  });
  it('forced beats scheduled, then priority wins; off never shows', () => {
    const base = { starts_on: '2026-01-01', ends_on: '2026-12-31', repeats_yearly: false };
    const a = { slug: 'a', status: 'auto' as const, priority: 10, ...base }, b = { slug: 'b', status: 'auto' as const, priority: 70, ...base };
    expect(pickActive([a, b], '2026-05-05')?.slug).toBe('b');
    expect(pickActive([a, { ...b, status: 'off' as const }], '2026-05-05')?.slug).toBe('a');
    expect(pickActive([{ ...a, status: 'on' as const }, b], '2026-05-05')?.slug).toBe('a');
  });
});

describe('colour safety', () => {
  it('every preset theme is readable in light and dark', async () => {
    const rows = (await pool.query('SELECT slug, palette FROM themes')).rows;
    expect(rows.length).toBeGreaterThanOrEqual(20);
    for (const { slug, palette: p } of rows) {
      expect(contrast(p.primary, '#ffffff'), `${slug} primary on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.primary, '#fbf6ec'), `${slug} primary on paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.deep, '#ffffff'), `${slug} deep`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.glow, '#101812'), `${slug} glow on dark`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.glow, '#18231b'), `${slug} glow on dark card`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.primary, p.tint), `${slug} primary on tint`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.hero_from, '#ffffff'), `${slug} hero start (white text)`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.hero_to, '#ffffff'), `${slug} hero end (white text)`).toBeGreaterThanOrEqual(3);
    }
  });
  it('every store accent is readable', () => {
    for (const [k, a] of Object.entries(ACCENTS)) {
      expect(contrast(a.primary, '#ffffff'), k).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.primary, a.tint), k).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.glow, '#101812'), k).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('studio API', () => {
  it('serves the active theme publicly and honours a forced theme', async () => {
    const admin = (await login('admin@example.test')).cookie;
    const list = await call(admin, 'GET', '/api/admin/themes');
    expect(list.status).toBe(200);
    const diwali = list.body.find((t: any) => t.slug === 'diwali');
    try {
      expect((await call(admin, 'POST', `/api/admin/themes/${diwali.id}/status`, { status: 'on' })).status).toBe(200);
      const pub = await call(null, 'GET', '/api/theme/active');
      expect(pub.body.theme.slug).toBe('diwali');
      expect(pub.body.theme.status).toBeUndefined(); // internal fields are not published
    } finally {
      await call(admin, 'POST', `/api/admin/themes/${diwali.id}/status`, { status: 'auto' });
    }
  });
  it('previews a theme for staff only', async () => {
    const admin = (await login('admin@example.test')).cookie, cust = (await login('customer@example.test')).cookie;
    const staff = await call(admin, 'GET', '/api/theme/active?preview=ramadan');
    expect(staff.body.theme?.slug).toBe('ramadan');
    const guest = await call(cust, 'GET', '/api/theme/active?preview=ramadan');
    expect(guest.body.theme?.slug).not.toBe('ramadan');
  });
  it('refuses theme management without permission and bad colours', async () => {
    const cust = (await login('customer@example.test')).cookie, admin = (await login('admin@example.test')).cookie;
    expect((await call(cust, 'GET', '/api/admin/themes')).status).toBe(403);
    const bad = await call(admin, 'POST', '/api/admin/themes', { name: 'X1', kind: 'custom', starts_on: '2027-01-01', ends_on: '2027-01-02', headline: 'Hi', palette: { primary: 'red', deep: '#000000', tint: '#ffffff', glow: '#ffffff', hero_from: '#000000', hero_to: '#000000' } });
    expect(bad.status).toBe(400);
    const offsite = await call(admin, 'POST', '/api/admin/themes', { name: 'X2', kind: 'custom', starts_on: '2027-01-01', ends_on: '2027-01-02', headline: 'Hi', cta_link: 'https://evil.example', palette: { primary: '#000000', deep: '#000000', tint: '#ffffff', glow: '#ffffff', hero_from: '#000000', hero_to: '#000000' } });
    expect(offsite.status).toBe(400);
  });
  it('banners appear only when live and in their window', async () => {
    const admin = (await login('admin@example.test')).cookie;
    const mk = (body: any) => call(admin, 'POST', '/api/admin/banners', { title: 'Test banner', cta_link: '/deals', ...body });
    const live = (await mk({ status: 'live' })).body, draft = (await mk({ status: 'draft', title: 'Draft banner' })).body;
    const past = (await mk({ status: 'live', title: 'Past banner', ends_at: '2020-01-01T00:00:00Z' })).body;
    try {
      const titles = (await call(null, 'GET', '/api/home/banners')).body.map((b: any) => b.title);
      expect(titles).toContain('Test banner'); expect(titles).not.toContain('Draft banner'); expect(titles).not.toContain('Past banner');
    } finally { for (const b of [live, draft, past]) await call(admin, 'DELETE', `/api/admin/banners/${b.id}`); }
  });
  it('lets a vendor brand only their own store, with safe values', async () => {
    const owner = (await login('owner1@example.test')).cookie, other = (await login('owner2@example.test')).cookie;
    const sid = await storeId('demo-calgary-west-african-market');
    const ok = await call(owner, 'PUT', `/api/vendor/stores/${sid}/branding`, { accent: 'plum', tagline: 'Fresh every morning', story: 'Our story', announcement: 'Closed Monday', featured_slugs: [], website: 'https://example.test', instagram: null, facebook: null });
    expect(ok.status).toBe(200);
    expect((await call(null, 'GET', '/api/stores/demo-calgary-west-african-market')).body.branding.accent.primary).toBe(ACCENTS.plum.primary);
    expect((await call(other, 'PUT', `/api/vendor/stores/${sid}/branding`, { accent: 'plum', tagline: null, story: null, announcement: null, featured_slugs: [], website: null, instagram: null, facebook: null })).status).toBe(403);
    expect((await call(owner, 'PUT', `/api/vendor/stores/${sid}/branding`, { accent: 'hotpink', tagline: null, story: null, announcement: null, featured_slugs: [], website: null, instagram: null, facebook: null })).status).toBe(400);
    expect((await call(owner, 'PUT', `/api/vendor/stores/${sid}/branding`, { accent: null, tagline: null, story: null, announcement: null, featured_slugs: [], website: 'javascript:alert(1)', instagram: null, facebook: null })).status).toBe(400);
    expect((await call(owner, 'PUT', `/api/vendor/stores/${sid}/branding`, { accent: null, tagline: null, story: null, announcement: null, featured_slugs: ['not-a-real-product'], website: null, instagram: null, facebook: null })).status).toBe(400);
    await call(owner, 'PUT', `/api/vendor/stores/${sid}/branding`, { accent: null, tagline: null, story: null, announcement: null, featured_slugs: [], website: null, instagram: null, facebook: null });
  });
});

describe('vendor messages', () => {
  it('vendor and staff can talk; vendors cannot see each other’s threads; unread counts work', async () => {
    const o1 = (await login('owner1@example.test')).cookie, o2 = (await login('owner2@example.test')).cookie, admin = (await login('admin@example.test')).cookie, cust = (await login('customer@example.test')).cookie;
    const made = await call(o1, 'POST', '/api/vendor/messages', { subject: 'Payout question', body: 'When is my payout?' });
    expect(made.status).toBe(201);
    const id = made.body.id;
    expect((await call(admin, 'GET', '/api/admin/messages/unread')).body.count).toBeGreaterThanOrEqual(1);
    expect((await call(o2, 'GET', `/api/vendor/messages/${id}`)).status).toBe(404);
    expect((await call(o2, 'POST', `/api/vendor/messages/${id}/reply`, { body: 'hijack' })).status).toBe(404);
    expect((await call(cust, 'GET', '/api/admin/messages')).status).toBe(403);
    expect((await call(cust, 'GET', '/api/vendor/messages')).status).toBe(403);
    const seen = await call(admin, 'GET', `/api/admin/messages/${id}`);
    expect(seen.body.messages).toHaveLength(1);
    expect((await call(admin, 'POST', `/api/admin/messages/${id}/reply`, { body: 'Fridays.' })).status).toBe(200);
    const before = (await call(o1, 'GET', '/api/vendor/messages/unread')).body.count; expect(before).toBeGreaterThanOrEqual(1);
    const read = await call(o1, 'GET', `/api/vendor/messages/${id}`);
    expect(read.body.messages.map((m: any) => m.body)).toEqual(['When is my payout?', 'Fridays.']);
    expect((await call(o1, 'GET', '/api/vendor/messages/unread')).body.count).toBe(before - 1);
    expect((await call(admin, 'POST', `/api/admin/messages/${id}/status`, { status: 'closed' })).status).toBe(200);
    await call(o1, 'POST', `/api/vendor/messages/${id}/reply`, { body: 'Thanks' });
    expect((await call(o1, 'GET', `/api/vendor/messages/${id}`)).body.thread.status).toBe('open'); // a vendor reply reopens it
    expect((await call(o1, 'POST', '/api/vendor/messages', { subject: 'x', body: '' })).status).toBe(400);
  });
});

describe('insights', () => {
  it('admin and vendor insights are internally consistent and scoped', async () => {
    const admin = (await login('admin@example.test')).cookie, o1 = (await login('owner1@example.test')).cookie, o2 = (await login('owner2@example.test')).cookie, cust = (await login('customer@example.test')).cookie;
    for (const days of [7, 30, 90]) {
      const a = await call(admin, 'GET', `/api/admin/reports/insights?days=${days}`);
      expect(a.status).toBe(200);
      expect(a.body.series).toHaveLength(days);
      expect(a.body.by_hour).toHaveLength(24); expect(a.body.by_weekday).toHaveLength(7);
      expect(a.body.series.reduce((x: number, r: any) => x + r.gross_cents, 0)).toBe(a.body.kpis.gross_cents.value);
      expect(a.body.series.reduce((x: number, r: any) => x + r.orders, 0)).toBeGreaterThanOrEqual(a.body.kpis.orders.value); // an order spanning two stores counts once per day per store scope
    }
    const sid = await storeId('demo-calgary-west-african-market');
    const v = await call(o1, 'GET', `/api/vendor/insights?days=30&store=${sid}`);
    expect(v.status).toBe(200); expect(v.body.top_stores).toEqual([]);
    const all = await call(admin, 'GET', '/api/admin/reports/insights?days=30');
    expect(v.body.kpis.gross_cents.value).toBeLessThanOrEqual(all.body.kpis.gross_cents.value);
    expect((await call(o2, 'GET', `/api/vendor/insights?days=30&store=${sid}`)).status).toBe(403);
    expect((await call(cust, 'GET', '/api/admin/reports/insights')).status).toBe(403);
    expect((await call(cust, 'GET', '/api/vendor/insights')).status).toBe(403);
    expect((await call(admin, 'GET', '/api/admin/reports/insights?days=0')).status).toBe(400);
  });
});

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { app as theApp } from './helpers.js';
describe.skipIf(!existsSync(resolve(import.meta.dirname, '../../web/dist/index.html')))('first-paint data', () => {
  it('pages carry the theme, announcement, banners and menus in the HTML, safely, and are never cached', async () => {
    for (const url of ['/', '/search', '/kitchens']) {
      const r = await theApp.inject({ url });
      expect(r.statusCode).toBe(200); expect(String(r.headers['cache-control'])).toContain('no-cache');
      const m = /<script type="application\/json" id="boot">([\s\S]*?)<\/script>/.exec(r.body)!;
      expect(m).toBeTruthy();
      const boot = JSON.parse(m[1]);
      for (const k of ['/theme/active', '/content/home', '/home/banners', '/regions', '/categories']) expect(boot).toHaveProperty([k]);
      expect(m[1]).not.toContain('<');                       // cannot close the tag early, whatever an editor typed into a headline
    }
    const asset = await theApp.inject({ url: '/api/health' });
    expect(asset.body).not.toContain('boot');
  });
});

describe('banner videos', () => {
  // Smallest byte patterns the type check looks for (not playable files: only the real file type is verified here).
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(32)]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32)]);
  const upload = async (cookie: string | null, buf: Buffer, name = 'clip.mp4') => {
    const boundary = '----t' + Math.random().toString(16).slice(2);
    const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: video/mp4\r\n\r\n`), buf, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    return theApp.inject({ method: 'POST', url: '/api/uploads/video', payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, ...(cookie ? { cookie } : {}) } });
  };
  it('only staff who manage the homepage can upload, and only real MP4/WebM files are kept', async () => {
    const mk = (await login('marketing@example.test')).cookie, cust = (await login('customer@example.test')).cookie, owner1 = (await login('owner1@example.test')).cookie;
    expect((await upload(null, mp4)).statusCode).toBe(401);
    expect((await upload(cust, mp4)).statusCode).toBe(403);
    expect((await upload(owner1, mp4)).statusCode).toBe(403);                         // a vendor cannot put video on the homepage
    const ok = await upload(mk, mp4); expect(ok.statusCode).toBe(200); expect(ok.json().url).toMatch(/^\/uploads\/[a-f0-9]{32}\.mp4$/);
    expect((await upload(mk, webm, 'x.webm')).json().url).toMatch(/\.webm$/);
    const r = await theApp.inject({ url: ok.json().url, headers: { range: 'bytes=0-9' } });   // browsers (Safari especially) need byte ranges to play video
    expect(r.statusCode).toBe(206); expect(String(r.headers['content-type'])).toContain('video/mp4');
    expect((await upload(mk, Buffer.from('<?php echo 1; ?>'), 'evil.mp4')).statusCode).toBe(400);   // name says mp4, bytes say otherwise
    expect((await upload(mk, Buffer.from('%PDF-1.4 hello'), 'doc.mp4')).statusCode).toBe(400);
  });
  it('a banner keeps only a video we stored, and visitors get it', async () => {
    const mk = (await login('marketing@example.test')).cookie;
    const url = (await upload(mk, mp4)).json().url as string;
    const bad = await call(mk, 'POST', '/api/admin/banners', { title: 'Evil', cta_link: '/', video_url: 'https://evil.example/x.mp4' });
    expect(bad.status).toBe(400);
    const made = await call(mk, 'POST', '/api/admin/banners', { title: 'Video banner', cta_link: '/deals', video_url: url, status: 'live' });
    expect(made.status).toBe(201);
    try { expect((await call(null, 'GET', '/api/home/banners')).body.find((b: any) => b.title === 'Video banner').video_url).toBe(url); }
    finally { await call(mk, 'DELETE', `/api/admin/banners/${made.body.id}`); }
  });
});
