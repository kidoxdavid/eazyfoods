import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, DESKTOP, MOBILE, newPage, noText, seeText, setOffer, signIn } from './helpers.js';

const S1 = 'demo-calgary-west-african-market';
let browser: Browser;
beforeAll(async () => { browser = await launch(); await setOffer(S1, 'garri-white', 2000, 30); });
afterAll(async () => {
  const c = await db(); await c.query('UPDATE feature_flags SET enabled = true'); await c.query(`UPDATE portal_config SET hidden_nav = '{}', notice = NULL`); await c.end();
  await browser?.close();
});

describe('control centre (browser)', () => {
  it('an admin switches driver tips off and the checkout stops offering them; switching back restores them', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await signIn(page, 'admin@example.test');
    await page.goto(`${base()}/admin/control`);
    const tips = page.getByRole('switch', { name: 'Driver tips' });
    await tips.waitFor();
    expect(await tips.isChecked()).toBe(true);
    await tips.click({ force: true });
    await page.waitForFunction(() => (document.querySelector('input[aria-label="Driver tips"]') as HTMLInputElement | null)?.checked === false);

    const cust = await newPage(browser, MOBILE);
    await cust.page.goto(`${base()}/register`);
    await cust.page.fill('input[name=full_name]', 'Switch Buyer'); await cust.page.fill('input[name=email]', `sw+${Date.now()}@example.test`); await cust.page.fill('input[name=password]', 'a-long-password');
    await cust.page.click('.auth button[type=submit]'); await cust.page.waitForURL(base() + '/');
    await cust.page.goto(`${base()}/s/${S1}`);
    const card = cust.page.locator('.pgrid .pcard', { hasText: 'Garri (White)' });
    await card.getByRole('button', { name: /^Add /, exact: false }).first().click();
    await card.getByRole('button', { name: /Add one/ }).click();
    await cust.page.goto(`${base()}/checkout`);
    await cust.page.waitForSelector('.checkout');
    await seeText(cust.page.locator('main'), 'Extras');
    await noText(cust.page.locator('main'), 'Tip your driver');

    await tips.click({ force: true });
    await page.waitForFunction(() => (document.querySelector('input[aria-label="Driver tips"]') as HTMLInputElement | null)?.checked === true);
    await cust.page.reload(); await cust.page.waitForSelector('.checkout');
    await seeText(cust.page.locator('main'), 'Tip your driver');
  });

  it('a hidden menu item and a notice show up for that area, and the phone gets a slide-out menu', async () => {
    const c = await db();
    await c.query(`UPDATE portal_config SET hidden_nav = ARRAY['/vendor/ads'], notice = 'Payouts pause Dec 24 to 26', notice_tone = 'warn' WHERE portal = 'vendor'`); await c.end();
    const { page } = await newPage(browser, DESKTOP);
    await signIn(page, 'owner1@example.test');
    await page.goto(`${base()}/vendor/orders`);
    await seeText(page.locator('.bo-main'), 'Payouts pause Dec 24 to 26');
    expect(await page.locator('.bo-side').getByRole('link', { name: 'Ads', exact: true }).count()).toBe(0);
    await seeText(page.locator('.bo-side'), 'Inventory');

    const m = await newPage(browser, MOBILE);
    await signIn(m.page, 'owner1@example.test');
    await m.page.goto(`${base()}/vendor/orders`);
    const side = m.page.locator('.bo-side');
    await m.page.waitForSelector('.bo-top');
    expect((await side.boundingBox())!.x).toBeLessThan(0);          // tucked away
    await m.page.getByRole('button', { name: 'Open menu' }).click();
    await m.page.waitForTimeout(350);
    expect((await side.boundingBox())!.x).toBeGreaterThanOrEqual(0);
    await side.getByRole('link', { name: 'Inventory' }).click();
    await m.page.waitForURL('**/vendor/inventory');
    await m.page.waitForTimeout(350);
    expect((await side.boundingBox())!.x).toBeLessThan(0);          // closes after choosing
  });

  it('a vendor switched off from running ads is told so, not shown an error page', async () => {
    const c = await db();
    await c.query(`UPDATE app_settings SET value = jsonb_set(value, '{ads}', 'false') WHERE key = 'vendor.default_capabilities'`); await c.end();
    const { page } = await newPage(browser, DESKTOP);
    await signIn(page, 'owner1@example.test');
    const r = await page.evaluate(async () => (await fetch('/api/vendor/ads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status);
    expect(r).toBe(403);
    const c2 = await db();
    await c2.query(`UPDATE app_settings SET value = jsonb_set(value, '{ads}', 'true') WHERE key = 'vendor.default_capabilities'`); await c2.end();
  });
});

describe('separate staff and shop sign-ins (browser)', () => {
  it('an admin and a customer are signed in side by side in one browser, and signing out of one keeps the other', async () => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await signIn(page, 'customer@example.test');                       // shop (and its own staff session, which has no staff rights)
    await ctx.clearCookies({ name: 'ez_staff' });
    await page.goto(`${base()}/admin`);
    await page.waitForURL(/\/signin\?next=%2Fadmin/);                   // a shop sign-in does not open the admin
    await seeText(page.locator('main'), 'Staff sign in');
    await seeText(page.locator('main'), 'Continue as');                 // offered, since you are signed in to the shop
    await page.fill('input[name=email]', 'admin@example.test');
    await page.fill('input[name=password]', 'dev-password-123');
    await page.click('.auth button[type=submit]');
    await page.waitForURL('**/admin');
    await seeText(page.locator('.bo-top'), 'Admin');
    await page.goto(`${base()}/account`);
    await seeText(page.locator('main'), 'customer@example.test');       // the shop still knows the customer
    await page.goto(`${base()}/admin`);
    await seeText(page.locator('.bo-top'), 'Switch area');
    await page.locator('.bo-user summary').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(base() + '/');
    await page.goto(`${base()}/account`);
    await seeText(page.locator('main'), 'customer@example.test');       // still a customer
    await page.goto(`${base()}/admin`);
    await page.waitForURL(/\/signin/);                                  // but the admin is gone
    await ctx.close();
  });
});

describe('selling and cooking entry (browser)', () => {
  it('a signed-out visitor to /vendor gets sign in or sign up first, and a new account lands on the application', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/vendor`);
    await page.waitForURL(/\/signin\?next=%2Fvendor/);
    await seeText(page.locator('main'), 'Sign in to sell or cook');
    await page.locator('.notice').getByRole('link', { name: 'create an account' }).click();
    await page.waitForURL(/\/register\?next=%2Fvendor/);
    await page.fill('input[name=full_name]', 'New Seller'); await page.fill('input[name=email]', `seller+${Date.now()}@example.test`); await page.fill('input[name=password]', 'a-long-password');
    await page.click('.auth button[type=submit]');
    await page.waitForURL('**/vendor');
    await seeText(page.locator('body'), 'Applying as New Seller');
    await seeText(page.locator('body'), 'Tell us about your business');
    await page.getByRole('button', { name: 'Use a different account' }).click();
    await page.waitForURL(/\/signin\?next=%2Fvendor/);
  });
});
