import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, MOBILE, DESKTOP, newPage, seeText } from './helpers.js';

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
