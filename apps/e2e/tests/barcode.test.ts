import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { base, db, DESKTOP, MOBILE, seeText, signIn } from './helpers.js';
import { existsSync } from 'node:fs';

/**
 * The barcode scanner with a fake camera. Chromium plays a video of a real EAN-13 barcode as the camera feed, so this exercises the real path:
 * camera permission, the scanner library, decoding, and what the page does with the result. (A real phone camera is the final check.)
 */
let browser: Browser; let ready = false;
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ez-cam-'));
  const y4m = join(dir, 'ean13.y4m');
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', resolve(import.meta.dirname, '../fixtures/ean13.png'), '-t', '4', '-r', '15', '-pix_fmt', 'yuv420p', y4m]); ready = true; } catch { ready = false; }
  const local = '/opt/pw-browsers/chromium';
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? (existsSync(local) ? local : undefined),
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`],
  });
});
afterAll(async () => { await browser?.close(); });

for (const [name, size] of [['desktop', DESKTOP], ['small phone', { width: 360, height: 740 }], ['phone', MOBILE]] as const) {
  describe(`barcode scanner (${name})`, () => {
    it('reads a barcode from the camera and shows what it found; typing a code works too', async () => {
      if (!ready) return;   // no ffmpeg here: cannot build the fake camera video
      const c = await db(); await c.query(`UPDATE products SET barcode = NULL WHERE barcode = '6112699910004'`);
      // First the code is not in the catalogue; later it is, so both outcomes are seen.
      const ctx = await browser.newContext({ viewport: size, permissions: ['camera'] });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await signIn(page, 'owner1@example.test');
      await page.goto(`${base()}/vendor/products`); await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /^Scan( Barcode)?$/ }).first().click();
      await page.getByRole('button', { name: /Start Camera Scan/ }).click();
      const result = page.getByRole('heading', { name: 'Barcode Scan Result' });
      await result.waitFor({ timeout: 20_000 });
      await seeText(page.locator('body'), '6112699910004');                           // the exact digits on the barcode
      await seeText(page.locator('body'), 'No product found with this barcode');
      expect(errors).toEqual([]);
      await page.getByRole('button', { name: 'Close', exact: true }).last().click();
      await c.query(`UPDATE products SET barcode = '6112699910004' WHERE slug = 'garri-white'`);     // now the shop sells it: scanning finds the product
      await page.getByRole('button', { name: /^Scan( Barcode)?$/ }).first().click();
      await page.getByRole('button', { name: /Start Camera Scan/ }).click();
      await page.getByRole('heading', { name: 'Barcode Scan Result' }).waitFor({ timeout: 20_000 });
      await seeText(page.locator('body'), 'Garri');
      await c.query(`UPDATE products SET barcode = NULL WHERE slug = 'garri-white'`); await c.end();

      // typing a code works without a camera
      await page.getByRole('button', { name: 'Close', exact: true }).first().click();
      await page.getByRole('button', { name: /^Scan( Barcode)?$/ }).first().click();
      await page.getByRole('button', { name: /Enter barcode manually/ }).click();
      await page.getByPlaceholder(/Type or paste barcode/).fill('0000000000017');
      await page.getByRole('button', { name: 'Submit' }).click();
      await seeText(page.locator('body'), 'No product found with this barcode');       // a code that is not in the catalogue is offered as a new product
      await ctx.close();
    });
  });
}
