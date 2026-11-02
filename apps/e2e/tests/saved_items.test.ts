import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const [name, w, h] of [['phone', 390, 844], ['laptop', 1280, 800]] as const) {
  describe(`saved items: ${name}`, () => {
    it('the heart saves an item and the Saved page lists it, reachable from the menu or header', async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await signIn(page, 'customer@example.test');
      await page.goto(`${base()}/search?q=garri`, { waitUntil: 'networkidle' });
      const card = page.locator('.pcard').first(); const label = (await card.locator('.pname').innerText()).trim();
      if ((await card.locator('.heart').getAttribute('aria-pressed')) !== 'true') { await card.locator('.heart').click(); await page.waitForTimeout(500); }
      // reach the page the way a person would
      if (w < 900) { await page.locator('button.menu-btn').click(); await page.getByRole('link', { name: 'Saved items' }).first().click(); }
      else await page.locator('.hacct').getByRole('link', { name: /Saved/ }).click();
      await page.waitForURL(/\/saved/); await page.getByRole('heading', { name: 'Saved items' }).waitFor();
      await page.locator('.pcard', { hasText: label }).first().waitFor();
      // and it can be removed from there
      await page.locator('.pcard', { hasText: label }).first().locator('.heart').click(); await page.waitForTimeout(600);
      await page.reload({ waitUntil: 'networkidle' });
      expect(await page.locator('.pcard', { hasText: label }).count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
      await ctx.close();
    }, 90_000);
  });
}
