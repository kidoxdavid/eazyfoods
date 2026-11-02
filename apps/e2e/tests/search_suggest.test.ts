import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const [name, w, h] of [['phone', 390, 844], ['laptop', 1280, 800]] as const) {
  describe(`search as you type: ${name}`, () => {
    it('brings up items while typing; arrow keys and Enter open one; Escape closes; "see all" opens the results', async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await page.goto(`${base()}/`, { waitUntil: 'networkidle' });
      const box = page.locator('#q'); await box.click();
      await box.pressSequentially('gar', { delay: 60 });                       // typed, not pasted: suggestions arrive as it goes
      const list = page.getByRole('listbox'); await list.waitFor();
      const opts = list.getByRole('option'); expect(await opts.count()).toBeGreaterThan(1);
      expect(await list.innerText()).toMatch(/Garri/i); expect(await list.innerText()).toMatch(/See all results for/);
      expect(await list.locator('img, svg').count(), 'products show a picture').toBeGreaterThan(0);
      const r = (await list.boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(w + 1); expect(r.y + Math.min(r.height, 100)).toBeLessThanOrEqual(h);
      await page.screenshot({ path: `/tmp/suggest-${name}.png` });
      // keeps up with typing: more letters narrow the list
      await box.pressSequentially('ri (y', { delay: 40 });
      await page.waitForFunction(() => /Yellow/i.test(document.querySelector('[role=listbox]')?.textContent ?? ''), null, { timeout: 8000 });
      // keyboard: Down, Enter opens that product
      await box.press('ArrowDown'); expect(await list.locator('[aria-selected=true]').count()).toBe(1);
      await box.press('Enter'); await page.waitForURL(/\/p\/garri/);
      expect(await page.locator('[role=listbox]').count(), 'the list closes after choosing').toBe(0);
      // Escape closes; "See all results" goes to the results page
      await page.goto(`${base()}/`, { waitUntil: 'networkidle' });
      await page.locator('#q').click(); await page.locator('#q').pressSequentially('rice', { delay: 40 }); await page.getByRole('listbox').waitFor();
      await page.keyboard.press('Escape'); expect(await page.locator('[role=listbox]').count()).toBe(0);
      await page.locator('#q').pressSequentially('x'); await page.getByRole('listbox').waitFor().catch(() => {});
      await page.locator('#q').fill('rice'); await page.getByRole('listbox').waitFor();
      await page.getByRole('option', { name: /See all results for/ }).click(); await page.waitForURL(/\/search\?q=rice/);
      // one letter does nothing; nothing found shows no empty box
      await page.locator('#q').fill('r'); await page.waitForTimeout(500); expect(await page.locator('[role=listbox]').count()).toBe(0);
      await page.locator('#q').fill('zzzzqq'); await page.waitForTimeout(700); expect(await page.locator('[role=listbox]').count()).toBe(0);
      await ctx.close();
    }, 120_000);
  });
}
