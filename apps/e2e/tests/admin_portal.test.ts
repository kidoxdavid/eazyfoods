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
});
