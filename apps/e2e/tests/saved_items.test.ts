import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const [name, w, h] of [['phone', 390, 844], ['laptop', 1280, 800]] as const) {
  describe(`saved items: ${name}`, () => {
    it('the heart saves an item and the Saved page lists it, reachable from the menu or header', async () => {
      // give the product a real picture, as a store's own photo would be
      const c = await db(); const pid = (await c.query(`SELECT id FROM products WHERE slug = 'garri-white'`)).rows[0].id;
      await c.query(`DELETE FROM product_images WHERE product_id = $1`, [pid]); await c.query(`INSERT INTO product_images(product_id, url, alt, sort_order) VALUES ($1, '/logo-192.png', 'Garri', 0)`, [pid]); await c.end();
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await signIn(page, 'customer@example.test');
      await page.goto(`${base()}/search?q=garri`, { waitUntil: 'networkidle' });
      const card = page.locator('.pcard').first(); const label = (await card.locator('.pname').innerText()).trim();
      if ((await card.locator('.heart').getAttribute('aria-pressed')) !== 'true') { await card.locator('.heart').click(); await page.waitForTimeout(500); }
      // reach the page the way a person would
      if (w < 900) { await page.locator('button.menu-btn').click(); await page.getByRole('link', { name: 'Saved items' }).first().click(); }
      else await page.locator('.hacct').getByRole('link', { name: /Saved/ }).click();
      await page.waitForURL(/\/saved/); await page.getByRole('heading', { name: 'Saved items' }).waitFor();
      const saved = page.locator('.pcard', { hasText: label }).first(); await saved.waitFor();
      if (label.includes('Garri (White)')) { const img = saved.locator('.pimg img'); await img.waitFor(); expect(await img.getAttribute('src'), 'the real picture, not the placeholder art').toContain('logo-192'); }
      // and it can be removed from there
      await page.locator('.pcard', { hasText: label }).first().locator('.heart').click(); await page.waitForTimeout(600);
      await page.reload({ waitUntil: 'networkidle' });
      expect(await page.locator('.pcard', { hasText: label }).count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
      await ctx.close();
      const c2 = await db(); await c2.query(`DELETE FROM product_images WHERE product_id = (SELECT id FROM products WHERE slug = 'garri-white')`); await c2.end();
    }, 90_000);
  });
}
