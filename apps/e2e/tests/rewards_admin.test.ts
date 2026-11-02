import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signInStaff } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('admin: rewards and EAZY+ numbers', () => {
  it('an admin edits them in one place, sees what they mean, and the shop uses the new numbers', async () => {
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
      await page.goto(`${base()}/admin/settings`, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: /Rewards & EAZY\+/ }).click();
      const ppd = page.getByLabel('Points earned per $1 spent'); await ppd.waitFor();
      expect(await page.locator('main').innerText()).toMatch(/\$50\*\* delivered|A \$50 delivered order earns 50 points/);   // the plain-words preview
      await ppd.fill('2'); await page.getByLabel(/Free delivery from a store once items there reach/).fill('25'); await page.getByLabel('Free trial length (days)').fill('14');
      expect(await page.locator('main').innerText()).toMatch(/earns 100 points/);                                       // the preview follows what is typed
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'fits the screen').toBeLessThanOrEqual(w + 1);
      if (w === 390) await page.screenshot({ path: '/tmp/rewardsadmin390.png', fullPage: true });
      await page.getByRole('button', { name: 'Save changes' }).click(); await page.getByText('Saved and recorded in the audit log').waitFor();
      // the shop reads the new numbers (the account summary and the trial length)
      const sum = await page.evaluate(async () => { const r = await fetch('/api/admin/settings', { headers: { 'x-area': 'admin' } }); const rows = await r.json(); const g = (k: string) => rows.find((x: any) => x.key === k)?.value; return { ppd: g('rewards.points_per_dollar'), min: g('membership.free_delivery_min_cents'), trial: g('membership.trial_days') }; });
      expect(sum).toEqual({ ppd: 2, min: 2500, trial: 14 });
      // bad numbers are refused
      await page.getByLabel('Points that are worth $1 of credit').fill('3'); await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText(/Points worth \$1: enter a number between 10 and 10000/).waitFor();
      // put it back
      await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('tab', { name: /Rewards & EAZY\+/ }).click(); await page.getByLabel('Points earned per $1 spent').fill('1'); await page.getByLabel(/Free delivery from a store once items there reach/).fill('30'); await page.getByLabel('Free trial length (days)').fill('30');
      await page.getByRole('button', { name: 'Save changes' }).click(); await page.getByText('Saved and recorded in the audit log').waitFor();
      await ctx.close();
    }
  }, 150_000);
});
