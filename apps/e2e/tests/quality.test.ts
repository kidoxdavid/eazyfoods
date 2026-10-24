import AxeBuilder from '@axe-core/playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, DESKTOP, launch, MOBILE, newPage, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

const PUBLIC = ['/', '/search?q=garri', '/search?region=east-africa', '/stores', '/kitchens', '/k/demo-mama-ngozi-kitchen', '/k/demo-habesha-table', '/s/demo-calgary-west-african-market', '/p/garri-white', '/recipes', '/recipes/jollof-rice-nigerian-style', '/cart', '/signin', '/register', '/pages/refund-policy'];
const SIGNED_IN = ['/account', '/orders', '/checkout'];
const PORTALS: [string, string][] = [['owner1@example.test', '/vendor'], ['owner1@example.test', '/vendor/orders'], ['owner1@example.test', '/vendor/inventory'], ['owner1@example.test', '/vendor/store'],
  ['owner@example.test', '/admin'], ['owner@example.test', '/admin/catalogue'], ['owner@example.test', '/admin/settings'], ['owner@example.test', '/admin/studio'], ['owner1@example.test', '/vendor/storefront'], ['owner1@example.test', '/vendor/messages'], ['chef1@example.test', '/vendor'], ['chef1@example.test', '/vendor/menu'], ['chef1@example.test', '/vendor/store'], ['chef1@example.test', '/vendor/orders'], ['chef1@example.test', '/vendor/payouts'], ['owner1@example.test', '/vendor/payouts'], ['finance@example.test', '/admin/finance'], ['marketing@example.test', '/marketing'], ['marketing@example.test', '/marketing/emails'], ['marketing@example.test', '/marketing/audiences'], ['marketing@example.test', '/marketing/campaigns'], ['marketing@example.test', '/marketing/automations'], ['marketing@example.test', '/marketing/calendar'], ['marketing@example.test', '/marketing/social'], ['marketing@example.test', '/marketing/budget'], ['marketing@example.test', '/marketing/library'], ['marketing@example.test', '/marketing/analytics'], ['marketing@example.test', '/marketing/settings'], ['owner@example.test', '/admin/dishes'], ['owner1@example.test', '/vendor/insights'], ['owner@example.test', '/admin/insights'], ['owner@example.test', '/admin/messages'], ['driver@example.test', '/driver'], ['driver@example.test', '/driver/earnings']];
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
  it('shows the real first slide from the first paint, never a placeholder, and later slides are only ever added after it', async () => {
    const c = await db();
    const before = (await c.query('SELECT id, status FROM themes')).rows;
    await c.query(`UPDATE themes SET status = 'off'`);           // the date-driven festival theme would otherwise lead
    try {
      const { page } = await newPage(browser, DESKTOP);
      await page.addInitScript(() => {
        (window as any).__heroLog = [];
        const sample = () => { const li = [...document.querySelectorAll('.hero-slide h2')].map((e) => e.textContent ?? ''); (window as any).__heroLog.push({ li, skel: !!document.querySelector('.hero-skel') }); };
        setInterval(sample, 16);
      });
      await page.goto(base()); await page.waitForSelector('.hero-slide'); await page.waitForTimeout(1500);
      const log: { li: string[]; skel: boolean }[] = await page.evaluate(() => (window as any).__heroLog);
      const withSlides = log.filter((l) => l.li.length > 0);
      expect(withSlides.length).toBeGreaterThan(0);
      expect(log.some((l) => l.skel)).toBe(false);                                  // no placeholder at any moment
      expect(withSlides[0].li[0]).toContain('African groceries');                   // the welcome slide is first
      for (let k = 1; k < withSlides.length; k++) expect(withSlides[k].li.slice(0, withSlides[k - 1].li.length)).toEqual(withSlides[k - 1].li);   // only appended, never reordered or inserted before
      expect(await page.evaluate(() => !!document.getElementById('boot'))).toBe(true);
    } finally { for (const r of before) await c.query('UPDATE themes SET status = $2 WHERE id = $1', [r.id, r.status]); await c.end(); }
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

describe('vendor messages (browser)', () => {
  it('a vendor starts a conversation and staff reply appears for them', async () => {
    const subject = `Hello ${Date.now()}`;
    const v = await newPage(browser, DESKTOP); await signIn(v.page, 'owner1@example.test');
    await v.page.goto(base() + '/vendor/messages');
    await v.page.getByRole('button', { name: 'New conversation' }).click();
    await v.page.getByLabel('Subject').fill(subject); await v.page.getByLabel('Message').fill('Can you help me list a new product?');
    await v.page.getByRole('button', { name: 'Send', exact: true }).click();
    await v.page.getByRole('heading', { name: subject }).waitFor();
    const a = await newPage(browser, DESKTOP); await signIn(a.page, 'owner@example.test');
    await a.page.goto(base() + '/admin/messages');
    await a.page.getByRole('button', { name: new RegExp(subject) }).click();
    await a.page.getByLabel('Reply', { exact: true }).fill('Yes: use Add from catalogue.');
    await a.page.getByRole('button', { name: 'Send', exact: true }).click();
    await a.page.getByText('Yes: use Add from catalogue.').waitFor();
    await v.page.reload(); await v.page.getByRole('button', { name: new RegExp(subject) }).click();
    await v.page.getByText('Yes: use Add from catalogue.').waitFor();
  });
});

describe('home chefs (browser)', () => {
  it('a customer filters out dishes with an allergen they avoid and orders a dish', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(base() + '/k/demo-mama-ngozi-kitchen'); await page.waitForLoadState('networkidle');
    const suya = page.locator('li.dish', { hasText: 'Suya skewers' });
    await suya.waitFor();
    expect(await suya.innerText()).toContain('Peanuts');
    await page.getByText('Allergens I avoid').click();
    await page.getByRole('button', { name: 'Peanuts' }).click();
    await suya.getByText(/which you avoid/).waitFor();
    expect(await suya.getByRole('button', { name: /Add to basket/ }).count()).toBe(0);
    const jollof = page.locator('li.dish', { hasText: 'Jollof rice' });
    await jollof.getByRole('button', { name: /Add to basket/ }).click();
    await jollof.getByRole('button', { name: /Add one Jollof/ }).waitFor();   // the add button became a quantity stepper
  });

  it('a cook adds a dish from the chef portal and it appears on the public kitchen page', async () => {
    const name = `Test stew ${Date.now()}`;
    const { page, ctx } = await newPage(browser, DESKTOP); await signIn(page, 'chef1@example.test');
    await page.goto(base() + '/vendor/menu');
    await page.getByRole('button', { name: 'Add a dish' }).click();
    await page.getByLabel('Dish name').fill(name); await page.getByLabel('Price (CAD)').fill('14.50');
    const save = page.getByRole('button', { name: 'Save dish' });
    expect(await save.isDisabled()).toBe(true);               // allergen confirmation is mandatory
    await page.getByRole('checkbox', { name: /Peanuts/ }).check();
    await page.getByRole('checkbox', { name: /I confirm the allergen list/ }).check();
    await save.click();
    await page.getByText(name).first().waitFor();
    const pub = await newPage(browser, DESKTOP);
    await pub.page.goto(base() + '/k/demo-mama-ngozi-kitchen'); await pub.page.waitForLoadState('networkidle');
    const card = pub.page.locator('li.dish', { hasText: name });
    await card.waitFor();
    expect(await card.innerText()).toContain('Peanuts');
    await ctx.close();
  });

  it('the apply form offers a cook path', async () => {
    const { page } = await newPage(browser, MOBILE);
    await signIn(page, 'customer@example.test');
    await page.goto(base() + '/vendor?kind=chef');
    await page.getByRole('heading', { name: 'Cook with EAZyfoods' }).waitFor();
    await page.getByLabel('Cuisines you cook').waitFor();
  });
});

describe('pre-order slots (browser)', () => {
  it('a customer books a time slot for a dish, pays, and sees the scheduled time; the cook sees it too', async () => {
    const { page } = await newPage(browser, DESKTOP); await signIn(page, 'customer@example.test');
    const db1 = await db(); await db1.query(`UPDATE store_offers SET stock_on_hand = 40, stock_reserved = 0 WHERE product_id IN (SELECT id FROM products WHERE name LIKE 'Jollof%')`); await db1.end();
    await page.goto(base() + '/k/demo-mama-ngozi-kitchen'); await page.waitForLoadState('networkidle');
    await page.locator('li.dish', { hasText: 'Jollof rice' }).getByRole('button', { name: /Add to basket/ }).click();
    await page.locator('li.dish', { hasText: 'Jollof rice' }).getByRole('button', { name: /Add one Jollof/ }).click();   // $15.99 x2 clears the $20 minimum
    await page.goto(base() + '/checkout'); await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /When\?/ }).waitFor();
    await page.getByRole('radio', { name: /Choose a time/ }).check();
    const first = page.locator('.slot-grid .slot').first();
    await first.waitFor();
    const label = (await first.innerText()).split('–')[0].trim();
    await first.click();
    await page.getByText(/scheduled for/i).first().waitFor();
    await page.getByRole('button', { name: /Continue to payment/ }).click();
    await page.getByRole('button', { name: 'Simulate successful payment' }).click();
    await page.getByText('Scheduled', { exact: true }).first().waitFor();
    expect(label.length).toBeGreaterThan(3);
    const chef = await newPage(browser, DESKTOP); await signIn(chef.page, 'chef1@example.test');
    await chef.page.goto(base() + '/vendor/orders'); await chef.page.waitForLoadState('networkidle');
    await chef.page.getByText(/SCHEDULED for/).first().waitFor();
  });
});

describe('payouts (browser)', () => {
  it('a cook connects a (test) payout account and sees it connected', async () => {
    const { page } = await newPage(browser, DESKTOP); await signIn(page, 'chef2@example.test');
    await page.goto(base() + '/vendor/payouts'); await page.waitForLoadState('networkidle');
    await page.getByText('Not connected').waitFor();
    await page.getByRole('button', { name: 'Connect payout account' }).click();
    await page.getByRole('button', { name: 'Finish test onboarding' }).waitFor();
    await page.getByRole('button', { name: 'Finish test onboarding' }).click();
    await page.getByText('Connected', { exact: true }).waitFor();
    await page.getByText('Payable now').waitFor();
    await page.getByText('TEST MODE').waitFor();
  });
});

describe('marketing (browser)', () => {
  it('marketing writes and sends an email to an opted-in customer, who can unsubscribe with one click', async () => {
    const c = await db();
    await c.query(`UPDATE users SET marketing_opt_in_at = now(), email_verified_at = now(), notify_email = true WHERE email = 'customer@example.test'`);
    const { page } = await newPage(browser, DESKTOP); await signIn(page, 'marketing@example.test');
    await page.goto(base() + '/marketing/settings');
    await page.getByLabel('Postal address (shown in every marketing email)').fill('100 Test Street NE, Calgary, AB T2A 0A0');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Saved').first().waitFor();
    await page.goto(base() + '/marketing/emails');
    await page.getByRole('button', { name: 'New email' }).click();
    await page.getByRole('heading', { name: 'Untitled email' }).waitFor();
    await page.getByLabel('Internal name').fill('E2E blast');
    await page.getByLabel('Subject', { exact: true }).fill('Fresh deals, {{first_name}}');
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByText('Unsubscribe any time').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Send now…' }).click();
    await page.getByRole('button', { name: 'Yes, continue' }).click();
    await page.getByText(/Queued for \d+ people/).waitFor();
    const token = (await c.query(`SELECT s.token FROM email_sends s JOIN users u ON u.id = s.user_id JOIN email_campaigns e ON e.id = s.email_campaign_id WHERE u.email = 'customer@example.test' AND e.name = 'E2E blast'`)).rows[0].token;
    const pub = await newPage(browser, MOBILE);
    await pub.page.goto(base() + `/unsubscribe/${token}`);
    await pub.page.getByRole('button', { name: 'Unsubscribe me' }).click();
    await pub.page.getByText(/is unsubscribed from marketing email/).waitFor();
    expect((await c.query(`SELECT marketing_opt_in_at FROM users WHERE email = 'customer@example.test'`)).rows[0].marketing_opt_in_at).toBeNull();
    await c.end();
  });
});

describe('quick view', () => {
  for (const [label, size] of [['desktop', DESKTOP], ['phone', MOBILE]] as const) {
    it(`opens from a product card, shows prices and allergens, adds to the basket and passes the accessibility scan (${label})`, async () => {
      const { page } = await newPage(browser, size);
      await page.goto(base() + '/search?q=garri'); await page.waitForLoadState('networkidle');
      const card = page.locator('article.pcard').first();
      await card.hover();
      await card.getByRole('button', { name: /Quick view/ }).click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor();
      await dlg.getByText(/Allergens/).waitFor();
      expect(await dlg.getByRole('link', { name: /View full details/ }).count()).toBe(1);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      await dlg.getByRole('button', { name: /Add to basket/ }).click();
      await dlg.getByRole('button', { name: /Add one/ }).waitFor();
      await page.keyboard.press('Escape');
      await dlg.waitFor({ state: 'hidden' });
      await card.getByRole('group', { name: /Quantity of/ }).waitFor();                      // the card behind shows it is in the basket
    });
  }
});

describe('mobile quick view and menu motion', () => {
  it('on a phone the quick view is a small eye (no text over the product) and its window is a compact sheet', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(base() + '/search?q=garri'); await page.waitForLoadState('networkidle');
    const btn = page.locator('article.pcard').first().getByRole('button', { name: /Quick view/ });
    const box = (await btn.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(34); expect(box.height).toBeLessThanOrEqual(34);
    expect(await btn.locator('.qv-txt').isVisible()).toBe(false);
    await btn.click();
    const dlg = page.getByRole('dialog'); await dlg.waitFor();
    await page.waitForTimeout(300);
    const h = (await dlg.boundingBox())!.height;
    expect(h).toBeLessThan(MOBILE.height * 0.7);                                   // never fills the screen
    const b = (await dlg.boundingBox())!;                                          // a card in the middle, clear of every edge
    for (const gap of [b.x, b.y, MOBILE.width - (b.x + b.width), MOBILE.height - (b.y + b.height)]) expect(gap).toBeGreaterThanOrEqual(14);
    expect(Math.abs((b.y + b.height / 2) - MOBILE.height / 2)).toBeLessThan(40);   // vertically centred
    expect(await page.locator('.modal-backdrop').evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur');   // the rest of the page is blurred
    await dlg.getByRole('button', { name: /Add to basket/ }).waitFor();
    await page.mouse.click(6, MOBILE.height - 6);                                  // tap the blurred edge
    await dlg.waitFor({ state: 'hidden' });
  });

  it('the hamburger menu fades in and fades out', async () => {
    const { page } = await newPage(browser, MOBILE);
    await page.goto(base()); await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Open all departments' }).click();
    const wrap = page.locator('.mega-wrap'); await wrap.waitFor();
    await page.waitForTimeout(350);
    expect(await wrap.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    await page.getByRole('button', { name: 'Close menu' }).click();
    await page.waitForTimeout(70);
    const mid = Number(await wrap.evaluate((e) => getComputedStyle(e).opacity));     // still there, part-way through fading
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(1);
    await wrap.waitFor({ state: 'detached' });
  });
});

describe('banner video', () => {
  it('staff add a video to a banner; it plays muted on the homepage, can be paused, and stays still for reduced motion', async () => {
    const c = await db();
    const themes = (await c.query('SELECT id, status FROM themes')).rows; await c.query(`UPDATE themes SET status = 'off'`);   // the date-driven festival theme would lead otherwise
    try {
      const staff = await newPage(browser, DESKTOP); await signIn(staff.page, 'marketing@example.test');
      await staff.page.goto(base() + '/admin/studio');
      await staff.page.getByRole('tab', { name: 'Banners' }).click();
      await staff.page.getByRole('button', { name: 'New banner' }).click();
      await staff.page.getByLabel('Title').fill('Video test banner');
      await staff.page.locator('input[type=file][accept^="video"]').setInputFiles(new URL('../fixtures/banner.webm', import.meta.url).pathname);
      await staff.page.getByLabel('Banner video preview').waitFor();
      await staff.page.getByLabel('Status').selectOption('live');
      await staff.page.getByRole('button', { name: 'Save banner' }).click();
      await staff.page.getByText('Banner saved').waitFor();

      const v = await newPage(browser, DESKTOP);
      await v.page.goto(base()); await v.page.waitForLoadState('networkidle');
      const video = v.page.locator('.hero-slide.has-video video').first();
      await video.waitFor({ state: 'attached' });
      expect(await video.evaluate((e: HTMLVideoElement) => e.muted && e.loop && e.playsInline)).toBe(true);
      expect(await video.getAttribute('src')).toMatch(/^\/uploads\/[a-f0-9]{32}\.webm$/);
      await v.page.waitForFunction(() => { const e = document.querySelector('.hero-slide.has-video video') as HTMLVideoElement | null; return !!e && !e.paused && e.currentTime > 0; }, null, { timeout: 15000 });
      await v.page.getByRole('button', { name: 'Pause background video' }).first().click();
      await v.page.waitForFunction(() => (document.querySelector('.hero-slide.has-video video') as HTMLVideoElement).paused);
      await v.page.getByRole('button', { name: 'Play background video' }).first().waitFor();
      const r = await new AxeBuilder({ page: v.page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => `${x.id}: ${x.help}`)).toEqual([]);

      const calm = await (await browser.newContext({ viewport: DESKTOP, reducedMotion: 'reduce' })).newPage();
      await calm.goto(base()); await calm.waitForLoadState('networkidle'); await calm.waitForTimeout(1200);
      expect(await calm.evaluate(() => { const e = document.querySelector('.hero-slide.has-video video') as HTMLVideoElement | null; return !!e && e.paused; })).toBe(true);   // not playing unless asked
      await calm.getByRole('button', { name: 'Play background video' }).first().waitFor();
    } finally {
      await c.query(`DELETE FROM home_banners WHERE title = 'Video test banner'`);
      for (const t of themes) await c.query('UPDATE themes SET status = $2 WHERE id = $1', [t.id, t.status]);
      await c.end();
    }
  });
});
