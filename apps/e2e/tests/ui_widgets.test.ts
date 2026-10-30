import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, signIn, signInStaff } from './helpers.js';

/** Small things that were reported broken on a real phone: toggle switches, stacked date fields, and the gap under a row of filters. */
let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

for (const w of [320, 360, 390, 430, 768]) {
  describe(`widgets at ${w}px`, () => {
    it('toggle switches keep their shape; dates sit side by side with room below the filters', async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, 'owner1@example.test');
      await page.addInitScript(() => { /* nothing: the real page, no tricks */ });

      // The store-status switch on the vendor dashboard
      await page.goto(`${base()}/vendor`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
      const sw = page.getByRole('switch', { name: /Store open for orders/ });
      const b = (await sw.boundingBox())!, knob = (await sw.locator('span').first().boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(18); expect(b.height).toBeLessThanOrEqual(26);                 // a slim pill, not a fat one
      expect(b.width).toBeGreaterThanOrEqual(32); expect(b.width).toBeLessThanOrEqual(48);
      expect(knob.height).toBeLessThan(b.height); expect(knob.y).toBeGreaterThanOrEqual(b.y - 1); expect(knob.y + knob.height).toBeLessThanOrEqual(b.y + b.height + 1);   // the knob sits inside
      expect(knob.x).toBeGreaterThanOrEqual(b.x - 1); expect(knob.x + knob.width).toBeLessThanOrEqual(b.x + b.width + 1);

      // The statement page: From and To, then the number cards (the page in the report)
      await page.goto(`${base()}/vendor/statement`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      await page.addStyleTag({ content: 'input[type="date"]::-webkit-datetime-edit,input[type="datetime-local"]::-webkit-datetime-edit,input[type="month"]::-webkit-datetime-edit{min-width:170px!important;display:inline-block}' });                // as Safari on iPhone sizes it
      const from = (await page.locator('#stf').boundingBox())!, to = (await page.locator('#stt').boundingBox())!;
      expect(Math.abs(to.y - from.y)).toBeLessThan(6); expect(to.x).toBeGreaterThanOrEqual(from.x + from.width - 2);                                     // side by side without touching
      expect(from.x + from.width).toBeLessThanOrEqual(w + 1); expect(to.x + to.width).toBeLessThanOrEqual(w + 1);
      const card = page.locator('main .grid').first();
      if (await card.count()) { const c = (await card.boundingBox())!; expect(c.y - (to.y + to.height)).toBeGreaterThanOrEqual(8); }   // room between the filters and the cards
      await ctx.close();
    }, 60_000);
  });
}

for (const w of [320, 390, 430]) {
  describe(`hours, dates and people at ${w}px`, () => {
    it('opening hours stay side by side; date fields stay on the screen; staff list is tidy cards', async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, 'owner1@example.test');
      // Opening hours: start and end time share a row with the word "to"
      await page.goto(`${base()}/vendor/profile`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      const t = page.locator('input[type="time"]');
      const a = (await t.nth(0).boundingBox())!, b = (await t.nth(1).boundingBox())!;
      expect(Math.abs(a.y - b.y)).toBeLessThan(4); expect(b.x).toBeGreaterThan(a.x + a.width - 1); expect(b.x + b.width).toBeLessThanOrEqual(w + 1);
      expect(await page.getByText('to', { exact: true }).first().isVisible()).toBe(true);
      // Dates (orders: "From: [date]  To: [date]") never leave the screen, even at Safari's minimum width
      await page.goto(`${base()}/vendor/orders`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      await page.addStyleTag({ content: 'input[type="date"]::-webkit-datetime-edit,input[type="datetime-local"]::-webkit-datetime-edit,input[type="month"]::-webkit-datetime-edit{min-width:170px!important;display:inline-block}' });
      for (const el of await page.locator('input[type="date"]').all()) { const r = (await el.boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(-1); expect(r.x + r.width).toBeLessThanOrEqual(w + 1); }
      const sw = await page.evaluate(() => document.documentElement.scrollWidth); expect(sw).toBeLessThanOrEqual(w + 1);
      await ctx.close();
    }, 60_000);
  });
}

describe('admin users and roles', () => {
  it('is a grid of person cards that fit the screen at every width', async () => {
    for (const w of [320, 390, 768, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
      const page = await ctx.newPage();
      await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
      await page.goto(`${base()}/admin/settings`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.getByRole('tab', { name: /Users & roles/ }).click().catch(() => {});
      await page.waitForTimeout(800);
      const cards = page.locator('main ul > li').filter({ hasText: '@' });
      expect(await cards.count()).toBeGreaterThan(2);
      for (const el of (await cards.all()).slice(0, 8)) { const r = (await el.boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(-1); expect(r.x + r.width).toBeLessThanOrEqual(w + 1); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
      if (w === 390) await page.screenshot({ path: '/tmp/users390.png' });
      await ctx.close();
    }
  }, 120_000);
});

describe('wide grids and tables on a phone', () => {
  it('vendor permissions and the report tables never scroll sideways', async () => {
    for (const w of [320, 390, 430, 768]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
      const page = await ctx.newPage();
      await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
      await page.goto(`${base()}/admin/control`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      await page.getByRole('tab', { name: /vendor/i }).first().click(); await page.waitForTimeout(900);
      const sideways = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return !e.closest('[role="tablist"]') && /(auto|scroll)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 4 && r.width > 0; }).map((e) => e.className));
      expect(sideways, `w=${w}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
      if (w === 390) await page.screenshot({ path: '/tmp/perms390.png' });
      await ctx.close();
    }
    // A made-up wide table (as the driver, chef and report pages have once there is data) turns into cards
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    await signInStaff(page, 'admin@example.test', 'dev-password-123', '/admin');
    await page.goto(`${base()}/admin/overview`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const m = document.querySelector('main')!; const d = document.createElement('div'); d.style.overflowX = 'auto'; d.innerHTML = '<table id="tt" class="min-w-full"><thead><tr>' + ['Order', 'Placed', 'Status', 'Gross', 'Commission', 'Refunds', 'Net', 'Payout'].map((h) => `<th>${h}</th>`).join('') + '</tr></thead><tbody><tr>' + ['#1001', 'Oct 30, 2026 10:33', 'delivered', '$120.00', '$12.00', '$0.00', '$108.00', 'pending'].map((c) => `<td style="white-space:nowrap;padding:12px 24px">${c}</td>`).join('') + '</tr></tbody></table>'; m.prepend(d); });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => { const t = document.getElementById('tt')!.parentElement!; return t.scrollWidth <= t.clientWidth + 2; })).toBe(true);
    expect(await page.locator('#tt td[data-label="Net"]').count()).toBe(1);
    await ctx.close();
  }, 180_000);
});

describe('store portal and kitchen portal look different', () => {
  it('kitchens are orange and say Kitchen; stores are blue and say Store', async () => {
    const colour = async (email: string) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
      await signIn(page, email);
      await page.goto(`${base()}/vendor`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
      const r = await page.evaluate(() => ({ chef: document.documentElement.classList.contains('theme-chef'), bg: getComputedStyle(document.documentElement).getPropertyValue('--p-600').trim(), head: document.querySelector('aside h1')!.textContent, tag: document.querySelector('header')!.textContent, title: document.title }));
      await page.screenshot({ path: `/tmp/${email.split('@')[0]}.png` }); await ctx.close(); return r;
    };
    const store = await colour('owner1@example.test'), kitchen = await colour('chef1@example.test');
    expect(store.chef).toBe(false); expect(kitchen.chef).toBe(true);
    expect(store.head).toContain('Store'); expect(kitchen.head).toContain('Kitchen');
    expect(store.tag).toContain('Store'); expect(kitchen.tag).toContain('Kitchen');
    expect(store.bg).not.toBe(kitchen.bg);
    expect(kitchen.title).toContain('Kitchen'); expect(store.title).toContain('Store');
  }, 90_000);
});

describe('home banner', () => {
  it('slide dots are slim and a touch screen has no arrows over the banner', async () => {
    for (const [w, h] of [[390, 844], [844, 390]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }); const page = await ctx.newPage();
      await page.goto(`${base()}/`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      const dots = await page.locator('.hero-dots button').evaluateAll((a) => a.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      expect(dots.length).toBeGreaterThan(1);
      for (const [dw, dh] of dots) { expect(dh).toBeLessThanOrEqual(12); expect(dw).toBeLessThanOrEqual(28); }
      expect(await page.locator('.hero-arrow:visible').count()).toBe(0);
      await ctx.close();
    }
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
    await page.goto(`${base()}/`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
    expect(await page.locator('.hero-arrow:visible').count()).toBe(2);                              // a mouse still gets the arrows
    await ctx.close();
  }, 90_000);
});
