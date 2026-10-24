import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { app, openAllStores } from './helpers.js';
import { applySeo, robotsTxt, seoFor, sitemapXml } from '../src/services/seo.js';

const O = 'https://shop.example';
const HTML = '<html><head><title>x</title><meta name="description" content="old" /></head><body></body></html>';

describe('SEO', () => {
  it('product pages get their own title, canonical link, price range and structured data', async () => {
    await openAllStores();
    const s = await seoFor('/p/garri-white', O);
    expect(s.title).toContain('Garri');
    expect(s.canonical).toBe(`${O}/p/garri-white`);
    const ld: any = s.jsonLd![0];
    expect(ld['@type']).toBe('Product');
    expect(ld.offers.priceCurrency).toBe('CAD');
    expect(Number(ld.offers.lowPrice)).toBeGreaterThan(0);
    const html = applySeo(HTML, s, true);
    expect(html).toContain(`<link rel="canonical" href="${O}/p/garri-white" />`);
    expect(html).toContain('application/ld+json');
    expect(html).not.toContain('content="old"');
    expect(html).not.toContain('noindex');
  });
  it('escapes everything it injects', () => {
    const html = applySeo(HTML, { title: 'A "quote" <b>', description: '</script><script>alert(1)</script>', canonical: O + '/', jsonLd: [{ name: '</script><script>alert(1)</script>' }] }, true);
    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toMatch(/<title>[^<]*<b>/);
  });
  it('keeps private and unknown pages out of search results', async () => {
    for (const p of ['/cart', '/checkout', '/orders/123', '/account', '/admin/users', '/credit']) expect((await seoFor(p, O)).noindex).toBe(true);
    expect((await seoFor('/p/does-not-exist', O)).noindex).toBe(true);
    expect(applySeo(HTML, await seoFor('/cart', O), true)).toContain('noindex');
    expect(applySeo(HTML, await seoFor('/', O), false)).toContain('noindex');                 // demo/staging: never indexed
  });
  it('never puts a home kitchen street address in structured data', async () => {
    const s = await seoFor('/k/demo-mama-ngozi-kitchen', O);
    const ld: any = s.jsonLd?.[0];
    if (ld) { expect(ld.address.streetAddress).toBeUndefined(); expect(ld.address.postalCode).toBeUndefined(); }
  });
  it('sitemap lists public pages and no private ones; robots blocks the rest', async () => {
    const xml = await sitemapXml(O);
    expect(xml).toContain(`<loc>${O}/p/garri-white</loc>`);
    expect(xml).toContain(`<loc>${O}/deals</loc>`);
    expect(xml).not.toMatch(/\/(cart|admin|vendor|checkout|orders)/);
    const r = robotsTxt(O, true);
    expect(r).toContain('Disallow: /admin');
    expect(r).toContain(`Sitemap: ${O}/sitemap.xml`);
    expect(robotsTxt(O, false)).toContain('Disallow: /\n');
  });
  it.skipIf(!existsSync(new URL('../../web/dist/index.html', import.meta.url)))('the served page carries the product tags and robots.txt is reachable', async () => {
    const r = await app.inject({ url: '/p/garri-white' });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('rel="canonical"');
    expect(r.body).toContain('id="boot"');
    expect((await app.inject({ url: '/robots.txt' })).statusCode).toBe(200);
  });
});
