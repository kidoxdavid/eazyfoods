import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { base, db, DESKTOP, MOBILE, seeText, signIn } from './helpers.js';

const CODE = '6112699910004';
let browser: Browser; let ready = false;
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ez-cam-'));
  const y4m = join(dir, 'ean13.y4m');
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', resolve(import.meta.dirname, '../fixtures/ean13.png'), '-t', '4', '-r', '15', '-pix_fmt', 'yuv420p', y4m]); ready = true; } catch { ready = false; }
  const local = '/opt/pw-browsers/chromium';
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (existsSync(local) ? local : undefined), args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`] });
});
afterAll(async () => { await browser?.close(); });

const stockOf = async () => Number((await (await db()).query(`SELECT o.stock_on_hand FROM store_offers o JOIN products p ON p.id=o.product_id JOIN stores s ON s.id=o.store_id WHERE p.barcode=$1 AND s.slug='demo-calgary-west-african-market'`, [CODE])).rows[0].stock_on_hand);

for (const [name, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
  describe(`scan stock and labels (${name})`, () => {
    it('receives a delivery and counts the shelf by scanning, and prints labels', async () => {
      if (!ready) return;
      const c = await db();
      await c.query(`UPDATE products SET barcode = NULL WHERE barcode = $1`, [CODE]);
      await c.query(`UPDATE products SET barcode = $1 WHERE slug = 'garri-white'`, [CODE]);
      await c.query(`UPDATE store_offers o SET stock_on_hand = 20, stock_reserved = 0 FROM products p, stores s WHERE p.id=o.product_id AND s.id=o.store_id AND p.slug='garri-white' AND s.slug='demo-calgary-west-african-market'`);
      const ctx = await browser.newContext({ viewport: size, permissions: ['camera'] });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await signIn(page, 'owner1@example.test');
      await page.goto(`${base()}/vendor/inventory/scan`); await page.waitForLoadState('networkidle');

      // Receive: scan, enter 5, stock goes 20 -> 25.
      await page.getByRole('button', { name: /Scan an item/ }).click();
      await page.getByRole('button', { name: /Start Camera Scan/ }).click();
      await seeText(page.locator('body'), /In stock now/, 25_000);
      await seeText(page.locator('body'), 'Garri');
      await page.getByLabel('How many arrived?').fill('5');
      await page.getByRole('button', { name: 'Add to stock' }).click();
      await seeText(page.locator('body'), /Received \+5 · now 25/);
      expect(await stockOf()).toBe(25);

      // Count: the shelf has 22, so stock is set to 22 (a change of -3).
      await page.getByRole('button', { name: /Count shelf/ }).click();
      await page.getByRole('button', { name: /Scan (an|next) item/ }).click();
      await page.getByRole('button', { name: /Start Camera Scan/ }).click();
      await seeText(page.locator('body'), /In stock now/, 25_000);
      await page.getByLabel('How many are on the shelf?').fill('22');
      await page.getByRole('button', { name: 'Save count' }).click();
      await seeText(page.locator('body'), /Counted 22 \(-3\) · now 22/);
      expect(await stockOf()).toBe(22);
      const hist = await c.query(`SELECT a.delta, a.note FROM inventory_adjustments a JOIN store_offers o ON o.id=a.offer_id JOIN products p ON p.id=o.product_id WHERE p.barcode=$1 ORDER BY a.id DESC LIMIT 2`, [CODE]);
      expect(hist.rows.map((r) => r.delta)).toEqual([-3, 5]);

      // Labels: pick the product, see a barcode drawn in the preview.
      await page.goto(`${base()}/vendor/labels`); await page.waitForLoadState('networkidle');
      await page.getByRole('checkbox', { name: /Print labels for Garri/ }).first().check();
      await page.getByRole('img', { name: `Barcode ${CODE}` }).first().waitFor({ timeout: 10_000 });
      await seeText(page.getByRole('button', { name: /^Print 1 label/ }), /Print 1 label/);

      // The low-stock email switch is on the Inventory page.
      await page.goto(`${base()}/vendor/inventory`); await page.waitForLoadState('networkidle');
      await page.getByLabel(/Email my team when items run low/).waitFor({ timeout: 10_000 });
      expect(errors).toEqual([]);
      await c.end(); await ctx.close();
    });
  });
}
