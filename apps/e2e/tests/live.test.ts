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

describe('no flicker', () => {
  it('a live update swaps in quietly: no spinner or blank page is ever shown, and the scroll position stays', async () => {
    const desk = await newPage(browser, DESKTOP); const phone = await newPage(browser, MOBILE);
    for (const p of [desk.page, phone.page]) await p.addInitScript(() => localStorage.setItem('ez_live', '1'));
    await signIn(desk.page, 'owner1@example.test'); await signIn(phone.page, 'owner1@example.test');
    await desk.page.goto(`${base()}/vendor/labels`); await desk.page.waitForLoadState('load'); await desk.page.waitForTimeout(1500);
    await phone.page.goto(`${base()}/vendor/labels`); await phone.page.waitForLoadState('load'); await phone.page.waitForTimeout(800);
    await desk.page.evaluate(() => {
      (window as any).__flash = [];
      setInterval(() => {
        const spinner = [...document.querySelectorAll('.animate-spin.rounded-full, [aria-label="Loading"]')].some((e) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0'; });
        const blank = document.body.innerText.trim().length < 50;
        if (spinner || blank) (window as any).__flash.push(spinner ? 'spinner' : 'blank');
      }, 25);
    });
    const name = 'Zz Quiet ' + Date.now();
    await create(name)(phone.page);
    await seeText(desk.page.locator('body'), name, 15_000);
    await desk.page.waitForTimeout(800);
    expect(await desk.page.evaluate(() => (window as any).__flash)).toEqual([]);
    await desk.ctx.close(); await phone.ctx.close();
  });
});

describe('edit in place', () => {
  it('after saving a product the list shows the change at once with no loading, and a deleted row goes straight away', async () => {
    const { page, ctx, errors } = await newPage(browser, DESKTOP);
    page.on('dialog', (d) => d.accept());
    await page.addInitScript(() => localStorage.setItem('ez_live', '1'));
    await signIn(page, 'owner1@example.test');
    const name = 'Zz Inplace ' + Date.now();
    await page.goto(`${base()}/vendor/labels`); await page.waitForLoadState('load'); await page.waitForTimeout(1000);
    expect(await create(name)(page)).toBe(201);
    await page.goto(`${base()}/vendor/products`); await page.waitForLoadState('load');
    await page.getByPlaceholder('Search products...').and(page.locator(':visible')).fill(name);
    await seeText(page.locator('body'), name, 15_000);
    await page.getByPlaceholder('Search products...').and(page.locator(':visible')).fill('');
    // Open the product, rename it, save: back on the list the new name is there immediately (no second wait).
    await page.getByPlaceholder('Search products...').and(page.locator(':visible')).fill(name);
    await page.locator('a[href$="/edit"]').and(page.locator(':visible')).first().click();
    await page.waitForFunction((n) => (document.querySelector('input[name=name]') as HTMLInputElement | null)?.value === n, name, { timeout: 10_000 });   // the form fills itself in once loaded
    await page.locator('input[name=name]').fill(name + ' Renamed');
    await page.getByRole('button', { name: /save|update/i }).first().click();
    await page.waitForURL((u) => /\/vendor\/products$/.test(u.pathname));
    await page.getByPlaceholder('Search products...').and(page.locator(':visible')).fill(name + ' Renamed');
    await seeText(page.locator('body'), name + ' Renamed', 3000);
    // Delete: the row is gone as soon as it is confirmed.
    await page.getByTitle('Delete').or(page.locator('button.text-red-600')).and(page.locator(':visible')).first().click();
    await page.waitForTimeout(700);
    expect(await page.locator('body').innerText()).not.toContain(name + ' Renamed');
    expect(errors.filter((e) => !/status of 40[13]/.test(e))).toEqual([]);
    await ctx.close();
  });
});
