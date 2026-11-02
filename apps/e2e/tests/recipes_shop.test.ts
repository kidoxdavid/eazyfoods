import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const mode of ['a visitor', 'a signed-in customer'] as const) {
  describe(`shoppable recipe: ${mode}`, () => {
    it('ticks the ingredients they need, sees the total and adds them all to the basket in one tap', async () => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
      if (mode !== 'a visitor') await signIn(page, 'customer@example.test');
      await page.goto(`${base()}/recipes`, { waitUntil: 'networkidle' });
      const slug = await page.evaluate(async () => { const l = await (await fetch('/api/recipes')).json(); for (const r of l) { const d = await (await fetch(`/api/recipes/${r.slug}`)).json(); if (d.ingredients.filter((i: any) => i.available_from).length >= 2) return r.slug as string; } return null; });
      expect(slug, 'the seed has a recipe with at least two buyable ingredients').toBeTruthy();
      await page.goto(`${base()}/recipes/${slug}`, { waitUntil: 'networkidle' });
      const boxes = page.locator('.shop-ing input[type=checkbox]');
      const n = await boxes.count(); expect(n).toBeGreaterThanOrEqual(2);
      const button = page.locator('.shop-ings-bar button').first();
      const before = await button.innerText(); expect(before).toMatch(/Add \d+ items? · \$/);
      await boxes.first().uncheck();                                     // untick one: the count and the total follow
      const after = await button.innerText(); expect(after).not.toBe(before);
      await button.click();
      await page.getByText(/^Added: /).waitFor();
      await page.goto(`${base()}/cart`, { waitUntil: 'networkidle' });
      expect(await page.locator('main .line, main .cart2 li, main article').count(), 'items are in the basket').toBeGreaterThan(0);
      expect(await page.locator('body').innerText()).not.toMatch(/Your basket is empty/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
      await ctx.close();
    }, 120_000);
  });
}
