import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, newPage, seeText, signIn, signInStaff } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('expired ads', () => {
  it('show as expired to the vendor and to marketing, with no approve or pause buttons', async () => {
    const c = await db();
    const s = (await c.query(`SELECT s.id, s.vendor_id FROM storefronts s WHERE s.slug = 'demo-calgary-west-african-market'`)).rows[0];
    const id = (await c.query(
      `INSERT INTO ad_campaigns(vendor_id, store_id, placement, title, cpc_cents, budget_cents, starts_at, ends_at, status)
       VALUES ($1,$2,'home_banner','Ended promo ad',20,5000, now() - interval '9 days', now() - interval '3 days','approved') RETURNING id`, [s.vendor_id, s.id])).rows[0].id;
    try {
      const v = await newPage(browser, { width: 1280, height: 900 });
      await signIn(v.page, 'owner1@example.test');
      await v.page.goto(`${base()}/vendor/ads`, { waitUntil: 'domcontentloaded' });
      const card = v.page.locator('div', { hasText: 'Ended promo ad' }).filter({ has: v.page.locator('h3') }).last();
      await seeText(card, /expired/i);
      expect(await card.getByRole('button', { name: /pause/i }).count()).toBe(0);

      const m = await newPage(browser, { width: 1280, height: 900 });
      await signInStaff(m.page, 'marketing@example.test', 'dev-password-123', '/marketing');
      await m.page.getByRole('link', { name: /Ad Approvals/ }).first().click();
      const row = m.page.locator('tr, .ez-card', { hasText: 'Ended promo ad' }).first();
      await seeText(row, /expired/i);
      expect(await row.getByRole('button', { name: 'Approve' }).count()).toBe(0);
    } finally { await c.query('DELETE FROM ad_campaigns WHERE id = $1', [id]); await c.end(); }
  }, 120_000);
});
