import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser, Page } from 'playwright-core';
import { base, db, launch, newPage, seeText, setOffer, signIn } from './helpers.js';
import { measure } from './support/responsive.js';

/**
 * Real work on a small phone, not just looking at pages: each workflow is done at 320 and 360 px wide, and after every step the screen
 * must still fit (no sideways scroll, nothing off screen, nothing overlapping, inputs at least 16px).
 */
const S1 = 'demo-calgary-west-african-market';
let browser: Browser;
beforeAll(async () => { browser = await launch(); await setOffer(S1, 'garri-white', 2000, 50); });
afterAll(async () => { await browser?.close(); });

const bad: string[] = [];
const fit = async (page: Page, step: string, w: number, h: number) => {
  await page.waitForTimeout(250);
  for (const i of await measure(page, w, h)) if (i.severity !== 'info') bad.push(`${step} @${w}: ${i.kind} - ${i.detail.slice(0, 150)}`);
};
const SIZES = [{ w: 320, h: 640 }, { w: 360, h: 740 }] as const;

for (const { w, h } of SIZES) {
  describe(`workflows at ${w}px`, () => {
    it('customer: register, search, add to basket, edit the basket, check out as far as payment', async () => {
      bad.length = 0;
      const { page } = await newPage(browser, { width: w, height: h });
      const email = `mw${w}-${Date.now()}@example.test`;
      await page.goto(`${base()}/register`); await fit(page, 'register', w, h);
      await page.fill('input[name=full_name]', 'Small Phone'); await page.fill('input[name=email]', email); await page.fill('input[name=password]', 'a-long-password');
      await page.click('.auth button[type=submit]'); await page.waitForURL(base() + '/');
      await page.goto(`${base()}/search?q=garri`); await fit(page, 'search', w, h);
      await page.goto(`${base()}/s/${S1}`); await fit(page, 'store page', w, h);
      await page.locator('.pgrid .pcard', { hasText: 'Garri (White)' }).getByRole('button', { name: /^Add / }).first().click();
      await page.locator('.pgrid .pcard', { hasText: 'Garri (White)' }).getByRole('button', { name: /Add one/ }).click();
      await page.goto(`${base()}/cart`); await seeText(page.locator('main'), 'Garri (White)'); await fit(page, 'basket', w, h);
      await page.getByRole('button', { name: /Add one/ }).first().click(); await page.waitForTimeout(300);   // 3, then back to 2: editing the basket
      await page.getByRole('button', { name: /Remove one/ }).first().click(); await page.waitForTimeout(300);
      await page.getByRole('link', { name: /Proceed to checkout/ }).click(); await page.waitForSelector('.checkout'); await fit(page, 'checkout address', w, h);
      await page.fill('input[name=recipient_name]', 'Small Phone'); await page.fill('input[name=phone]', '5875550100');
      await page.fill('input[name=line1]', '12 Journey Road NE'); await page.fill('input[name=postal_code]', 'T2A 0A0');
      await page.getByRole('button', { name: 'Save address' }).click(); await page.waitForSelector('.choice.selected input[name=addr]'); await fit(page, 'checkout delivery', w, h);
      await page.getByRole('button', { name: /Continue to payment/ }).click(); await page.waitForSelector('.test-banner'); await fit(page, 'payment', w, h);
      await page.getByRole('button', { name: 'Simulate successful payment' }).click(); await page.waitForURL(/\/orders\/[0-9a-f-]+/); await fit(page, 'order tracking', w, h);
      expect(bad, `\n${bad.join('\n')}\n`).toEqual([]);
    }, 180_000);

    it('vendor: create a product, adjust stock, open the menu', async () => {
      bad.length = 0;
      const { page } = await newPage(browser, { width: w, height: h });
      await signIn(page, 'owner1@example.test');
      const name = `Phone Product ${w} ${Date.now()}`;
      await page.goto(`${base()}/vendor/products/new`); await page.waitForSelector('input[name=name]'); await fit(page, 'new product form', w, h);
      await page.fill('input[name=name]', name); await page.fill('input[name=price]', '7.25'); await page.fill('input[name=stock_quantity]', '12');
      await page.getByRole('button', { name: /create|save|add product/i }).last().click();
      await page.waitForURL((u) => /\/vendor\/products$/.test(u.pathname)); await fit(page, 'products list', w, h);
      await page.goto(`${base()}/vendor/inventory`); await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Add Adjustment/ }).click(); await page.getByRole('dialog').waitFor(); await fit(page, 'adjustment window', w, h);
      const dlg = (await page.getByRole('dialog').boundingBox())!;
      expect(dlg.x).toBeGreaterThanOrEqual(0); expect(dlg.x + dlg.width).toBeLessThanOrEqual(w + 1); expect(dlg.y).toBeGreaterThanOrEqual(0); expect(dlg.y + dlg.height).toBeLessThanOrEqual(h + 1);
      await page.keyboard.press('Escape').catch(() => {}); await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Open menu', exact: true }).click(); await page.waitForTimeout(400); await fit(page, 'menu open', w, h);
      const c = await db(); expect((await c.query(`SELECT 1 FROM products WHERE name=$1`, [name])).rowCount).toBe(1); await c.end();
      expect(bad, `\n${bad.join('\n')}\n`).toEqual([]);
    }, 180_000);

    it('driver: availability switch and the delivery screens', async () => {
      bad.length = 0;
      const { page } = await newPage(browser, { width: w, height: h });
      await signIn(page, 'driver@example.test');
      await page.goto(`${base()}/driver`); await page.waitForTimeout(600); await fit(page, 'driver home', w, h);
      const sw = page.getByRole('button', { name: /available|on|off/i }).first();
      await sw.click(); await page.waitForTimeout(400); await fit(page, 'availability toggled', w, h);
      for (const u of ['/driver/available-deliveries', '/driver/my-deliveries', '/driver/earnings']) { await page.goto(`${base()}${u}`); await page.waitForTimeout(500); await fit(page, u, w, h); }
      expect(bad, `\n${bad.join('\n')}\n`).toEqual([]);
    }, 120_000);

    it('admin: the menu, delivery pricing, and the money screens', async () => {
      bad.length = 0;
      const { page } = await newPage(browser, { width: w, height: h });
      await signIn(page, 'admin@example.test');
      await page.goto(`${base()}/admin`); await page.waitForTimeout(600);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click(); await page.waitForTimeout(400); await fit(page, 'admin menu', w, h);
      await page.getByRole('link', { name: /Pricing & rules/ }).first().click(); await page.waitForTimeout(800); await fit(page, 'pricing', w, h);
      for (const u of ['/admin/overview', '/admin/settlements', '/admin/vendors', '/admin/drivers', '/admin/orders']) { await page.goto(`${base()}${u}`); await page.waitForTimeout(600); await fit(page, u, w, h); }
      expect(bad, `\n${bad.join('\n')}\n`).toEqual([]);
    }, 120_000);
  });
}
