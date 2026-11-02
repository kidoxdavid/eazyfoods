import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signInStaff } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('nutrition facts and dietary labels', () => {
  it('the catalogue team enters them; shoppers see the panel, the labels and can filter by them', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    const id = await page.evaluate(async () => (await (await fetch('/api/products/rice-basmati', { headers: {} })).json()).id ?? null).catch(() => null);
    // find a product to edit through the admin list
    const pid = await page.evaluate(async () => { const r = await (await fetch('/api/admin/products?q=plantain', { headers: { 'x-area': 'admin' } })).json(); const l = r.results ?? r.rows ?? r; return ((l.find((x: any) => x.status === 'published') ?? l[0])?.id ?? null) as string | null; });
    expect(pid, 'a product to edit').toBeTruthy(); void id;
    await page.goto(`${base()}/admin/catalogue/${pid}`, { waitUntil: 'networkidle' });
    await page.getByLabel('Halal', { exact: true }).check(); await page.getByLabel('Nut-free', { exact: true }).check();
    await page.getByLabel('Serving size', { exact: true }).fill('30 g'); await page.getByLabel('Calories', { exact: true }).fill('150'); await page.getByLabel('Fat (g)', { exact: true }).fill('9'); await page.getByLabel('Sodium (mg)', { exact: true }).fill('120');
    await page.getByRole('button', { name: /Save changes/ }).first().click(); await page.getByText('Product saved').waitFor({ timeout: 8000 }).catch(async () => { throw new Error('NOT SAVED: ' + (await page.locator('[role=alert], .text-red-700').allInnerTexts()).join(' | ').slice(0, 300)); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), 'admin editor fits a phone').toBeLessThanOrEqual(391);
    // the shopper side
    const slug = await page.evaluate(async (i) => (await (await fetch(`/api/admin/products/${i}`, { headers: { 'x-area': 'admin' } })).json()).slug as string, pid);
    const shop = await browser.newContext({ viewport: { width: 390, height: 844 } }); const sp = await shop.newPage();
    await sp.goto(`${base()}/p/${slug}`, { waitUntil: 'networkidle' });
    const panel = sp.getByRole('table', { name: 'Nutrition facts' }); await panel.waitFor();
    expect(await panel.innerText()).toMatch(/Serving size[\s\S]*30 g[\s\S]*Calories[\s\S]*150[\s\S]*Fat[\s\S]*9 g[\s\S]*Sodium[\s\S]*120 mg/);
    { const t = await sp.locator('body').innerText(); expect(t).toMatch(/Dietary/); expect(t).toMatch(/Halal/); expect(t).toMatch(/Nut-free/); }
    expect(await sp.evaluate(() => document.documentElement.scrollWidth), 'fits a phone').toBeLessThanOrEqual(391);
    await sp.screenshot({ path: '/tmp/nutrition390.png', fullPage: true });
    await sp.goto(`${base()}/search?q=plantain&diet=halal`, { waitUntil: 'networkidle' });
    await sp.locator('.pcard').first().waitFor(); expect(await sp.locator('.pcard').count()).toBeGreaterThan(0);
    expect(await sp.locator('body').innerText()).toMatch(/Halal/);
    await ctx.close(); await shop.close();
  }, 150_000);
});
