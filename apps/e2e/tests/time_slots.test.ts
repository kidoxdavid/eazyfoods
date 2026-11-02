import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('time slots for a store', () => {
  it('a store switches slots on, sets the rules and a closed day; customers then see windows; phone layout fits', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    await signIn(page, 'owner1@example.test');
    await page.goto(`${base()}/vendor/slots`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Time slots' }).waitFor();
    const enable = page.getByLabel('Offer time slots to customers'); await enable.waitFor();
    if (!(await enable.isChecked())) await enable.check();
    await page.getByLabel('Length of each window').selectOption('60'); await page.getByLabel('Orders per window').fill('4'); await page.getByLabel('Shortest notice (minutes)').fill('120');
    const closed = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel('Date', { exact: true }).fill(closed); await page.getByLabel('Reason (optional)').fill('Stock take'); await page.getByRole('button', { name: 'Add' }).click();
    await page.getByText(closed).first().waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), 'fits a phone').toBeLessThanOrEqual(391);
    await page.screenshot({ path: '/tmp/slots390.png', fullPage: true });
    await page.getByRole('button', { name: 'Save time slots' }).click(); await page.getByRole('status').waitFor();
    // the shop now offers windows for this store, and not on the closed day
    const slug = await page.evaluate(async () => { const s = await (await fetch('/api/vendor/stores', { headers: { 'x-area': 'vendor' } })).json(); return s[0].slug as string; });
    const r = await page.evaluate(async (s) => (await fetch(`/api/slots/${s}`)).json(), slug);
    expect(r.enabled).toBe(true); expect(r.slots.length).toBeGreaterThan(5); expect(r.slots.every((x: any) => x.remaining === 4)).toBe(true);
    const starts: number[] = r.slots.map((x: any) => new Date(x.start).getTime());
    expect(Math.max(...starts.slice(1).map((t, i) => t - starts[i])), 'a whole day has no windows (the closed day)').toBeGreaterThanOrEqual(24 * 3600_000);
    // and it can be switched off again
    await page.reload({ waitUntil: 'networkidle' }); await page.getByLabel('Offer time slots to customers').uncheck(); await page.getByRole('button', { name: 'Save time slots' }).click(); await page.getByRole('status').waitFor();
    expect((await page.evaluate(async (s) => (await fetch(`/api/slots/${s}`)).json(), slug)).enabled).toBe(false);
    await ctx.close();
  }, 120_000);
});
