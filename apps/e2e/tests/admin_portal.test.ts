import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, DESKTOP, launch, MOBILE, newPage, seeText, noText, signInStaff } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('admin portal (browser)', () => {
  it('the menu follows the role: support has no finance, finance has no dispatch, admin sees everything', async () => {
    const support = await newPage(browser, DESKTOP);
    await signInStaff(support.page, 'support@example.test', 'dev-password-123', '/admin');
    await seeText(support.page.locator('aside'), 'Support');
    await noText(support.page.locator('aside'), 'Finance');
    await noText(support.page.locator('aside'), 'Control centre');
    const fin = await newPage(browser, DESKTOP);
    await signInStaff(fin.page, 'finance@example.test', 'dev-password-123', '/admin');
    await fin.page.waitForURL(/\/admin\/finance/);                       // lands on its own screen
    await noText(fin.page.locator('aside'), 'Dispatch');
    const admin = await newPage(browser, DESKTOP);
    await signInStaff(admin.page, 'admin@example.test', 'dev-password-123', '/admin');
    for (const t of ['Dispatch', 'Finance', 'Control centre', 'Vendor pipeline', 'System & audit']) await seeText(admin.page.locator('aside'), t);
  });

  it('admin works the vendor pipeline: adds a prospect, logs a call, moves the stage', async () => {
    const { page, errors } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    await page.goto(`${base()}/admin/crm`);
    await page.getByRole('button', { name: /Add prospect/ }).click();
    await page.getByLabel('Business name').fill('Pipeline Test Spices');
    await page.getByLabel('Source').fill('walk-in');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('link', { name: /Pipeline Test Spices/ }).click();
    await page.getByLabel('What happened').fill('Called the owner; wants a demo');
    await page.getByRole('button', { name: 'Save activity' }).click();
    await seeText(page.locator('main'), 'Called the owner; wants a demo');
    await page.getByLabel('Stage').selectOption('demo');
    await page.waitForTimeout(500);
    const c = await db(); const r = await c.query(`SELECT stage FROM vendor_prospects WHERE business_name = 'Pipeline Test Spices'`); await c.end();
    expect(r.rows[0].stage).toBe('demo');
    expect(errors).toEqual([]);
  });

  it('admin publishes a page, changes the default commission and creates a staff login that can sign in', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    await page.goto(`${base()}/admin/content`);
    await page.getByRole('tab', { name: 'Pages & policies' }).click();
    await page.getByRole('button', { name: /New page/ }).click();
    await page.getByLabel('Address (slug)').fill('e2e-about-us');
    await page.getByLabel('Title').fill('About us (e2e)');
    await page.getByLabel('Body').fill('We are a Calgary marketplace.');
    await page.getByRole('button', { name: 'Save page' }).click();
    await seeText(page.locator('main'), 'About us (e2e)');

    await page.goto(`${base()}/admin/settings`);
    await page.getByRole('row', { name: /Default commission/ }).getByRole('button', { name: 'Change' }).click();
    await page.getByLabel(/^Value/).fill('11');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await seeText(page.locator('main'), '11%');

    await page.getByRole('tab', { name: 'Users & roles' }).click();
    await page.getByRole('button', { name: /Create a staff login/ }).click();
    const email = `staff${Date.now()}@example.test`;
    await page.getByLabel('Full name').fill('New Support Person');
    await page.getByRole('dialog').getByLabel('Email').fill(email);
    await page.getByLabel('Temporary password').fill('a-long-temp-pass');
    await page.getByRole('dialog').getByLabel('Role', { exact: true }).selectOption('support');
    await page.getByRole('button', { name: 'Create login' }).click();
    await seeText(page.locator('main'), email);
    const staff = await newPage(browser, DESKTOP);
    await signInStaff(staff.page, email, 'a-long-temp-pass', '/admin');
    await seeText(staff.page.locator('aside'), 'Support');
    const c = await db(); await c.query(`UPDATE app_settings SET value = '1200'::jsonb WHERE key = 'commission.default_bps'`); await c.end();
  });

  it('admin reads a driver’s application and answers their message', async () => {
    const c = await db();
    const d = (await c.query(`SELECT d.id, u.full_name FROM drivers d JOIN users u ON u.id = d.user_id WHERE u.email = 'driver@example.test'`)).rows[0];
    await c.query(`INSERT INTO driver_messages(driver_id, from_staff, body) VALUES ($1, false, 'Is my insurance slip ok?')`, [d.id]);
    await c.end();
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'dispatcher@example.test', 'dev-password-123', '/admin');
    await page.goto(`${base()}/admin/drivers`);
    await page.getByRole('button', { name: d.full_name }).click();
    await seeText(page.getByRole('dialog'), 'Is my insurance slip ok?');
    await page.getByLabel('Reply').fill('Looks fine, thank you');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await seeText(page.getByRole('dialog'), 'Looks fine, thank you');
  });

  it('works on a phone: the menu slides out and finance tables become cards', async () => {
    const { page } = await newPage(browser, MOBILE);
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('link', { name: 'Finance' }).click();
    await page.waitForURL(/\/admin\/finance/);
    await seeText(page.locator('main'), 'Finance');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  it('financial rules: the proposed profile is waiting as drafts, a bad band is explained, a rule goes through draft, submit and approve, and the simulator warns when nothing is live', async () => {
    const { page, errors } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    await page.goto(`${base()}/admin/pricing`);
    await seeText(page.locator('main'), 'Proposed Calgary distance bands');
    await page.getByRole('row', { name: /Proposed Calgary distance bands/ }).getByText('Draft').waitFor();     // seeded, not live
    // open the proposed delivery rule, break a band, and see the plain-language problem
    await page.getByText('Proposed Calgary distance bands').first().click();
    const dialog = page.getByRole('dialog').first();
    await dialog.getByText('Add a band').waitFor(); await page.waitForLoadState('networkidle');   // the editor finishes loading the rule first, or its late answer would overwrite what is typed
    await dialog.getByLabel('Up to (km)').fill('9');                                                            // first band now ends after the second (5 km)
    await dialog.getByRole('button', { name: 'Save draft' }).click();
    await seeText(dialog, 'overlap');
    await page.keyboard.press('Escape');
    // a service-fee rule through the whole lifecycle
    await page.getByRole('tab', { name: 'Service fee' }).click();
    await page.getByRole('button', { name: /New service fee rule/ }).click();
    const d2 = page.getByRole('dialog').first();
    await d2.getByLabel('Name', { exact: true }).fill('E2E service fee');
    await d2.getByLabel('Amount ($)').fill('0.99');
    await d2.getByRole('button', { name: 'Save draft' }).click();
    await page.getByText('E2E service fee').first().click();
    await page.getByRole('dialog').first().getByRole('button', { name: 'Submit for approval' }).click();
    await seeText(page.getByRole('dialog').first(), 'Waiting for approval');
    await page.getByRole('button', { name: 'Review and approve' }).click();
    await page.getByRole('button', { name: 'Yes, make it live' }).click();
    await page.getByRole('row', { name: /E2E service fee/ }).getByText('Live').waitFor();
    const c = await db(); const live = (await c.query(`SELECT status FROM pricing_rules WHERE name = 'E2E service fee'`)).rows[0].status;
    await c.query(`UPDATE pricing_rules SET status = 'retired', effective_to = now() WHERE name = 'E2E service fee'`); await c.end();
    expect(live).toBe('active');
    await page.getByRole('tab', { name: 'Simulator' }).click();
    await seeText(page.locator('main'), 'No delivery rule is live yet');
    expect(errors.filter((e) => !/40[0-9]/.test(e))).toEqual([]);
  });

  it('the finance window: its own sign-in, only the money screens, the same pricing rules screen, a shopper cannot get in', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'finance@example.test', 'dev-password-123', '/finance');
    await seeText(page.locator('aside'), 'eazyfoods Finance');
    for (const t of ['Refunds', 'Pricing & rules', 'Reports']) await seeText(page.locator('aside'), t);
    for (const t of ['Dispatch', 'Control centre', 'Vendors']) await noText(page.locator('aside'), t);
    await page.goto(`${base()}/finance/pricing`);
    await seeText(page.locator('main'), 'Proposed Calgary distance bands');
    // finance can write and submit but not approve
    await page.getByText('Proposed Calgary distance bands').first().click();
    await noText(page.getByRole('dialog').first(), 'Review and approve');
    await page.keyboard.press('Escape');
    // a shopper is refused at this window
    const cust = await newPage(browser, DESKTOP);
    await cust.page.goto(`${base()}/finance/signin`);
    await cust.page.fill('input[name=email]', 'customer@example.test'); await cust.page.fill('input[name=password]', 'dev-password-123');
    await cust.page.click('form button[type=submit]');
    await seeText(cust.page.locator('body'), 'only for the admin, finance, marketing, vendor and driver accounts');
  });

  it('settlements and reconciliation: finance previews a vendor before paying, sees the checks, and vendors and drivers read their own statements', async () => {
    const { page, errors } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'finance@example.test', 'dev-password-123', '/finance');
    await page.goto(`${base()}/finance/settlements`);
    await seeText(page.locator('main'), 'Settlements');
    await page.getByRole('tab', { name: 'Preview a vendor' }).click();
    await page.getByLabel('Vendor').selectOption({ index: 1 });
    await seeText(page.locator('main'), 'Net payable now');
    await seeText(page.locator('main'), 'Orders included');
    await page.getByRole('tab', { name: 'Statements' }).click();
    await page.getByLabel('Statement for').selectOption({ index: 1 });
    await seeText(page.locator('main'), 'Merchandise');
    await page.goto(`${base()}/finance/reconciliation`);
    await seeText(page.locator('main'), 'never creates a balancing entry');
    await page.getByRole('link', { name: 'Download movements (CSV)' }).waitFor();
    const vendor = await newPage(browser, DESKTOP);
    await signInStaff(vendor.page, 'owner1@example.test', 'dev-password-123', '/vendor');
    await vendor.page.goto(`${base()}/vendor/statement`);
    await seeText(vendor.page.locator('main'), 'You earn');
    const driver = await newPage(browser, DESKTOP);
    await signInStaff(driver.page, 'driver@example.test', 'dev-password-123', '/driver');
    await driver.page.goto(`${base()}/driver/statement`);
    await seeText(driver.page.locator('main'), 'Total earned');
    expect(errors.filter((e) => !/40[0-9]/.test(e))).toEqual([]);
  });

  it('the financial overview: grouped figures with definitions, honest about what is not recorded, filters, and the records behind the numbers', async () => {
    const { page, errors } = await newPage(browser, DESKTOP);
    await signInStaff(page, 'finance@example.test', 'dev-password-123', '/finance');
    await seeText(page.locator('main'), 'Financial overview');                                    // the finance window opens on it
    for (const t of ['EAZyfoods revenue', 'Sales volume and pass-through money', 'Contribution margin', 'Estimated margin']) await seeText(page.locator('main'), t);
    await seeText(page.locator('main'), 'Not recorded');                                           // processing fees and chargebacks are not invented
    await page.getByText('What is this?').first().click();
    await seeText(page.locator('main'), 'Marketplace commission kept');
    await page.getByLabel('Payment status').selectOption('refunded');
    await page.getByRole('button', { name: /Show the records behind these numbers/ }).click();
    await seeText(page.locator('main'), 'One row per store order');
    await page.getByLabel('From', { exact: true }).fill('2099-01-01'); await page.getByLabel('To', { exact: true }).fill('2099-01-31');
    await seeText(page.locator('main'), 'No paid orders in this period');
    expect(errors.filter((e) => !/40[0-9]/.test(e))).toEqual([]);
  });
});
