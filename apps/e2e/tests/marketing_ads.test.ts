import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, newPage, seeText, signInStaff } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('marketing portal: ad approvals', () => {
  it('marketing sees a pending ad (with its video), approves it, and it goes live', async () => {
    const c = await db();
    const store = (await c.query(`SELECT s.id, s.vendor_id FROM storefronts s WHERE s.orderable LIMIT 1`)).rows[0];
    const id = (await c.query(
      `INSERT INTO ad_campaigns(vendor_id, store_id, placement, title, body, video_url, cpc_cents, budget_cents, starts_at, ends_at, status)
       VALUES ($1,$2,'home_banner','Marketing review ad','x','/uploads/${'a'.repeat(32)}.mp4',20,5000, now() - interval '1 day', now() + interval '1 day','pending') RETURNING id`, [store.vendor_id, store.id])).rows[0].id;
    try {
      const { page } = await newPage(browser, { width: 1280, height: 900 });
      await signInStaff(page, 'marketing@example.test', 'dev-password-123', '/marketing');
      await page.getByRole('link', { name: /Ad Approvals/ }).first().click();

      const row = page.locator('tr, .ez-card', { hasText: 'Marketing review ad' }).first();
      await seeText(row, 'Marketing review ad');
      expect(await row.locator('video').count()).toBeGreaterThan(0);
      await row.getByRole('button', { name: 'Approve' }).click();
      await expect.poll(async () => (await c.query('SELECT status FROM ad_campaigns WHERE id=$1', [id])).rows[0].status, { timeout: 10_000 }).toBe('approved');
    } finally {
      await c.query('DELETE FROM ad_campaigns WHERE id = $1', [id]); await c.end();
    }
  }, 90_000);
});
