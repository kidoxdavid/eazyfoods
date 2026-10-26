import AxeBuilder from '@axe-core/playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, MOBILE, DESKTOP, newPage, seeText } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('portals hub (browser)', () => {
  it('lists every portal, each card goes to that portal’s own sign-in, it fits a phone and passes the accessibility scan', async () => {
    for (const size of [MOBILE, DESKTOP]) {
      const { page, errors } = await newPage(browser, size);
      await page.goto(`${base()}/portals`); await page.waitForLoadState('networkidle');
      await page.getByRole('heading', { name: 'Sign in to your portal' }).waitFor();
      const hrefs = async (name: string) => page.getByRole('link', { name: new RegExp(`^${name}`) }).first().getAttribute('href');
      expect(await hrefs('Customer')).toBe('/'); expect(await hrefs('Vendor')).toBe('/vendor/signin'); expect(await hrefs('Chef')).toBe('/vendor/signin');
      expect(await hrefs('Delivery')).toBe('/driver/signin'); expect(await hrefs('Marketing')).toBe('/marketing/signin'); expect(await hrefs('Admin')).toBe('/admin/signin');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
      expect(errors).toEqual([]);
      await page.close();
    }
    const { page } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/portals`);
    await page.getByRole('link', { name: /^Delivery/ }).click();
    await page.waitForURL(/\/driver\/signin/);
    await seeText(page.locator('body'), 'Driver Portal');
    await page.goto(`${base()}/`); await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'All portals' }).first().click().catch(() => {});   // footer link: full page load into the hub
  });
});
