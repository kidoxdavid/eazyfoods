import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, newPage, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('vendor product form: where the food is from', () => {
  it('choosing a country tags the new product with it', async () => {
    const { page } = await newPage(browser, { width: 390, height: 844 });
    await signIn(page, 'owner1@example.test');
    const name = `Origin Test Yam ${Date.now()}`;
    await page.goto(`${base()}/vendor/products/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name=name]');
    await page.fill('input[name=name]', name); await page.fill('input[name=price]', '6.50'); await page.fill('input[name=stock_quantity]', '10');
    const chip = page.getByRole('button', { name: 'Nigeria', exact: true });
    await chip.scrollIntoViewIfNeeded(); await chip.click();
    expect(await chip.getAttribute('aria-pressed')).toBe('true');
    await page.getByRole('button', { name: /create|save|add product/i }).last().click();
    await page.waitForURL((u) => /\/vendor\/products$/.test(u.pathname));
    const c = await db();
    try {
      const row = (await c.query(`SELECT p.id, (SELECT count(*)::int FROM product_countries pc JOIN countries cn ON cn.id = pc.country_id WHERE pc.product_id = p.id AND pc.kind='culinary' AND cn.slug='nigeria') AS tagged FROM products p WHERE p.name = $1`, [name])).rows[0];
      expect(row?.tagged).toBe(1);
    } finally { await c.end(); }
  }, 90_000);
});
