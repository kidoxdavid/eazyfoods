import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, newPage } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('home carousel: sponsored slides', () => {
  it('an approved home_banner campaign appears as a labelled slide, and a click is counted', async () => {
    const c = await db();
    const store = (await c.query(`SELECT s.id, s.slug, s.vendor_id FROM storefronts s WHERE s.orderable LIMIT 1`)).rows[0];
    const id = (await c.query(
      `INSERT INTO ad_campaigns(vendor_id, store_id, placement, title, body, cpc_cents, budget_cents, starts_at, ends_at, status)
       VALUES ($1,$2,'home_banner','Carousel ad test','Fresh this week',20,5000, now() - interval '1 day', now() + interval '1 day','approved') RETURNING id`, [store.vendor_id, store.id])).rows[0].id;
    try {
      const { page } = await newPage(browser, { width: 390, height: 844 });
      await page.goto(`${base()}/`, { waitUntil: 'domcontentloaded' });
      const slide = page.locator('.hero-slide', { hasText: 'Carousel ad test' });
      await slide.waitFor({ state: 'attached', timeout: 20_000 });
      expect((await slide.locator('.hero-eyebrow').innerText()).toLowerCase()).toBe('sponsored');
      expect(await page.locator('.banner .sponsor').count()).toBe(0);          // the old strip below the carousel is gone
      await page.evaluate(() => (document.querySelector('.hero-track') as HTMLElement).scrollTo({ left: 99999 }));
      const hit = page.waitForResponse((r) => r.url().includes('/event') && r.request().method() === 'POST');
      await slide.locator('a.cta').evaluate((a: HTMLElement) => a.click());
      expect((await hit).status()).toBe(204);
      await page.waitForURL(`**/s/${store.slug}`);
      await expect.poll(async () => Number((await c.query(`SELECT count(*) FROM ad_events WHERE campaign_id=$1 AND type='click'`, [id])).rows[0].count), { timeout: 10_000 }).toBeGreaterThan(0);
    } finally {
      await c.query('DELETE FROM ad_events WHERE campaign_id = $1', [id]);
      await c.query('DELETE FROM ad_campaigns WHERE id = $1', [id]);
      await c.end();
    }
  }, 90_000);
});
