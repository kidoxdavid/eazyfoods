import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser, Page } from 'playwright-core';
import { base, DESKTOP, launch, MOBILE, newPage, signIn } from './helpers.js';

/**
 * The crawler: for every sign-in role, loads every page of its app (and follows links to detail pages) on a desktop and a phone, and reports
 * anything broken: script errors, failed API calls, pages bounced to sign-in, blank or error pages, and sideways scrolling on phones.
 */
let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

type Role = { name: string; email: string | null; prefix: string; pages: string[] };
const P = (prefix: string, ...p: string[]) => p.map((x) => prefix + x);
const ROLES: Role[] = [
  { name: 'visitor', email: null, prefix: '', pages: ['/', '/search?q=garri', '/deals', '/flyer', '/help', '/gift-cards', '/new', '/new-arrivals', '/stores', '/kitchens', '/recipes', '/cart', '/signin', '/register', '/forgot'] },
  { name: 'customer', email: 'customer@example.test', prefix: '', pages: ['/', '/search?q=rice', '/deals', '/credit', '/stores', '/kitchens', '/recipes', '/cart', '/checkout', '/orders', '/account', '/lists', '/alerts', '/gift-cards'] },
  { name: 'vendor', email: 'owner1@example.test', prefix: '/vendor', pages: P('/vendor', '', '/products', '/products/new', '/orders', '/deliveries', '/inventory', '/inventory/scan', '/labels', '/import', '/promotions', '/reviews', '/analytics', '/payouts', '/support', '/chat', '/staff', '/profile', '/documentation', '/ads', '/ads/new', '/stores', '/storefront', '/questions', '/reports', '/statement') },
  { name: 'chef', email: 'chef1@example.test', prefix: '/vendor', pages: P('/vendor', '', '/profile', '/gallery', '/reviews', '/ads', '/analytics', '/chat', '/support', '/cuisines', '/cuisines/new', '/documentation', '/orders', '/promotions', '/payouts', '/settings', '/storefront', '/questions', '/reports', '/statement') },
  { name: 'driver', email: 'driver@example.test', prefix: '/driver', pages: P('/driver', '', '/available-deliveries', '/my-deliveries', '/delivery-history', '/earnings', '/statement', '/performance', '/ratings', '/support', '/chat', '/profile', '/documentation', '/settings') },
  { name: 'marketing', email: 'marketing@example.test', prefix: '/marketing', pages: P('/marketing', '', '/analytics', '/campaigns', '/emails', '/email-templates', '/audiences', '/automations', '/social', '/budget', '/calendar', '/library', '/coupons', '/studio', '/rewards', '/settings') },
  { name: 'finance', email: 'finance@example.test', prefix: '/finance', pages: P('/finance', '', '/balances', '/refunds', '/settlements', '/reconciliation', '/gift-cards', '/pricing', '/insights', '/reports', '/orders', '/system') },
  { name: 'admin', email: 'admin@example.test', prefix: '/admin', pages: P('/admin', '', '/orders', '/dispatch', '/drivers', '/support', '/refunds', '/customers', '/reviews', '/pricing', '/overview', '/settlements', '/reconciliation', '/gift-cards', '/vendors', '/messages', '/stores', '/catalogue', '/dishes', '/taxonomy', '/zones', '/promotions', '/ads', '/studio', '/content', '/crm', '/finance', '/insights', '/reports', '/control', '/settings', '/system') },
];

// Responses that are expected while crawling: probing sign-in for every window, and optional data that may simply not exist yet.
const EXPECTED = (url: string, status: number) =>
  (/\/api\/auth\/login/.test(url) && status === 403) || (/\/api\/auth\/me/.test(url) && status === 401) || status === 304;

const shape = (path: string) => path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id').replace(/\/\d+/g, '/:n').replace(/\/[a-z0-9-]+$/, (m) => (/^\/(new|signin|register|forgot)$/.test(m) ? m : '/:slug')).split('?')[0];

async function visit(page: Page, url: string, size: { width: number }, prefix: string, problems: string[], seen: Set<string>) {
  const label = `${url}`;
  const bad: string[] = [];
  const onResp = (r: any) => { const s = r.status(); if (s >= 400 && !EXPECTED(r.url(), s)) bad.push(`${s} ${new URL(r.url()).pathname}`); };
  const onErr = (e: Error) => bad.push(`script error: ${e.message.slice(0, 160)}`);
  page.on('response', onResp); page.on('pageerror', onErr);
  try {
    await page.goto(base() + url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(250);
    const here = new URL(page.url()).pathname;
    if (/signin|login/.test(here) && !/signin|login/.test(url)) bad.push(`bounced to ${here}`);
    const info = await page.evaluate(() => ({
      text: document.body.innerText.trim().length,
      boundary: /something went wrong|unexpected error|cannot read prop|is not defined|undefined is not|\[object Object\]|NaN/i.test(document.body.innerText),
      over: document.documentElement.scrollWidth - window.innerWidth,
    }));
    if (info.text < 20) bad.push('blank page');
    if (info.boundary) bad.push('error text on page: ' + ((await page.evaluate(() => document.body.innerText.match(/something went wrong|unexpected error|cannot read prop\w*|\w+ is not defined|undefined is not|\[object Object\]|NaN/i)?.[0])) ?? ''));
    if (size.width < 600 && info.over > 2) bad.push(`sideways scroll (${info.over}px too wide)`);
    // Detail pages worth visiting next: one per kind of link.
    const links: string[] = await page.evaluate((pre) => [...document.querySelectorAll('a[href^="/"]')].map((a) => (a as HTMLAnchorElement).getAttribute('href')!).filter((h) => !pre || h.startsWith(pre + '/')), prefix);
    for (const l of links) { const k = shape(l); if (!seen.has(k) && /\/(p|s|k|c|recipes|orders|lists|gift-cards|pages|vendors|customers|catalogue|support|emails|ads|cuisines|products)\/[^/]+(\/edit)?$/.test(l.split('?')[0]) && !/\/new$/.test(l)) { seen.add(k); pending.push(l); } }
  } catch (e: any) { bad.push(`could not load: ${String(e.message).slice(0, 120)}`); }
  page.off('response', onResp); page.off('pageerror', onErr);
  if (bad.length) problems.push(`${label}: ${[...new Set(bad)].join('; ')}`);
}
let pending: string[] = [];

for (const role of ROLES) {
  for (const [dev, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
    describe(`crawl: ${role.name} (${dev})`, () => {
      it('every page loads cleanly', async () => {
        const { ctx, page } = await newPage(browser, size);
        if (role.email) await signIn(page, role.email);
        const problems: string[] = []; const seen = new Set<string>(); pending = [];
        for (const u of role.pages) { seen.add(shape(u)); await visit(page, u, size, role.prefix, problems, seen); }
        for (let i = 0; i < pending.length && i < 25; i++) await visit(page, pending[i], size, role.prefix, problems, seen);
        await ctx.close();
        expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
      }, 600_000);
    });
  }
}
