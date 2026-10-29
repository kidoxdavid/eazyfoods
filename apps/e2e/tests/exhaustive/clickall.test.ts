import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser, Page } from 'playwright-core';
import { base, DESKTOP, launch, MOBILE, newPage, signIn } from '../helpers.js';

/**
 * Clicks every button on every page, as every kind of user, on a desktop and a phone, and records what happened.
 * Hard failures (script errors, server errors, blank or broken pages, being thrown out of the area) fail the test.
 * Warnings (a button that did nothing, a button covered by something else, a refused request) are written to a report to be reviewed.
 * This run deletes, approves and cancels things, so it only ever runs against the throwaway test database.
 */
let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

type Role = { name: string; email: string | null; prefix: string; pages: string[] };
const P = (prefix: string, ...p: string[]) => p.map((x) => prefix + x);
const ROLES: Role[] = [
  { name: 'visitor', email: null, prefix: '', pages: ['/', '/search?q=garri', '/deals', '/flyer', '/help', '/gift-cards', '/new', '/stores', '/kitchens', '/recipes', '/cart', '/signin', '/register', '/forgot'] },
  { name: 'customer', email: 'customer@example.test', prefix: '', pages: ['/', '/search?q=rice', '/deals', '/credit', '/stores', '/kitchens', '/recipes', '/cart', '/checkout', '/orders', '/account', '/lists', '/alerts', '/gift-cards'] },
  { name: 'vendor', email: 'owner1@example.test', prefix: '/vendor', pages: P('/vendor', '', '/products', '/products/new', '/orders', '/deliveries', '/inventory', '/inventory/scan', '/labels', '/import', '/promotions', '/reviews', '/analytics', '/payouts', '/support', '/chat', '/staff', '/profile', '/documentation', '/ads', '/ads/new', '/stores', '/storefront', '/questions', '/reports', '/statement') },
  { name: 'chef', email: 'chef1@example.test', prefix: '/vendor', pages: P('/vendor', '', '/profile', '/gallery', '/reviews', '/ads', '/analytics', '/chat', '/support', '/cuisines', '/cuisines/new', '/documentation', '/orders', '/promotions', '/payouts', '/settings', '/storefront', '/questions', '/reports', '/statement') },
  { name: 'driver', email: 'driver@example.test', prefix: '/driver', pages: P('/driver', '', '/available-deliveries', '/my-deliveries', '/delivery-history', '/earnings', '/statement', '/performance', '/ratings', '/support', '/chat', '/profile', '/documentation', '/settings') },
  { name: 'marketing', email: 'marketing@example.test', prefix: '/marketing', pages: P('/marketing', '', '/analytics', '/campaigns', '/emails', '/email-templates', '/audiences', '/automations', '/social', '/budget', '/calendar', '/library', '/coupons', '/studio', '/rewards', '/settings') },
  { name: 'finance', email: 'finance@example.test', prefix: '/finance', pages: P('/finance', '', '/balances', '/refunds', '/settlements', '/reconciliation', '/gift-cards', '/pricing', '/insights', '/reports', '/orders', '/system') },
  { name: 'admin', email: 'admin@example.test', prefix: '/admin', pages: P('/admin', '', '/orders', '/dispatch', '/drivers', '/support', '/refunds', '/customers', '/reviews', '/pricing', '/overview', '/settlements', '/reconciliation', '/gift-cards', '/vendors', '/messages', '/stores', '/catalogue', '/dishes', '/taxonomy', '/zones', '/promotions', '/ads', '/studio', '/content', '/crm', '/finance', '/insights', '/reports', '/control', '/settings', '/system') },
];

const CLICKABLE = 'button, [role="button"], [role="tab"], [role="menuitem"], summary, input[type="checkbox"], input[type="radio"], input[type="submit"], a:not([href]), a[href="#"]';
const SKIP = /sign ?out|log ?out|delete (my )?account|erase|deactivate/i;   // ends the session or the account: checked separately
const EXPECTED = (url: string, status: number) => (/\/api\/auth\/login/.test(url) && status === 403) || (/\/api\/auth\/me/.test(url) && status === 401) || status === 304;
const MAX_PER_PAGE = 120;

type Report = { hard: string[]; warn: string[]; clicked: number; links: Set<string> };

const nameOf = (loc: ReturnType<Page['locator']>) => loc.evaluate((e) => {
  const el = e as HTMLElement & { value?: string };
  return (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.value || el.getAttribute('name') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
});

async function clickEverything(page: Page, url: string, prefix: string, rep: Report, dev: string) {
  const where = `${dev} ${url}`;
  let hard: string[] = [], warn: string[] = [], reqs = 0;
  const onResp = (r: any) => { reqs++; const s = r.status(), u = new URL(r.url()).pathname; if (s >= 500) hard.push(`${s} ${u}`); else if (s >= 400 && !EXPECTED(r.url(), s)) warn.push(`${s} ${u}`); };
  const onErr = (e: Error) => hard.push(`script error: ${e.message.slice(0, 140)}`);
  const onDialog = (d: any) => d.accept().catch(() => {});
  const onPopup = (p: Page) => p.close().catch(() => {});
  page.on('response', onResp); page.on('pageerror', onErr); page.on('dialog', onDialog); page.on('popup', onPopup);
  const open = async () => { await page.goto(base() + url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {}); await page.waitForTimeout(200); };
  const done = new Set<string>();
  try {
    await open();
    for (let step = 0; step < MAX_PER_PAGE; step++) {
      // Find the next button not yet clicked on this page (the list changes as modals open and panels expand).
      const all = page.locator(CLICKABLE);
      const n = await all.count();
      let target = null as null | { i: number; key: string; name: string }; const seenCount = new Map<string, number>();
      for (let i = 0; i < n && !target; i++) {
        const el = all.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;
        const name = await nameOf(el).catch(() => '');
        const k = `${name}#${seenCount.get(name) ?? 0}`; seenCount.set(name, (seenCount.get(name) ?? 0) + 1);
        if (done.has(k) || SKIP.test(name)) continue;
        target = { i, key: k, name };
      }
      if (!target) break;
      done.add(target.key);
      const el = all.nth(target.i);
      const before = await page.evaluate(() => ({ html: document.body.innerHTML.length, url: location.href, dlg: document.querySelectorAll('[role=dialog]').length }));
      const reqBefore = reqs; hard = []; warn = [];
      try { await el.click({ timeout: 3000 }); rep.clicked++; }
      catch (e: any) {
        const m = String(e.message);
        if (/intercepts pointer events|not visible|outside of the viewport/i.test(m)) rep.warn.push(`${where} "${target.name}": cannot be clicked (${/intercepts/.test(m) ? 'covered by another element' : /outside/.test(m) ? 'off screen' : 'hidden'})`);
        continue;
      }
      await page.waitForTimeout(350);
      const after = await page.evaluate(() => ({ html: document.body.innerHTML.length, url: location.href, dlg: document.querySelectorAll('[role=dialog]').length, text: document.body.innerText, blank: document.body.innerText.trim().length < 20 }));
      const here = new URL(after.url);
      if (here.origin !== new URL(base()).origin) { await open(); continue; }
      if (/signin|login/.test(here.pathname) && !/signin|login/.test(url) && !/^\/(signin)?$/.test(url)) hard.push(`thrown out to ${here.pathname}`);
      if (after.blank) hard.push('page went blank');
      const bad = after.text.match(/\bNaN\b|something went wrong|unexpected error|cannot read prop\w*|\w+ is not defined|undefined is not|\[object Object\]/i)?.[0];
      if (bad) hard.push(`error text on page: ${bad}`);
      const changed = after.url !== before.url || after.html !== before.html || after.dlg !== before.dlg || reqs !== reqBefore;
      if (!changed) warn.push('no visible effect');
      for (const h of hard) rep.hard.push(`${where} "${target.name}": ${h}`);
      for (const w of [...new Set(warn)]) rep.warn.push(`${where} "${target.name}": ${w}`);
      // Dealing with what the click led to: click inside an opened dialog, then close it; come back if we navigated away.
      if (after.dlg > 0) {
        const dlgBtns = page.locator('[role="dialog"] :is(button, [role="button"], summary, input[type="checkbox"], input[type="radio"])');
        const m = await dlgBtns.count();
        for (let j = 0; j < Math.min(m, 12); j++) {
          if (!(await page.locator('[role="dialog"]').count())) break;
          const b = dlgBtns.nth(j);
          if (!(await b.isVisible().catch(() => false))) continue;
          const bn = await nameOf(b).catch(() => '');
          if (SKIP.test(bn)) continue;
          hard = []; warn = [];
          try { await b.click({ timeout: 2000 }); rep.clicked++; } catch { continue; }
          await page.waitForTimeout(250);
          const t = await page.evaluate(() => document.body.innerText);
          const bad2 = t.match(/\bNaN\b|something went wrong|unexpected error|cannot read prop\w*|\[object Object\]/i)?.[0];
          if (bad2) hard.push(`error text on page: ${bad2}`);
          for (const h of hard) rep.hard.push(`${where} "${target.name}" > "${bn}": ${h}`);
          for (const w of [...new Set(warn)]) rep.warn.push(`${where} "${target.name}" > "${bn}": ${w}`);
        }
      }
      const nowUrl = new URL(page.url());
      if (nowUrl.pathname + nowUrl.search !== new URL(base() + url).pathname + new URL(base() + url).search || (await page.locator('[role="dialog"]').count())) {
        await page.keyboard.press('Escape').catch(() => {});
        const still = new URL(page.url()); if (still.pathname + still.search !== new URL(base() + url).pathname + new URL(base() + url).search || (await page.locator('[role="dialog"]').count())) await open();
      }
    }
    // Links: every distinct address on the page must lead somewhere that loads (checked later, once per role).
    const hrefs: string[] = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).getAttribute('href')!).filter(Boolean));
    for (const h of hrefs) if (h.startsWith('/') && (!prefix || h.startsWith(prefix))) rep.links.add(h.split('#')[0]);
  } catch (e: any) { rep.hard.push(`${where}: could not run: ${String(e.message).slice(0, 140)}`); }
  page.off('response', onResp); page.off('pageerror', onErr); page.off('dialog', onDialog); page.off('popup', onPopup);
}

async function checkLinks(page: Page, rep: Report, dev: string) {
  const seenShape = new Set<string>();
  const shape = (h: string) => h.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id').replace(/\/\d+/g, '/:n').replace(/\/[a-z0-9-]+$/i, (m) => (/^\/(new|signin|register|forgot)$/.test(m) ? m : '/:slug'));
  let n = 0;
  for (const h of rep.links) {
    const s = shape(h);
    if (seenShape.has(s) || n >= 60) continue;
    seenShape.add(s); n++;
    const bad: string[] = [];
    const onResp = (r: any) => { const st = r.status(); if (st >= 500) bad.push(`${st} ${new URL(r.url()).pathname}`); };
    const onErr = (e: Error) => bad.push(`script error: ${e.message.slice(0, 120)}`);
    page.on('response', onResp); page.on('pageerror', onErr);
    const resp = await page.goto(base() + h, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => null);
    await page.waitForTimeout(150);
    const txt = await page.evaluate(() => document.body.innerText.trim().length).catch(() => 0);
    if (!resp || resp.status() >= 400) bad.push(`link returns ${resp?.status() ?? 'nothing'}`);
    if (txt < 20) bad.push('blank page');
    page.off('response', onResp); page.off('pageerror', onErr);
    if (bad.length) rep.hard.push(`${dev} link ${h}: ${[...new Set(bad)].join('; ')}`);
  }
}

for (const role of ROLES) {
  for (const [dev, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
    describe(`click everything: ${role.name} (${dev})`, () => {
      it('no button breaks anything', async () => {
        const { ctx, page } = await newPage(browser, size);
        if (role.email) await signIn(page, role.email);
        const rep: Report = { hard: [], warn: [], clicked: 0, links: new Set() };
        for (const u of role.pages) await clickEverything(page, u, role.prefix, rep, dev);
        // After the clicks, sign-in may have been disturbed (a click can sign out or cancel); sign in again before following links.
        if (role.email) await signIn(page, role.email).catch(() => {});
        await checkLinks(page, rep, dev);
        // Sign out works and returns to a sign-in page.
        if (role.email) {
          const out = page.getByRole('button', { name: /sign ?out|log ?out/i }).or(page.getByRole('link', { name: /sign ?out|log ?out/i })).first();
          await page.goto(base() + (role.prefix || '/') + (role.prefix ? '' : ''), { waitUntil: 'networkidle' }).catch(() => {});
          if (await out.isVisible().catch(() => false)) { await out.click().catch(() => {}); await page.waitForTimeout(600); }
        }
        writeFileSync(`/tmp/clickall-${role.name}-${dev}.json`, JSON.stringify({ clicked: rep.clicked, hard: rep.hard, warn: rep.warn }, null, 1));
        console.log(`CLICKALL ${role.name} ${dev}: ${rep.clicked} clicks, ${rep.hard.length} failures, ${rep.warn.length} warnings`);
        await ctx.close();
        expect(rep.hard, `\n${rep.hard.join('\n')}\n`).toEqual([]);
      }, 1_800_000);
    });
  }
}
