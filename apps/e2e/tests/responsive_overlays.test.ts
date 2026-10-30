import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn } from './helpers.js';
import { measure } from './support/responsive.js';

/**
 * Windows, menus and drawers must stay on the screen at every phone size, portrait and landscape:
 * inside the screen on all four sides, scrolling inside themselves when tall, and with no control overlapping another or input under 16px.
 */
const SIZES = [{ w: 320, h: 640 }, { w: 360, h: 740 }, { w: 390, h: 844 }, { w: 667, h: 375 }, { w: 844, h: 390 }];
let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

type Case = { inline?: boolean; name: string; email: string | null; url: string; open: (p: import('playwright-core').Page) => Promise<void>; box: string };
const dialog = '[role="dialog"]:visible';
const click = (name: RegExp | string, exact = false) => async (p: import('playwright-core').Page) => { await p.getByRole('button', { name, exact }).or(exact ? p.locator('x-none') : p.getByRole('link', { name })).and(p.locator(':visible')).first().click(); };
const CASES: Case[] = [
  { name: 'shop: quick view', email: null, url: '/search?q=rice', open: async (p) => { const card = p.locator('article.pcard').first(); await card.hover(); await card.getByRole('button', { name: /Quick view/ }).click(); }, box: dialog },
  { name: 'shop: phone menu', email: null, url: '/', open: click('Open all departments', true), box: dialog },
  { name: 'shop: filters panel', email: null, url: '/search?q=rice', open: async (p) => { await p.locator('details.facets > summary').click(); }, box: 'details.facets', inline: true },
  { name: 'vendor: stock adjustment', email: 'owner1@example.test', url: '/vendor/inventory', open: click(/Add Adjustment/), box: dialog },
  { name: 'vendor: barcode scanner', email: 'owner1@example.test', url: '/vendor/products', open: click(/^Scan( Barcode)?$/), box: dialog },
  { name: 'vendor: store form', email: 'owner1@example.test', url: '/vendor/stores', open: click(/Add Store/), box: dialog },
  { name: 'vendor: new promotion form', email: 'owner1@example.test', url: '/vendor/promotions', open: click(/New Promotion/), box: 'main form', inline: true },
  { name: 'vendor: menu drawer', email: 'owner1@example.test', url: '/vendor', open: click('Open menu', true), box: 'aside[aria-label="Menu"], aside' },
  { name: 'admin: menu drawer', email: 'admin@example.test', url: '/admin', open: click('Open menu', true), box: 'aside[aria-label="Menu"]' },
  { name: 'admin: new catalogue product', email: 'admin@example.test', url: '/admin/catalogue', open: click(/New product/), box: dialog },
  { name: 'marketing: create coupon', email: 'marketing@example.test', url: '/marketing/coupons', open: click(/Create Coupon/), box: dialog },
  { name: 'driver: menu drawer', email: 'driver@example.test', url: '/driver', open: click('Open menu', true), box: 'aside' },
];

for (const c of CASES) {
  describe(`overlay: ${c.name}`, () => {
    it('stays inside the screen and fits at every phone size', async () => {
      const problems: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
      const page = await ctx.newPage();
      if (c.email) await signIn(page, c.email);
      for (const s of SIZES) {
        await page.setViewportSize({ width: s.w, height: s.h });
        await page.goto(base() + c.url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
        await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} input[type="date"]::-webkit-datetime-edit,input[type="datetime-local"]::-webkit-datetime-edit,input[type="month"]::-webkit-datetime-edit{min-width:170px!important;display:inline-block}' }).catch(() => {});   // imitate the minimum width Safari on iPhone gives date fields
        await page.waitForTimeout(250);
        try { await c.open(page); } catch (e: any) { problems.push(`@${s.w}x${s.h}: could not open (${String(e.message).replace(/\s+/g, ' ').slice(0, 400)})`); continue; }
        await page.waitForTimeout(350);
        const box = page.locator(c.box).and(page.locator(':visible')).first();
        const r = await box.boundingBox();
        if (!r) { problems.push(`@${s.w}x${s.h}: nothing opened`); continue; }
        if (r.x < -1 || r.x + r.width > s.w + 1 || (!c.inline && (r.y < -1 || r.y + r.height > s.h + 1))) problems.push(`@${s.w}x${s.h}: window is outside the screen (${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)})`);
        for (const i of await measure(page, s.w, s.h)) if (i.severity !== 'info') problems.push(`@${s.w}x${s.h}: ${i.kind} - ${i.detail.slice(0, 140)}`);
        await page.keyboard.press('Escape').catch(() => {});
      }
      await ctx.close();
      expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
    }, 240_000);
  });
}
