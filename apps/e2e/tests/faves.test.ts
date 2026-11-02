import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('home: your EAZY faves', () => {
  it('six small tiles that go where they say, and stay small', async () => {
    for (const [w, h] of [[320, 700], [390, 844], [1280, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await signIn(page, 'customer@example.test');
      await page.goto(`${base()}/`, { waitUntil: 'networkidle' });
      const tiles = page.locator('.faves .fave'); expect(await tiles.count()).toBeGreaterThanOrEqual(5);
      const boxes = await page.evaluate(() => [...document.querySelectorAll('.faves .fave span')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      for (const [bw, bh] of boxes) { expect(bh, `tile height at ${w}px`).toBeLessThanOrEqual(54); expect(bw).toBeGreaterThan(40); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
      if (w === 390) { await page.screenshot({ path: '/tmp/faves390.png' }); await tiles.filter({ hasText: 'Weekly deals' }).click(); await page.waitForURL(/\/deals/); await page.goBack(); await tiles.filter({ hasText: 'Buy again' }).click(); await page.waitForURL(/\/buy-again/); await page.getByRole('heading', { name: 'Buy again' }).waitFor(); }
      await ctx.close();
    }
  }, 120_000);
});
