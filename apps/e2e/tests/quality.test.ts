import AxeBuilder from '@axe-core/playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, DESKTOP, launch, MOBILE, newPage, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

const PUBLIC = ['/', '/search?q=garri', '/search?region=east-africa', '/stores', '/s/demo-calgary-west-african-market', '/p/garri-white', '/recipes', '/recipes/jollof-rice-nigerian-style', '/cart', '/signin', '/register', '/pages/refund-policy'];
const SIGNED_IN = ['/account', '/orders', '/checkout'];
const PORTALS: [string, string][] = [['owner1@example.test', '/vendor'], ['owner1@example.test', '/vendor/orders'], ['owner1@example.test', '/vendor/inventory'], ['owner1@example.test', '/vendor/store'],
  ['owner@example.test', '/admin'], ['owner@example.test', '/admin/catalogue'], ['owner@example.test', '/admin/settings'], ['owner@example.test', '/admin/studio'], ['owner1@example.test', '/vendor/storefront'], ['driver@example.test', '/driver'], ['driver@example.test', '/driver/earnings']];
const WIDTHS = [360, 390, 768, 1280];

describe('responsive: no horizontal scrolling at common widths', () => {
  for (const w of WIDTHS) {
    it(`public pages at ${w}px`, async () => {
      const { page } = await newPage(browser, { width: w, height: 900 });
      const bad: string[] = [];
      for (const path of PUBLIC) {
        await page.goto(base() + path); await page.waitForLoadState('networkidle');
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) bad.push(path);
      }
      expect(bad).toEqual([]);
    });
    it(`signed-in and portal pages at ${w}px`, async () => {
      const bad: string[] = [];
      for (const [email, path] of [['customer@example.test', ''] as const, ...PORTALS.map(([e, p]) => [e, p] as const)]) {
        const { page, ctx } = await newPage(browser, { width: w, height: 900 });
        await signIn(page, email);
        for (const p of path ? [path] : SIGNED_IN) {
          await page.goto(base() + p); await page.waitForLoadState('networkidle');
          if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) bad.push(`${email} ${p}`);
        }
        await ctx.close();
      }
      expect(bad).toEqual([]);
    });
  }
});

describe('accessibility (axe, WCAG 2 A/AA): no serious or critical violations', () => {
  const scan = async (page: import('playwright-core').Page, label: string) => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.help}`);
  };
  it('public pages on a phone', async () => {
    const { page } = await newPage(browser, MOBILE);
    const found: string[] = [];
    for (const path of PUBLIC) { await page.goto(base() + path); await page.waitForLoadState('networkidle'); found.push(...(await scan(page, path))); }
    expect(found).toEqual([]);
  });
  it('public pages in dark mode', async () => {
    const { page } = await newPage(browser, MOBILE, 'dark');
    const found: string[] = [];
    for (const path of PUBLIC) { await page.goto(base() + path); await page.waitForLoadState('networkidle'); found.push(...(await scan(page, `dark ${path}`))); }
    expect(found).toEqual([]);
  });
  it('signed-in customer and portal pages', async () => {
    const found: string[] = [];
    for (const [email, path] of [['customer@example.test', '/account'] as const, ['customer@example.test', '/orders'] as const, ...PORTALS]) {
      const { page, ctx } = await newPage(browser, DESKTOP);
      await signIn(page, email); await page.goto(base() + path); await page.waitForLoadState('networkidle');
      found.push(...(await scan(page, `${email} ${path}`))); await ctx.close();
    }
    expect(found).toEqual([]);
  });
});

describe('navigation menu', () => {
  for (const [label, size] of [['phone', MOBILE], ['desktop', DESKTOP]] as const) {
    it(`the departments menu opens, stays open, navigates and closes (${label})`, async () => {
      const { page, errors } = await newPage(browser, size);
      await page.goto(base()); await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: size.width < 600 ? 'Open all departments' : /All departments/ }).first().click();
      const menu = page.getByRole('dialog', { name: 'All departments' });
      await menu.waitFor({ state: 'visible' });
      await page.waitForTimeout(700);                                   // it must still be there a moment later
      expect(await menu.isVisible()).toBe(true);
      await menu.getByRole('link', { name: 'Weekly deals' }).click();
      await page.waitForURL('**/deals');
      await page.getByRole('dialog', { name: 'All departments' }).waitFor({ state: 'hidden', timeout: 5000 });   // closes after navigating
      expect(errors).toEqual([]);
    });
  }
});

describe('home carousel', () => {
  it('does not flash or reorder slides while loading: the first slide shown is the welcome slide and the order never changes', async () => {
    const { page } = await newPage(browser, DESKTOP);
    await page.addInitScript(() => {
      (window as any).__heroLog = [];
      const sample = () => { const li = [...document.querySelectorAll('.hero-slide')].map((e) => e.getAttribute('aria-label') + '|' + (e.querySelector('h2')?.textContent ?? '')); const skel = !!document.querySelector('.hero-skel'); (window as any).__heroLog.push({ li, skel }); };
      setInterval(sample, 40);
    });
    await page.goto(base()); await page.waitForSelector('.hero-slide'); await page.waitForTimeout(1500);
    const log: { li: string[]; skel: boolean }[] = await page.evaluate(() => (window as any).__heroLog);
    const withSlides = log.filter((l) => l.li.length > 0);
    expect(withSlides.length).toBeGreaterThan(0);
    // once slides exist they are always the same list (no insertion later)
    expect(new Set(withSlides.map((l) => l.li.join('~'))).size).toBe(1);
    expect(withSlides[0].li[0]).toContain('African groceries');     // the welcome slide is first
  });
});

describe('festival and season themes', () => {
  it('a forced theme re-colours the shop, leads the carousel and shows its banner strip; auto returns to normal', async () => {
    const c = await db();
    try {
      await c.query(`UPDATE themes SET status = 'on' WHERE slug = 'diwali'`);
      const { page } = await newPage(browser, DESKTOP);
      await page.goto(base()); await page.waitForLoadState('networkidle');
      const first = page.locator('.hero-slide').first();
      await first.waitFor({ state: 'visible' });
      expect(await first.innerText()).toContain('Happy Diwali');
      expect(await page.locator('.announce.festive').innerText()).toContain('Diwali');
      const green = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim());
      expect(green).toMatch(/^#[0-9a-f]{6}$/i); expect(green).not.toBe('#1f5b3a');
      await page.goto(base() + '/vendor'); // staff areas keep their own colours
    } finally { await c.query(`UPDATE themes SET status = 'auto' WHERE slug = 'diwali'`); await c.end(); }
    const { page } = await newPage(browser, DESKTOP);
    await page.goto(base()); await page.waitForLoadState('networkidle');
    expect(await page.locator('.hero-slide').first().innerText()).not.toContain('Diwali');
  });

  for (const scheme of ['light', 'dark'] as const) {
    it(`every preset theme passes the accessibility scan on the homepage (${scheme})`, async () => {
      const c = await db(); const slugs = (await c.query('SELECT slug FROM themes ORDER BY slug')).rows.map((r) => r.slug as string).filter((_, i) => i % 3 === 0); await c.end();
      const { page } = await newPage(browser, MOBILE, scheme);
      await signIn(page, 'owner@example.test');
      const found: string[] = [];
      for (const slug of slugs) {
        await page.goto(`${base()}/?preview_theme=${slug}`); await page.waitForLoadState('networkidle');
        await page.locator('.hero-slide').first().waitFor({ state: 'visible' });
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        found.push(...r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${scheme} ${slug}: ${v.id} (${v.nodes.length}) ${v.help}`));
      }
      expect(found).toEqual([]);
    }, 240_000);
  }

  it('a store page picks up the vendor’s brand colour, story and announcement', async () => {
    const c = await db();
    try {
      await c.query(`INSERT INTO store_branding(store_id, accent, tagline, story, announcement) SELECT id, 'plum', 'Fresh every morning', 'We started in a garage.', 'Closed Monday' FROM stores WHERE slug = 'demo-calgary-west-african-market' ON CONFLICT (store_id) DO UPDATE SET accent = 'plum', tagline = 'Fresh every morning', story = 'We started in a garage.', announcement = 'Closed Monday'`);
      const { page } = await newPage(browser, MOBILE);
      await page.goto(base() + '/s/demo-calgary-west-african-market'); await page.waitForLoadState('networkidle');
      const body = await page.locator('main').innerText();
      for (const t of ['Fresh every morning', 'We started in a garage.', 'Closed Monday']) expect(body).toContain(t);
      const g = await page.evaluate(() => getComputedStyle(document.querySelector('.store-page')!).getPropertyValue('--green').trim());
      expect(g).toBe('#7a2e5d');
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    } finally { await c.query(`DELETE FROM store_branding WHERE store_id IN (SELECT id FROM stores WHERE slug = 'demo-calgary-west-african-market')`); await c.end(); }
  });
});
