import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn, signInStaff } from './helpers.js';

/** Small things that were reported broken on a real phone: toggle switches, stacked date fields, and the gap under a row of filters. */
let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const w of [320, 360, 390, 430, 768]) {
  describe(`widgets at ${w}px`, () => {
    it('toggle switches keep their shape; dates stack with room below the filters', async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, 'owner1@example.test');
      await page.addInitScript(() => { /* nothing: the real page, no tricks */ });

      // The store-status switch on the vendor dashboard
      await page.goto(`${base()}/vendor`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
      const sw = page.getByRole('switch', { name: /Store open for orders/ });
      const b = (await sw.boundingBox())!, knob = (await sw.locator('span').first().boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(18); expect(b.height).toBeLessThanOrEqual(26);                 // a slim pill, not a fat one
      expect(b.width).toBeGreaterThanOrEqual(32); expect(b.width).toBeLessThanOrEqual(48);
      expect(knob.height).toBeLessThan(b.height); expect(knob.y).toBeGreaterThanOrEqual(b.y - 1); expect(knob.y + knob.height).toBeLessThanOrEqual(b.y + b.height + 1);   // the knob sits inside
      expect(knob.x).toBeGreaterThanOrEqual(b.x - 1); expect(knob.x + knob.width).toBeLessThanOrEqual(b.x + b.width + 1);

      // The statement page: From and To, then the number cards (the page in the report)
      await page.goto(`${base()}/vendor/statement`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      await page.addStyleTag({ content: 'input[type="date"]{min-width:150px!important}' });                // as Safari on iPhone sizes it
      const from = (await page.locator('#stf').boundingBox())!, to = (await page.locator('#stt').boundingBox())!;
      if (w <= 640) { expect(to.y).toBeGreaterThanOrEqual(from.y + from.height - 1); }                       // stacked: To is below From
      else expect(to.x).toBeGreaterThanOrEqual(from.x + from.width - 2);                                     // side by side without touching
      expect(from.x + from.width).toBeLessThanOrEqual(w + 1); expect(to.x + to.width).toBeLessThanOrEqual(w + 1);
      const card = page.locator('main .grid').first();
      if (await card.count()) { const c = (await card.boundingBox())!; expect(c.y - (to.y + to.height)).toBeGreaterThanOrEqual(8); }   // room between the filters and the cards
      await ctx.close();
    }, 60_000);
  });
}

for (const w of [320, 390, 430]) {
  describe(`hours, dates and people at ${w}px`, () => {
    it('opening hours stay side by side; date fields stay on the screen; staff list is tidy cards', async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, 'owner1@example.test');
      // Opening hours: start and end time share a row with the word "to"
      await page.goto(`${base()}/vendor/profile`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      const t = page.locator('input[type="time"]');
      const a = (await t.nth(0).boundingBox())!, b = (await t.nth(1).boundingBox())!;
      expect(Math.abs(a.y - b.y)).toBeLessThan(4); expect(b.x).toBeGreaterThan(a.x + a.width - 1); expect(b.x + b.width).toBeLessThanOrEqual(w + 1);
      expect(await page.getByText('to', { exact: true }).first().isVisible()).toBe(true);
      // Dates (orders: "From: [date]  To: [date]") never leave the screen, even at Safari's minimum width
      await page.goto(`${base()}/vendor/orders`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      await page.addStyleTag({ content: 'input[type="date"]{min-width:150px!important}' });
      for (const el of await page.locator('input[type="date"]').all()) { const r = (await el.boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(-1); expect(r.x + r.width).toBeLessThanOrEqual(w + 1); }
      const sw = await page.evaluate(() => document.documentElement.scrollWidth); expect(sw).toBeLessThanOrEqual(w + 1);
      await ctx.close();
    }, 60_000);
  });
}

describe('admin users and roles', () => {
  it('is a grid of person cards that fit the screen at every width', async () => {
    for (const w of [320, 390, 768, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
      await page.goto(`${base()}/admin/settings`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.getByRole('tab', { name: /Users & roles/ }).click().catch(() => {});
      await page.waitForTimeout(800);
      const cards = page.locator('main ul > li').filter({ hasText: '@' });
      expect(await cards.count()).toBeGreaterThan(2);
      for (const el of (await cards.all()).slice(0, 8)) { const r = (await el.boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(-1); expect(r.x + r.width).toBeLessThanOrEqual(w + 1); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
      if (w === 390) await page.screenshot({ path: '/tmp/users390.png' });
      await ctx.close();
    }
  }, 120_000);
});
