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

for (const [name, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
  describe(`barcode window (${name})`, () => {
    it('makes a barcode, saves it as a photo, replaces it, deletes it and makes another', async () => {
      const product = `Zz Flex Barcode ${name}`;
      const { ctx, page, errors } = await newPage(browser, size);
      page.on('dialog', (d) => d.accept());
      await signIn(page, 'owner1@example.test');
      await page.goto(`${base()}/vendor/products`); await page.waitForLoadState('networkidle');
      await page.evaluate(async (n) => {
        const h = { 'content-type': 'application/json', 'x-area': 'vendor' };
        const stores = await (await fetch('/api/vendor/stores', { headers: h })).json();
        await fetch(`/api/vendor/stores/${stores[0].id}/catalogue`, { method: 'POST', headers: h, body: JSON.stringify({ name: n, price: 4, stock_quantity: 2, status: 'active' }) });
      }, product);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByPlaceholder(/Search products/i).first().fill(product).catch(() => {});
      const row = page.locator('tr, article, li').filter({ hasText: product }).filter({ has: page.getByTitle('Generate Barcode') }).first();
      await row.getByTitle('Generate Barcode').click();
      const win = page.locator('div').filter({ has: page.getByRole('button', { name: 'Save as photo (PNG)' }) }).last();
      const svg = page.getByRole('img', { name: /./ }).or(page.locator('svg')).first();
      await page.getByRole('button', { name: 'Save as photo (PNG)' }).waitFor({ timeout: 10_000 });
      const code1 = (await page.locator('p.font-mono').last().innerText()).trim();
      expect(code1).toMatch(/^\d{13}$/);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as photo (PNG)' }).click()]);
      expect(dl.suggestedFilename()).toBe(`barcode-${product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${code1}.png`);
      const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as SVG' }).click()]);
      expect(dl2.suggestedFilename()).toMatch(/\.svg$/);
      await page.getByRole('button', { name: 'Make a new code' }).click();
      await seeText(page.getByRole('status'), /New barcode made/);
      const code2 = (await page.locator('p.font-mono').last().innerText()).trim();
      expect(code2).toMatch(/^\d{13}$/); expect(code2).not.toBe(code1);
      await page.getByRole('button', { name: 'Delete barcode' }).click();
      await seeText(page.getByRole('status'), /Barcode deleted/);
      await page.getByRole('button', { name: 'Generate Barcode' }).click();
      await seeText(page.getByRole('status'), /Barcode made/);
      const c = await db();
      expect((await c.query(`SELECT barcode FROM products WHERE name = $1`, [product])).rows[0].barcode).toMatch(/^\d{13}$/);
      await c.end();
      expect(errors.filter((e) => !/status of 403/.test(e))).toEqual([]);
      await ctx.close(); void win; void svg;
    });
  });
}

for (const [name, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
  describe(`labels page barcode tools (${name})`, () => {
    it('creates, saves as a photo, replaces and deletes barcodes, and saves a label as a photo', async () => {
      const product = `Zz Label Flex ${name}`;
      const { ctx, page, errors } = await newPage(browser, size);
      page.on('dialog', (d) => d.accept());
      await signIn(page, 'owner1@example.test');
      await page.goto(`${base()}/vendor/labels`); await page.waitForLoadState('networkidle');
      await page.evaluate(async (n) => {
        const h = { 'content-type': 'application/json', 'x-area': 'vendor' };
        const stores = await (await fetch('/api/vendor/stores', { headers: h })).json();
        await fetch(`/api/vendor/stores/${stores[0].id}/catalogue`, { method: 'POST', headers: h, body: JSON.stringify({ name: n, price: 4, stock_quantity: 2, status: 'active' }) });
      }, product);
      await page.reload({ waitUntil: 'networkidle' });
      const row = page.locator('li').filter({ hasText: product });
      await page.getByRole('button', { name: 'Create missing barcodes' }).click();
      await seeText(page.getByRole('status'), /Made \d+ barcode/);
      const code1 = (await row.locator('span.font-mono').innerText()).trim();
      expect(code1).toMatch(/^\d{13}$/);
      const [dl] = await Promise.all([page.waitForEvent('download'), row.getByRole('button', { name: /Save barcode photo/ }).click()]);
      expect(dl.suggestedFilename()).toMatch(/\.png$/);
      await row.getByRole('checkbox').check();
      const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save labels as photos' }).click()]);
      expect(dl2.suggestedFilename()).toMatch(/^label-.*\.png$/);
      await row.getByRole('button', { name: /Make a new barcode/ }).click();
      await seeText(page.getByRole('status'), /New barcode made/);
      const code2 = (await row.locator('span.font-mono').innerText()).trim();
      expect(code2).toMatch(/^\d{13}$/); expect(code2).not.toBe(code1);
      await row.getByRole('button', { name: /Delete barcode/ }).click();
      await seeText(page.getByRole('status'), /Barcode deleted/);
      await seeText(row, /No barcode/);
      await row.getByRole('button', { name: 'Create barcode' }).click();
      await row.locator('span.font-mono').filter({ hasText: /^\d{13}$/ }).waitFor({ timeout: 10_000 });
      expect(errors.filter((e) => !/status of 403/.test(e))).toEqual([]);
      await ctx.close();
    });
  });
}
