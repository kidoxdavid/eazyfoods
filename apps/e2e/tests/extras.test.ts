import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, MOBILE, newPage, noText, seeText, setOffer } from './helpers.js';

const S1 = 'demo-calgary-west-african-market';
let browser: Browser;
beforeAll(async () => { browser = await launch(); await setOffer(S1, 'garri-white', 2000, 30); });
afterAll(async () => { await browser?.close(); });

describe('batch 2 customer features, on a phone', () => {
  it('tip is never pre-selected, adds to the total, and is refunded-by-design text is shown; substitution preference is set in the basket', async () => {
    const { page, errors } = await newPage(browser, MOBILE);
    await page.goto(`${base()}/register`);
    await page.fill('input[name=full_name]', 'Tip Buyer'); await page.fill('input[name=email]', `tip+${Date.now()}@example.test`); await page.fill('input[name=password]', 'a-long-password');
    await page.click('.auth button[type=submit]');
    await page.waitForURL(base() + '/');
    await page.goto(`${base()}/s/${S1}`);
    const card = page.locator('.pgrid .pcard', { hasText: 'Garri (White)' });
    await card.getByRole('button', { name: /^Add /, exact: false }).first().click();
    await card.getByRole('button', { name: /Add one/ }).click();
    await page.goto(`${base()}/cart`);
    // per-item preference for an unavailable item
    const pref = page.getByLabel(/If Garri \(White\) is unavailable/);
    await pref.selectOption('closest');
    await page.waitForFunction(() => (document.querySelector('.sub-pref select') as HTMLSelectElement | null)?.value === 'closest');
    await page.getByRole('link', { name: /Proceed to checkout/ }).click();
    await page.waitForSelector('.checkout');
    await page.fill('input[name=recipient_name]', 'Tip Buyer'); await page.fill('input[name=phone]', '5875550100');
    await page.fill('input[name=line1]', '12 Tip Road NE'); await page.fill('input[name=postal_code]', 'T2A 0A0');
    await page.getByRole('button', { name: 'Save address' }).click();
    await page.waitForSelector('.choice.selected input[name=addr]');
    const summary = page.locator('.panel[aria-label="Order summary"]');
    await seeText(summary, 'Total');
    await noText(summary, 'Driver tip');                                   // nothing pre-selected
    const before = (await summary.locator('.summary-row.total span').last().innerText()).replace(/[^0-9.]/g, '');
    await page.getByRole('button', { name: '$5.00' }).click();
    await seeText(summary, 'Driver tip');
    await page.waitForFunction((b) => { const t = document.querySelector('.panel[aria-label="Order summary"] .summary-row.total span:last-child')?.textContent ?? ''; return Math.abs(Number(t.replace(/[^0-9.]/g, '')) - (Number(b) + 5)) < 0.005; }, before);
    await seeText(page.locator('main'), '100% goes to the driver');
    await page.getByRole('button', { name: /Continue to payment/ }).click();
    await page.getByRole('button', { name: 'Simulate successful payment' }).click();
    await page.waitForURL(/\/orders\/[0-9a-f-]+/);
    await seeText(page.locator('main'), 'Driver tip');
    await seeText(page.locator('main'), 'swap for closest match');
    const c = await db(); const r = await c.query(`SELECT o.tip_cents, l.sub_pref FROM orders o JOIN suborders s ON s.order_id = o.id JOIN order_lines l ON l.suborder_id = s.id ORDER BY o.created_at DESC LIMIT 1`); await c.end();
    expect(r.rows[0]).toEqual({ tip_cents: 500, sub_pref: 'closest' });
    expect(errors.filter((e) => !/40[0-9]|409/.test(e))).toEqual([]);
  });

  it('the weekly flyer lists live offers and is print-friendly', async () => {
    const { page } = await newPage(browser, MOBILE);
    const c = await db();
    await c.query(`UPDATE store_offers o SET compare_at_cents = o.price_cents + 300 FROM stores s, products p WHERE s.id = o.store_id AND p.id = o.product_id AND s.slug = $1 AND p.slug = 'garri-white'`, [S1]);
    await c.end();
    await page.goto(`${base()}/flyer`);
    await page.waitForSelector('.flyer-item');
    await seeText(page.locator('main'), 'This week’s flyer');
    await seeText(page.locator('.flyer-item'), 'Garri (White)');
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator('.flyer-item .btn, .flyer-item button').first().isVisible()).toBe(false);   // add buttons hidden on paper
  });
});
