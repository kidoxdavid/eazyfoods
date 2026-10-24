import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, MOBILE, DESKTOP, newPage, seeText, setOffer } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('phone menu', () => {
  it('takes three quarters of the screen, with regions that open to their countries', async () => {
    const { page, errors } = await newPage(browser, MOBILE);
    await page.goto(base()); await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Open all departments' }).click();
    const menu = page.getByRole('dialog', { name: 'All departments' });
    await menu.waitFor({ state: 'visible' });
    const w = (await menu.boundingBox())!.width;
    expect(w).toBeLessThanOrEqual(MOBILE.width * 0.76);
    expect(w).toBeGreaterThanOrEqual(MOBILE.width * 0.7);
    // countries are tucked away until the region is opened
    const first = menu.locator('.mega-row').first();
    const subs = menu.locator('.mega-sub').first();
    expect(await subs.isVisible()).toBe(false);
    await first.getByRole('button').click();
    expect(await subs.isVisible()).toBe(true);
    await first.getByRole('button').click();
    expect(await subs.isVisible()).toBe(false);
    // other sections are collapsed until chosen
    expect(await menu.getByRole('link', { name: 'Sell on EAZyfoods' }).isVisible()).toBe(false);
    await menu.getByRole('button', { name: /Partner with us/i }).click();
    expect(await menu.getByRole('link', { name: 'Sell on EAZyfoods' }).isVisible()).toBe(true);
    // tapping a country goes there and closes the menu (opening one section folds the others)
    await menu.getByRole('button', { name: /By region/i }).click();
    await first.getByRole('button').click();
    await subs.getByRole('link').first().click();
    await page.waitForURL(/country=/);
    await menu.waitFor({ state: 'hidden', timeout: 5000 });
    expect(errors).toEqual([]);
  });
});

describe('French', () => {
  it('switches the main shopping screens to French and remembers the choice', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await page.goto(base()); await page.waitForLoadState('networkidle');
    await seeText(page.locator('header'), 'All departments');
    await page.getByRole('button', { name: 'FR', exact: true }).click();
    await seeText(page.locator('header'), 'Tous les rayons');
    await seeText(page.locator('header'), 'Rabais');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('fr');
    await page.goto(`${base()}/cart`);
    await seeText(page.locator('main'), 'Votre panier est vide');
    await page.reload(); await page.waitForLoadState('networkidle');
    await seeText(page.locator('header'), 'Tous les rayons');             // remembered
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await seeText(page.locator('header'), 'All departments');
  });
  it('shows French by default for a browser set to French', async () => {
    const ctx = await browser.newContext({ viewport: DESKTOP, locale: 'fr-CA' });
    const page = await ctx.newPage();
    await page.goto(base()); await page.waitForLoadState('networkidle');
    await seeText(page.locator('header'), 'Tous les rayons');
    await ctx.close();
  });
});

describe('trust and help pages', () => {
  it('the shopping promises and help centre are reachable from the footer', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(base()); await page.waitForLoadState('networkidle');
    await page.locator('footer').getByRole('link', { name: 'Our shopping promises' }).click();
    await seeText(page.locator('main'), 'Never charged for a swap');
  });
});

describe('phone fit', () => {
  it('no page is wider than the screen, the basket included, and the header steps aside while scrolling down', async () => {
    await setOffer('demo-calgary-west-african-market', 'garri-white', 2000, 30);
    const { page } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/register`);
    await page.fill('input[name=full_name]', 'Fit Buyer'); await page.fill('input[name=email]', `fit+${Date.now()}@example.test`); await page.fill('input[name=password]', 'a-long-password');
    await page.click('.auth button[type=submit]');
    await page.waitForURL(base() + '/');
    await page.goto(`${base()}/s/demo-calgary-west-african-market`);
    const card = page.locator('.pgrid .pcard', { hasText: 'Garri (White)' });
    await card.getByRole('button', { name: /^Add /, exact: false }).first().click();
    const wide = async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (const path of ['/', '/search', '/p/garri-white', '/cart', '/checkout', '/orders', '/account', '/stores', '/flyer', '/help', '/credit', '/lists']) {
      await page.goto(base() + path); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300);
      expect(await wide(), `${path} is wider than the screen`).toBeLessThanOrEqual(1);
    }
    await page.goto(`${base()}/search`); await page.waitForLoadState('networkidle');
    const hdr = page.locator('header.hdr');
    await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(100); await page.evaluate(() => window.scrollTo(0, 1000)); await page.waitForTimeout(500);
    expect(await hdr.evaluate((e) => e.classList.contains('away'))).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 700)); await page.waitForTimeout(500);
    expect(await hdr.evaluate((e) => e.classList.contains('away'))).toBe(false);   // comes back on scrolling up
  });
});
