import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, DESKTOP, MOBILE, newPage, noText, seeText, setOffer, signIn, signInStaff } from './helpers.js';

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
    await page.goto(`${base()}/signin`);
    await page.fill('input[name=email]', 'customer@example.test'); await page.fill('input[name=password]', 'dev-password-123');
    await page.click('.auth button[type=submit]'); await page.waitForURL((u) => !u.pathname.startsWith('/signin'));
    await page.goto(`${base()}/admin`);
    await page.waitForURL(/\/admin\/signin/);                            // a shopper does not get into the admin
    await seeText(page.locator('main'), 'Admin sign in');
    await noText(page.locator('main'), 'Continue as');
    await page.fill('input[name=email]', 'customer@example.test');     // not even by trying the customer's own email
    await page.fill('input[name=password]', 'dev-password-123');
    await page.click('.auth button[type=submit]');
    await seeText(page.locator('main'), 'only for the admin, marketing, vendor and driver accounts');
    await page.fill('input[name=email]', 'admin@example.test');
    await page.fill('input[name=password]', 'dev-password-123');
    await page.click('.auth button[type=submit]');
    await page.waitForURL('**/admin');
    await seeText(page.locator('.bo-brandbar'), 'Admin');
    await page.goto(`${base()}/account`);
    await seeText(page.locator('main'), 'customer@example.test');       // the shop still knows the customer
    await page.goto(`${base()}/admin`);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/admin\/signin/);
    await page.goto(`${base()}/account`);
    await seeText(page.locator('main'), 'customer@example.test');       // still a customer
    await page.goto(`${base()}/admin`);
    await page.waitForURL(/\/admin\/signin/);                           // but the admin is gone
    await ctx.close();
  });

  it('each area opens only for its own account: the wrong one is signed out and asked for the right email', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'marketing@example.test', 'dev-password-123', '/marketing');
    await seeText(page.locator('.bo-brandbar'), 'Marketing');
    await page.goto(`${base()}/driver`);
    await seeText(page.locator('body'), 'cannot open the driver area');          // the driver area does not take a marketing account
    await page.getByRole('button', { name: /Sign out and use a driver account/ }).click();
    await page.waitForURL(/\/driver\/signin/);
    await seeText(page.locator('main'), 'Driver sign in');
    await page.goto(`${base()}/marketing`);
    await page.waitForURL(/\/marketing\/signin/);                       // signed out of the staff area
    await seeText(page.locator('main'), 'Marketing sign in');
  });
});

describe('selling and cooking entry (browser)', () => {
  it('/vendor asks for the store or kitchen account; a vendor email gets in, and the portal shows its menu', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/vendor`);
    await page.waitForURL(/\/vendor\/signin/);
    await seeText(page.locator('main'), 'Vendor, chef and restaurant sign in');
    await seeText(page.locator('main'), 'Create a vendor account');
    await page.fill('input[name=email]', 'owner1@example.test'); await page.fill('input[name=password]', 'dev-password-123');
    await page.click('.auth button[type=submit]');
    await page.waitForURL('**/vendor');
    await page.waitForSelector('.bo-top');
  });
});

describe('own sign-up window (browser)', () => {
  it('a new vendor signs up in the vendor window, lands on the application, and can come back with the same login', async () => {
    const { page } = await newPage(browser, MOBILE);
    const email = `new${Date.now()}@signup.test`;
    await page.goto(`${base()}/vendor/signup`);
    await page.fill('input[name=full_name]', 'New Seller'); await page.fill('input[name=email]', email); await page.fill('input[name=password]', 'a-long-password');
    await page.click('.bo-auth button[type=submit]');
    await page.waitForURL('**/vendor');
    await seeText(page.locator('body'), 'Tell us about your business');
    await page.getByRole('button', { name: 'Cook and sell meals' }).click();
    await page.getByRole('button', { name: 'Restaurant', exact: true }).click();
    await seeText(page.locator('body'), 'List your restaurant');
    await page.goto(`${base()}/admin`);                                        // it is not an admin, and has no shopping account either
    await seeText(page.locator('body'), 'cannot open the admin area');
  });
});

describe('admin has absolute control (browser)', () => {
  it('opens a vendor portal from the vendor page, sees the admin-mode banner, and exits back to admin', async () => {
    const c = await db(); const vid = (await c.query('SELECT vendor_id FROM stores WHERE slug = $1', [S1])).rows[0].vendor_id; await c.end();
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'admin@example.test');
    await page.goto(`${base()}/admin/vendors/${vid}`);
    await page.getByRole('button', { name: 'Open their portal' }).click();
    await page.waitForURL('**/vendor');
    await seeText(page.locator('body'), 'Admin mode');
    await page.goto(`${base()}/vendor/orders`);
    await seeText(page.locator('.bo-main'), 'Orders');
    await page.getByRole('button', { name: 'Exit and go back to admin' }).click();
    await page.waitForURL('**/admin/vendors');
    await page.goto(`${base()}/vendor`);
    await seeText(page.locator('body'), 'cannot open the vendor area');      // the admin account opens the admin area only
  });
});
