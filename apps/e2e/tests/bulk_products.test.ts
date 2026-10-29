import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, DESKTOP, MOBILE, launch, newPage, seeText, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const [name, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
  describe(`bulk products (${name})`, () => {
    it('imports new products from a spreadsheet: check first, then create', async () => {
      const code = name === 'phone' ? '7780002220002' : '7780002220001';
      const c = await db(); await c.query(`DELETE FROM store_offers WHERE product_id IN (SELECT id FROM products WHERE barcode = $1)`, [code]); await c.query(`DELETE FROM products WHERE barcode = $1`, [code]);
      const { ctx, page, errors } = await newPage(browser, size);
      await signIn(page, 'owner1@example.test');
      await page.goto(`${base()}/vendor/import`); await page.waitForLoadState('networkidle');
      await page.getByLabel('CSV contents').fill(`barcode,sku,slug,name,unit,price,stock,active\n${code},,,E2E Bulk Item 250g,250 g,4.50,9,yes\n,,,No Code Item,,3,1,yes`);
      await page.getByRole('button', { name: /Check \(dry run\)/ }).click();
      await seeText(page.locator('body'), /1 of 2 rows OK, 1 need fixing/);
      await seeText(page.locator('body'), /1 new product will be created/);
      await page.getByRole('button', { name: /^Import 1 valid row/ }).click();
      await seeText(page.locator('body'), /Imported: 1 of 2 rows OK/);
      const r = await c.query(`SELECT o.price_cents, o.stock_on_hand FROM products p JOIN store_offers o ON o.product_id = p.id WHERE p.barcode = $1`, [code]);
      expect(r.rows).toEqual([{ price_cents: 450, stock_on_hand: 9 }]);
      expect(errors.filter((e) => !/status of 403/.test(e))).toEqual([]);   // sign-in tries every staff window; refusals there are expected
      await c.end(); await ctx.close();
    });

    it('a scanned unknown barcode opens the new-product form with a lookup message and a Look up button', async () => {
      const { ctx, page, errors } = await newPage(browser, size);
      await signIn(page, 'owner1@example.test');
      await page.goto(`${base()}/vendor/products`); await page.waitForLoadState('networkidle');
      await page.evaluate(() => history.pushState({ usr: { barcode: '7790003330001' }, key: 'k', idx: 1 }, '', '/vendor/products/new'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByLabel('Barcode').fill('7790003330001');
      await page.getByRole('button', { name: 'Look up details' }).click();
      await seeText(page.getByRole('status'), /Nothing found|Could not look it up|Filled in/, 15_000);
      expect(errors.filter((e) => !/status of 403/.test(e))).toEqual([]);   // sign-in tries every staff window; refusals there are expected
      await ctx.close();
    });
  });
}
