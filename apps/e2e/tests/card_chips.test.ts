import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('product cards: savings tag and chips', () => {
  it('show a dollar saving on the picture and small facts in the old store line, and the card stays the same size', async () => {
    for (const [w, h] of [[320, 700], [390, 844], [768, 900], [1024, 800], [1280, 800], [1440, 900]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await page.goto(`${base()}/search?q=a`, { waitUntil: 'networkidle' });
      const text = await page.locator('.pcard').first().waitFor().then(() => page.locator('body').innerText());
      expect(text).toMatch(/Save \$\d/);                                                   // the saving in dollars, not a percentage
      const chips = await page.locator('.pcard .pchip').allInnerTexts(); expect(chips.length).toBeGreaterThan(3);
      expect(chips.some((c) => /Today|Pickup today|Opens later/.test(c))).toBe(true);
      const read = () => page.evaluate(() => [...document.querySelectorAll('.pgrid .pcard')].map((c) => `${Math.round(c.getBoundingClientRect().height)}/${Math.round(c.querySelector('.pimg')!.getBoundingClientRect().height)}`));
      const withChips = await read();
      await page.evaluate(() => document.querySelectorAll('.pcard .psold').forEach((e) => { { const el = e as HTMLElement; el.innerHTML = 'lowest of 2 · at Demo Southern Pantry'; el.style.display = 'block'; el.style.whiteSpace = 'nowrap'; el.style.textOverflow = 'ellipsis'; } }));   // how the line read before
      await page.waitForTimeout(100);
      expect(withChips, `the chips change no card or picture size at ${w}px`).toEqual(await read());
      if (w === 390) { await page.evaluate(() => window.scrollTo(0, 0)); }
      await ctx.close();
    }
  }, 120_000);
});
