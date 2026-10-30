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
    await page.waitForFunction(() => document.querySelector('[aria-label="Driver tips"]')?.getAttribute('aria-checked') === 'false');

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
    await page.waitForFunction(() => document.querySelector('[aria-label="Driver tips"]')?.getAttribute('aria-checked') === 'true');
    await cust.page.reload(); await cust.page.waitForSelector('.checkout');
    await seeText(cust.page.locator('main'), 'Tip your driver');
  });

  it('a hidden menu item and a notice show up for that area, and the phone gets a slide-out menu', async () => {
    const c = await db();
    await c.query(`UPDATE portal_config SET hidden_nav = ARRAY['/vendor/ads'], notice = 'Payouts pause Dec 24 to 26', notice_tone = 'warn' WHERE portal = 'vendor'`); await c.end();
    const { page } = await newPage(browser, DESKTOP);
    await signIn(page, 'owner1@example.test');
    await page.goto(`${base()}/vendor/orders`);
    await seeText(page.locator('[role=note]'), 'Payouts pause Dec 24 to 26');
    expect(await page.locator('aside').getByRole('link', { name: 'Ads', exact: true }).count()).toBe(0);
    await seeText(page.locator('aside'), 'Inventory');

    const m = await newPage(browser, MOBILE);
    await signIn(m.page, 'owner1@example.test');
    await m.page.goto(`${base()}/vendor/orders`);
    const side = m.page.locator('aside');
    await m.page.getByRole('button', { name: 'Open menu' }).waitFor();
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
    await seeText(page.locator('body'), 'Admin Console');
    await noText(page.locator('main'), 'Continue as');
    await page.fill('input[name=email]', 'customer@example.test');     // not even by trying the customer's own email
    await page.fill('input[name=password]', 'dev-password-123');
    await page.click('form button[type=submit]');
    await seeText(page.locator('body'), 'only for the admin, finance, marketing, vendor and driver accounts');
    await page.fill('input[name=email]', 'admin@example.test');
    await page.fill('input[name=password]', 'dev-password-123');
    await page.click('form button[type=submit]');
    await page.waitForURL(/\/admin\/?$/);
    await seeText(page.locator('aside'), 'Admin');
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

  it('each area opens only for its own sign-in; another area sign-in neither opens it nor is signed out by it', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'marketing@example.test', 'dev-password-123', '/marketing');
    await seeText(page.locator('aside'), 'Marketing');
    await page.goto(`${base()}/driver`);
    await page.waitForURL(/\/driver\/signin/);                           // a marketing sign-in does not open the driver area
    await seeText(page.locator('body'), 'Driver Portal');
    await page.goto(`${base()}/marketing`);                                // and it did not sign the marketing account out
    await seeText(page.locator('aside'), 'Marketing');
  });
});

describe('selling and cooking entry (browser)', () => {
  it('/vendor asks for the store or kitchen account; a vendor email gets in, and the portal shows its menu', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/vendor`);
    await page.waitForURL(/\/vendor\/signin/);
    await seeText(page.locator('body'), 'Vendor Portal');
    await seeText(page.locator('body'), 'Register your business');
    await page.fill('input[name=email]', 'owner1@example.test'); await page.fill('input[name=password]', 'dev-password-123');
    await page.click('button[type=submit]');
    await page.waitForURL(/\/vendor\/?$/);
    await page.locator('aside').first().waitFor({ state: 'attached' });
  });
});

describe('every area keeps its own sign-in (browser)', () => {
  it('admin, vendor and driver can all be signed in at once in one browser; signing out of one leaves the others', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    await signInStaff(page, 'owner1@example.test', 'dev-password-123', '/vendor');
    await signInStaff(page, 'driver@example.test', 'dev-password-123', '/driver');
    await page.goto(`${base()}/admin`); await seeText(page.locator('aside'), 'Admin');          // still signed in as admin
    await page.goto(`${base()}/vendor`); await seeText(page.locator('aside'), 'Store');             // and as the vendor
    await page.goto(`${base()}/driver`); await seeText(page.locator('aside'), 'Driver');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/driver\/signin/);
    await page.goto(`${base()}/admin`); await seeText(page.locator('aside'), 'Admin');          // the others are untouched
    await page.goto(`${base()}/vendor`); await seeText(page.locator('aside'), 'Store');
  });
});

describe('own sign-up window (browser)', () => {
  it('a new vendor signs up in the vendor window, lands on the application, and can come back with the same login', async () => {
    const { page } = await newPage(browser, MOBILE);
    const email = `new${Date.now()}@signup.test`;
    await page.goto(`${base()}/vendor/signup`);
    await page.fill('input[name=business_name]', 'New Seller Foods'); await page.fill('input[name=email]', email); await page.fill('input[name=phone]', '403-555-0199');
    await page.fill('input[name=first_name]', 'New'); await page.fill('input[name=last_name]', 'Seller'); await page.fill('input[name=password]', 'a-long-password');
    await page.fill('input[name=street_address]', '12 Test Street SW'); await page.selectOption('select[name=state]', { label: 'Alberta' }); await page.selectOption('select[name=city]', 'Calgary');
    await page.fill('input[name=postal_code]', 'T2P 1J9'); await page.getByLabel('West African').check();
    for (const f of await page.locator('input[type=file]').all()) await f.setInputFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
    await page.click('button[type=submit]');
    await page.waitForURL(/\/vendor\/?$/);
    await page.locator('aside').first().waitFor({ state: 'attached' });          // signed in to the vendor window straight away
    await seeText(page.locator('[aria-label="Application status"]'), 'Finish setting up');   // and shown what is left before the application can be sent
    await page.goto(`${base()}/admin`);                                        // it is not an admin, and has no shopping account either
    await page.waitForURL(/\/admin\/signin/);                            // not an admin; the vendor sign-in does not open admin
  });
});

describe('admin has absolute control (browser)', () => {
  it('opens a vendor portal from the vendor page, sees the admin-mode banner, and exits back to admin', async () => {
    const c = await db(); const vid = (await c.query('SELECT vendor_id FROM stores WHERE slug = $1', [S1])).rows[0].vendor_id; await c.end();
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'admin@example.test');
    await page.goto(`${base()}/admin/vendors/${vid}`);
    await page.getByRole('button', { name: 'Open their portal' }).click();
    await page.waitForURL(/\/vendor\/?$/);
    await seeText(page.locator('body'), 'Admin mode');
    await page.goto(`${base()}/vendor/orders`);
    await seeText(page.locator('main'), 'Orders');
    await page.getByRole('button', { name: 'Exit and go back to admin' }).click();
    await page.waitForURL('**/admin/vendors');
    await page.goto(`${base()}/vendor`);
    await page.waitForURL(/\/vendor\/signin/);                            // the admin sign-in does not open the vendor area (only "Open their portal" does)
  });
});
