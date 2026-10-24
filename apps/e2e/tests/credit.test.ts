import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, MOBILE, newPage, seeText, setOffer } from './helpers.js';

const S1 = 'demo-calgary-west-african-market';
let browser: Browser;
beforeAll(async () => { browser = await launch(); await setOffer(S1, 'garri-white', 2000, 30); });
afterAll(async () => { await browser?.close(); });

describe('store credit, help and store comparison, on a phone', () => {
  it('redeems a gift code, uses the credit at checkout, and sees the card amount drop', async () => {
    const code = `EAZY-E2E${Date.now().toString(36).slice(-1).toUpperCase()}-TEST`.replace(/[01OI]/g, 'X');
    const c = await db(); await c.query('INSERT INTO gift_codes(code, amount_cents) VALUES ($1, 1500)', [code]); await c.end();
    const { page, errors } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/register`);
    await page.fill('input[name=full_name]', 'Credit Buyer'); await page.fill('input[name=email]', `cr+${Date.now()}@example.test`); await page.fill('input[name=password]', 'a-long-password');
    await page.click('.auth button[type=submit]');
    await page.waitForURL(base() + '/');
    await page.goto(`${base()}/credit`);
    await page.fill('input[name=code]', code.toLowerCase());
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await seeText(page.locator('main'), '$15.00');
    await seeText(page.locator('main'), 'Gift code');
    await page.goto(`${base()}/s/${S1}`);
    const card = page.locator('.pgrid .pcard', { hasText: 'Garri (White)' });
    await card.getByRole('button', { name: /^Add /, exact: false }).first().click();
    await card.getByRole('button', { name: /Add one/ }).click();
    await page.goto(`${base()}/checkout`);
    await page.fill('input[name=recipient_name]', 'Credit Buyer'); await page.fill('input[name=phone]', '5875550100');
    await page.fill('input[name=line1]', '12 Credit Road NE'); await page.fill('input[name=postal_code]', 'T2A 0A0');
    await page.getByRole('button', { name: 'Save address' }).click();
    await page.waitForSelector('.choice.selected input[name=addr]');
    const summary = page.locator('.panel[aria-label="Order summary"]');
    await page.getByLabel(/Use my store credit/).check();
    await seeText(summary, 'To pay by card');
    await seeText(summary, '−$15.00');
    await page.getByRole('button', { name: /Continue to payment/ }).click();
    await page.getByRole('button', { name: 'Simulate successful payment' }).click();
    await page.waitForURL(/\/orders\/[0-9a-f-]+/);
    await seeText(page.locator('main'), 'Paid with store credit');
    expect(errors.filter((e) => !/40[0-9]|409/.test(e))).toEqual([]);
  });

  it('the help centre shows answers and a contact form; stores can be compared by postal area', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/help`);
    await seeText(page.locator('main'), 'Where is my order?');
    await seeText(page.locator('main'), 'Contact support');
    await page.goto(`${base()}/stores`);
    await page.fill('input[aria-label="Postal code"]', 'T2A 0A1');
    await page.getByRole('button', { name: 'Compare' }).click();
    await page.waitForSelector('table.compare');
    await seeText(page.locator('table.compare'), 'Minimum order');
  });
});

describe('gift cards you can buy (browser)', () => {
  it('buys a gift card on a phone, sees the code after paying, and redeems it for store credit', async () => {
    const { page, errors } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/gift-cards`);
    await seeText(page.locator('main'), 'create an account');            // signed out: asked to sign in first
    await page.goto(`${base()}/register?next=/gift-cards`);
    await page.fill('input[name=full_name]', 'Gift Giver'); await page.fill('input[name=email]', `gc+${Date.now()}@example.test`); await page.fill('input[name=password]', 'a-long-password');
    await page.click('.auth button[type=submit]');
    await page.waitForURL('**/gift-cards');
    await page.getByRole('button', { name: '$25.00' }).click();
    await page.getByRole('button', { name: /Continue to payment · \$25\.00/ }).click();
    await page.waitForSelector('.test-banner');
    await page.getByRole('button', { name: 'Simulate successful payment' }).click();
    await page.waitForURL(/\/gift-cards\/[0-9a-f-]+/);
    const code = await page.locator('.code-box').innerText();
    expect(code).toMatch(/^EAZY-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await page.goto(`${base()}/credit`);
    await page.fill('input[name=code]', code);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await seeText(page.locator('main'), '$25.00');
    expect(errors.filter((e) => !/40[0-9]|409/.test(e))).toEqual([]);
  });
});
