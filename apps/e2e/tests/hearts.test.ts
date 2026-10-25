import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, MOBILE, newPage, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('save from product cards (browser)', () => {
  it('a signed-in shopper hearts a card on the home page; it shows in Saved; a visitor is sent to sign in', async () => {
    const { page, errors } = await newPage(browser, MOBILE);
    await signIn(page, 'customer@example.test');
    await page.goto(base()); await page.waitForLoadState('networkidle');
    const heart = page.getByRole('button', { name: /^Save / }).first();
    await heart.waitFor();
    const label = (await heart.getAttribute('aria-label'))!;
    await heart.click();
    await page.getByRole('button', { name: label.replace('Save ', 'Remove ').replace(/$/, ' from saved') }).first().waitFor();
    const c = await db(); const n = (await c.query(`SELECT count(*)::int n FROM favourites f JOIN users u ON u.id = f.user_id WHERE u.email = 'customer@example.test'`)).rows[0].n; await c.end();
    expect(n).toBeGreaterThan(0);
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: label.replace('Save ', 'Remove ').replace(/$/, ' from saved') }).first().waitFor();   // still saved after a reload
    expect(errors.filter((e) => !/40[0-9]/.test(e))).toEqual([]);

    const guest = await newPage(browser, MOBILE);
    await guest.page.goto(base()); await guest.page.waitForLoadState('networkidle');
    await guest.page.getByRole('link', { name: /^Sign in to save / }).first().click();
    await guest.page.waitForURL(/\/signin/);
  });
});
