import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, DESKTOP, launch, MOBILE, newPage, seeText, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

const create = (name: string) => async (page: any) => page.evaluate(async (n: string) => {
  const h = { 'content-type': 'application/json', 'x-area': 'vendor' };
  const stores = await (await fetch('/api/vendor/stores', { headers: h })).json();
  const r = await fetch(`/api/vendor/stores/${stores[0].id}/catalogue`, { method: 'POST', headers: h, body: JSON.stringify({ name: n, price: 4, stock_quantity: 2, status: 'active' }) });
  return r.status;
}, name);

describe('live updates', () => {
  it('a product made on a phone appears on the open desktop page without reloading, then a barcode appears too', async () => {
    const desk = await newPage(browser, DESKTOP); const phone = await newPage(browser, MOBILE);
    for (const p of [desk.page, phone.page]) await p.addInitScript(() => localStorage.setItem('ez_live', '1'));
    await signIn(desk.page, 'owner1@example.test'); await signIn(phone.page, 'owner1@example.test');
    await desk.page.goto(`${base()}/vendor/labels`); await desk.page.waitForLoadState('load'); await desk.page.waitForTimeout(800);
    await phone.page.goto(`${base()}/vendor/products`); await phone.page.waitForLoadState('load'); await phone.page.waitForTimeout(800);
    await desk.page.evaluate(() => { (window as any).__stillHere = true; });             // proves the page was not reloaded
    const name = 'Zz Live Product ' + Date.now();
    expect(await create(name)(phone.page)).toBe(201);
    await seeText(desk.page.locator('body'), name, 15_000);
    expect(await desk.page.evaluate(() => (window as any).__stillHere)).toBe(true);
    // A barcode made on the phone shows on the desktop too.
    const pid = await phone.page.evaluate(async (n: string) => {
      const h = { 'content-type': 'application/json', 'x-area': 'vendor' };
      const stores = await (await fetch('/api/vendor/stores', { headers: h })).json();
      const list = await (await fetch(`/api/vendor/stores/${stores[0].id}/catalogue`, { headers: h })).json();
      const p = list.find((x: any) => x.name === n);
      const r = await (await fetch(`/api/vendor/stores/${stores[0].id}/catalogue/${p.id}/barcode`, { method: 'POST', headers: h, body: '{}' })).json();
      return r.barcode as string;
    }, name);
    expect(pid).toMatch(/^\d{13}$/);
    await seeText(desk.page.locator('body'), pid, 15_000);
    await desk.ctx.close(); await phone.ctx.close();
  });

  it('does not reload under someone who is typing, and offers a button instead', async () => {
    const { page, ctx } = await newPage(browser, DESKTOP);
    const other = await newPage(browser, MOBILE);
    for (const p of [page, other.page]) await p.addInitScript(() => localStorage.setItem('ez_live', '1'));
    await signIn(page, 'owner1@example.test'); await signIn(other.page, 'owner1@example.test');
    await page.goto(`${base()}/vendor/products`); await page.waitForLoadState('load'); await page.waitForTimeout(800);
    await other.page.goto(`${base()}/vendor/products`); await other.page.waitForLoadState('load'); await other.page.waitForTimeout(800);
    let loads = 0;
    page.on('response', (r) => { if (/\/catalogue$/.test(new URL(r.url()).pathname) && r.request().method() === 'GET') loads++; });
    await page.getByPlaceholder('Search products...').fill('half typed');
    const before = loads;
    await create('Zz Live Typing ' + Date.now())(other.page);
    await page.waitForTimeout(4000);
    expect(await page.getByPlaceholder('Search products...').inputValue()).toBe('half typed');   // not wiped
    expect(loads).toBe(before);                                                                   // and not reloaded under them
    await page.getByRole('status').filter({ hasText: /Updates available/ }).waitFor({ timeout: 10_000 });   // a button is offered instead
    await page.getByRole('status').filter({ hasText: /Updates available/ }).click();
    await page.waitForTimeout(1500);
    expect(loads).toBeGreaterThan(before);                                                        // pressing it reloads
    await ctx.close(); await other.ctx.close();
  });
});
