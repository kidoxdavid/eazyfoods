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
