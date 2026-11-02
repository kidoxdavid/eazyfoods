import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, setOffer, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('basket: time picker and savings', () => {
  it('shows "When do you want it?" for a store with time slots, carries the pick to checkout, and shows what you save', async () => {
    await setOffer('demo-calgary-west-african-market', 'garri-white', 2000, 50);
    const c = await db();
    const offer = (await c.query(`SELECT o.id FROM store_offers o JOIN stores s ON s.id = o.store_id JOIN products p ON p.id = o.product_id WHERE s.slug = 'demo-calgary-west-african-market' AND p.slug = 'garri-white'`)).rows[0].id as string;
    await c.query(`UPDATE store_offers SET compare_at_cents = 2500 WHERE id = $1`, [offer]);
    await c.query(`UPDATE stores SET preorders_enabled = true, preorder_lead_minutes = 60, preorder_max_days = 7, slot_minutes = 60, slot_capacity = 5 WHERE slug = 'demo-calgary-west-african-market'`);
    await c.query(`DELETE FROM store_hours WHERE store_id = (SELECT id FROM stores WHERE slug = 'demo-calgary-west-african-market')`);
    await c.query(`INSERT INTO store_hours(store_id, dow, opens, closes) SELECT s.id, d, '00:00', '23:59:59' FROM stores s, generate_series(0,6) d WHERE s.slug = 'demo-calgary-west-african-market'`);
    await c.end();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    await signIn(page, 'customer@example.test');
    await page.evaluate(async (o) => { await fetch('/api/cart', { method: 'DELETE', credentials: 'include' }); const r = await fetch(`/api/cart/items/${o}`, { method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity: 3 }) }); if (!r.ok) throw new Error('CART ' + r.status + ' ' + (await r.text()).slice(0, 200)); }, offer);
    await page.goto(`${base()}/cart`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /When do you want it\?/ }).waitFor({ timeout: 8000 }).catch(async () => { console.log('DBG', JSON.stringify({ cart: await page.evaluate(async () => (await (await fetch('/api/cart')).json()).stores.map((s: any) => s.slug)), txt: (await page.locator('main').innerText()).slice(0, 300) })); throw new Error('no picker'); });
    expect(await page.locator('.summary-row.saving').innerText()).toMatch(/You.re saving[\s\S]*−\$15\.00/);        // 3 × ($25.00 − $20.00)
    const timeSelect = page.locator('.basket-times').getByRole('combobox', { name: 'Time' }); await timeSelect.waitFor();
    await timeSelect.selectOption({ index: 1 }); const label = (await timeSelect.locator('option:checked').innerText()).trim();
    await page.getByText(/is saved\. You confirm it at checkout/).waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await page.screenshot({ path: '/tmp/basket390.png', fullPage: true });
    // at checkout the same time is already chosen
    await page.getByRole('link', { name: /Proceed to checkout/ }).click(); await page.waitForURL(/\/checkout/);
    await page.getByText('Choose a time').first().waitFor();
    expect((await page.getByRole('combobox', { name: 'Time' }).first().locator('option:checked').innerText()).trim()).toBe(label);   // the same time is already chosen
    await ctx.close();
    const c2 = await db(); await c2.query(`UPDATE stores SET preorders_enabled = false WHERE slug = 'demo-calgary-west-african-market'`); await c2.query(`UPDATE store_offers SET compare_at_cents = NULL WHERE id = $1`, [offer]); await c2.end();
  }, 150_000);
});
