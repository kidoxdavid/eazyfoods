import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('product page: buy bar that follows you', () => {
  it('appears on a phone once the main Add button scrolls away, adds to the basket, and is not shown on a laptop', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    await page.goto(`${base()}/p/garri-white`, { waitUntil: 'networkidle' });
    expect(await page.locator('.sticky-buy').count(), 'not shown while the real Add button is on screen').toBe(0);
    await page.evaluate(() => window.scrollTo(0, 900)); await page.locator('.sticky-buy').waitFor();
    const r = (await page.locator('.sticky-buy').boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(391);
    await page.screenshot({ path: '/tmp/stickybuy390.png' });
    await page.locator('.sticky-buy').getByRole('button', { name: /Add/ }).first().click();
    await page.locator('.sticky-buy .addstep, .sticky-buy [aria-label*="quantity" i], .sticky-buy [aria-label*="Increase" i]').first().waitFor({ timeout: 10_000 });   // turns into the − / + stepper
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
    expect(await page.locator('.sticky-buy').count(), 'goes away when you scroll back up').toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await ctx.close();
    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const dp = await desk.newPage();
    await dp.goto(`${base()}/p/garri-white`, { waitUntil: 'networkidle' }); await dp.evaluate(() => window.scrollTo(0, 1200)); await dp.waitForTimeout(500);
    expect(await dp.locator('.sticky-buy').isVisible().catch(() => false)).toBe(false);
    await desk.close();
  }, 90_000);
});
