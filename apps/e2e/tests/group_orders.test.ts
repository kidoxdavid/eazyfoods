import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('group order (browser)', () => {
  it('start from the basket, share a link, a friend adds items and the starter sees it live, then moves it all to their basket', async () => {
    const host = await browser.newContext({ viewport: { width: 390, height: 844 } }); const hp = await host.newPage();
    await hp.addInitScript(() => { try { localStorage.setItem('ez_live', '1'); } catch { /* */ } });
    await signIn(hp, 'customer@example.test');
    await hp.goto(`${base()}/cart`, { waitUntil: 'domcontentloaded' });
    await hp.getByText('Ordering with others? Start a group order').click();
    await hp.getByLabel('Group order name').fill('Sunday cookout'); await hp.getByRole('button', { name: 'Start' }).click();
    await hp.waitForURL(/\/group\/[\w-]+/); await hp.getByRole('heading', { name: 'Sunday cookout' }).waitFor();
    const link = await hp.getByLabel('Group order link').inputValue();
    expect(link).toMatch(/\/group\/[\w-]+$/);

    // a friend (another account) opens the link, finds garri and adds two
    const friend = await browser.newContext({ viewport: { width: 390, height: 844 } }); const fp = await friend.newPage();
    const email = `friend${Date.now()}@example.test`;
    await fp.goto(`${base()}/register`, { waitUntil: 'networkidle' });
    await fp.evaluate(async (e) => { await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'a-long-password', full_name: 'Friend Buyer' }) }); }, email);
    await fp.goto(link, { waitUntil: 'networkidle' });
    await fp.getByRole('heading', { name: 'Sunday cookout' }).waitFor();
    await fp.getByLabel('Search products to add').fill('garri'); await fp.getByLabel('Search products to add').press('Enter');
    await fp.getByRole('button', { name: /^More Garri/ }).first().click(); await fp.getByRole('button', { name: /^More Garri/ }).first().click();
    await fp.getByText(/2 items|1 item/).first().waitFor();

    expect(await fp.evaluate(() => document.documentElement.scrollWidth), 'fits a phone').toBeLessThanOrEqual(391);
    await fp.screenshot({ path: '/tmp/group390.png' });
    // the starter sees the friend's items without reloading
    await hp.getByText('Friend', { exact: true }).waitFor({ timeout: 15_000 });
    expect(await hp.locator('body').innerText()).toMatch(/Garri/);

    // move to basket: lands in the basket with the items
    await hp.getByRole('button', { name: 'Move everything to my basket' }).click(); await hp.waitForURL(/\/cart/);
    await hp.locator('main').getByText(/Garri/).first().waitFor();
    // the group is closed now: the friend can no longer add
    await fp.reload({ waitUntil: 'networkidle' }); await fp.getByText('This group order is closed.').waitFor();
    await host.close(); await friend.close();
  }, 180_000);
});
