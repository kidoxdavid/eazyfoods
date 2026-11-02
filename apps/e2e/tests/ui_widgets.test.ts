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

describe('phone tab bar', () => {
  it('has six tabs (Products, not Search: search is at the top) that fit at every phone width', async () => {
    for (const w of [320, 360, 390, 430]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true }); const page = await ctx.newPage();
      await page.goto(`${base()}/`, { waitUntil: 'networkidle' });
      const tabs = await page.locator('nav.tabbar a').evaluateAll((a) => a.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: (e.textContent ?? '').trim(), sw: e.scrollWidth, cw: e.clientWidth }; }));
      console.log('TABS', JSON.stringify(tabs)); expect(tabs.length, `w=${w}`).toBe(6);
      for (let i = 0; i < tabs.length; i++) { expect(tabs[i].r, tabs[i].t).toBeLessThanOrEqual(w + 1); expect(tabs[i].sw, `${tabs[i].t} text fits`).toBeLessThanOrEqual(tabs[i].cw + 1); if (i) expect(tabs[i].l).toBeGreaterThanOrEqual(tabs[i - 1].r - 1); }
      const bar = await page.locator('nav.tabbar').evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, b: innerHeight - r.bottom, h: r.height, rad: parseFloat(getComputedStyle(e).borderTopLeftRadius), alpha: getComputedStyle(e).backgroundColor, blur: getComputedStyle(e).backdropFilter }; });
      expect(bar.l, 'floats clear of the left edge').toBeGreaterThanOrEqual(6); expect(w - bar.r, 'and the right').toBeGreaterThanOrEqual(6); expect(bar.b, 'and the bottom').toBeGreaterThanOrEqual(6); expect(bar.rad, 'fully rounded like a pill').toBeGreaterThanOrEqual(bar.h / 2 - 1); expect(w - (bar.r - bar.l), 'inset on both sides').toBeGreaterThanOrEqual(24); expect(Number((/[,\/]\s*([\d.]+)\)$/.exec(bar.alpha) ?? [0, 1])[1]), 'see-through').toBeLessThan(0.5); expect(bar.blur).toContain('blur');
      await page.locator('footer a').last().scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(200);
      const lastBottom = await page.evaluate(() => { const f = [...document.querySelectorAll('footer a, footer button, footer p')].filter((e) => (e as HTMLElement).offsetParent).map((e) => e.getBoundingClientRect()).sort((a, b) => b.bottom - a.bottom)[0]; const t = document.querySelector('nav.tabbar')!.getBoundingClientRect(); return t.top - f.bottom; });
      expect(lastBottom, 'the end of the page is not hidden behind the bar').toBeGreaterThanOrEqual(-1);
      if (w === 390) await page.screenshot({ path: '/tmp/pill390.png' });
      if (w === 320) await page.screenshot({ path: '/tmp/tabs320.png', clip: { x: 0, y: 720, width: 320, height: 80 } });
      expect(tabs.map((x) => x.t).join('|')).toContain('Products'); expect(tabs.map((x) => x.t).join('|')).not.toContain('Search');
      await ctx.close();
    }
  }, 120_000);
});

describe('basket button at the top right', () => {
  it('opens a preview first; View basket and Checkout go on from there; Escape closes it', async () => {
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      await signIn(page, 'customer@example.test');
      await page.goto(`${base()}/search?q=garri`, { waitUntil: 'networkidle' });
      if (await page.locator('.pcard .addbtn').count()) { await page.locator('.pcard .addbtn').first().click(); await page.waitForTimeout(800); }   // (earlier tests may already have put garri in the basket)
      await page.locator('button.hcart').click();
      const box = page.locator('#minicart'); await box.waitFor({ state: 'visible' });
      expect(page.url()).toContain('/search');                                             // it did not jump to the basket page
      const r = (await box.boundingBox())!; expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(w + 1);
      expect(await box.locator('li').count()).toBeGreaterThan(0);
      expect(await box.getByRole('link', { name: 'View basket' }).isVisible()).toBe(true); expect(await box.getByRole('link', { name: 'Checkout' }).isVisible()).toBe(true);
      await page.screenshot({ path: `/tmp/minicart${w}.png` });
      await page.keyboard.press('Escape'); expect(await box.isVisible()).toBe(false);
      await page.locator('button.hcart').click(); await box.getByRole('link', { name: 'View basket' }).click(); await page.waitForURL(/\/cart/);
      await ctx.close();
    }
  }, 120_000);
});

describe('the kitchen site', () => {
  it('chefs and restaurants have their own sign-in and registration address', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    // the shop's "Cook with us" leads there
    await page.goto(`${base()}/`, { waitUntil: 'networkidle' });
    expect(await page.locator('a', { hasText: 'Cook with us' }).first().getAttribute('href')).toBe('/kitchen');
    for (const where of ['footer']) {                         // clicking it (not typing the address) must open the kitchen site, not "page not found"
      await page.goto(`${base()}/`, { waitUntil: 'networkidle' });
      await page.locator(`${where} a`, { hasText: 'Cook with us' }).first().click({ force: true }); await page.waitForURL(/\/kitchen\/signin/);
      expect(await page.locator('body').innerText()).toContain('Kitchen Portal');
    }
    await page.goto(`${base()}/portals`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /^Chef/ }).first().click(); await page.waitForURL(/\/kitchen\/signin/);
    await page.goto(`${base()}/kitchen`, { waitUntil: 'networkidle' });
    await page.waitForURL(/\/kitchen\/signin/);
    expect(await page.locator('body').innerText()).toContain('Kitchen Portal');
    expect(await page.evaluate(() => document.documentElement.classList.contains('theme-chef'))).toBe(true);
    await page.screenshot({ path: '/tmp/kitchen-signin.png' });
    // a store account is turned away with a pointer to the store site
    await page.fill('input[name=email]', 'owner1@example.test'); await page.fill('input[name=password]', 'dev-password-123'); await page.click('button[type=submit]');
    await page.getByRole('alert').waitFor(); expect(await page.getByRole('alert').innerText()).toContain('store account');
    // a kitchen account goes in to the Kitchen portal
    await page.fill('input[name=email]', 'chef1@example.test'); await page.fill('input[name=password]', 'dev-password-123'); await page.click('button[type=submit]');
    await page.waitForURL(/\/vendor\/?$/); await page.locator('aside').getByText('eazyfoods Kitchen').first().waitFor();
    // signing out comes back to the kitchen sign-in, not the store one
    await page.setViewportSize({ width: 1280, height: 800 }); await page.getByRole('button', { name: /sign out/i }).first().click();
    await page.waitForURL(/\/kitchen\/signin/);
    // registration lives here too
    await page.getByRole('link', { name: /Register your kitchen/ }).click(); await page.waitForURL(/\/kitchen\/signup/);
    await page.getByText('Chef Registration').waitFor();
    await ctx.close();
  }, 120_000);
});

describe('star ratings on cards', () => {
  it('every card has a star row inside the details; rated items fill the stars; the card and picture sizes do not change', async () => {
    for (const w of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
      await page.route('**/api/search?*', async (route) => {            // give some results ratings, as real reviews would
        const res = await route.fetch(); const j = await res.json();
        (j.results ?? []).forEach((r: any, i: number) => { if (i % 3 === 0) { r.rating_avg = 4.3; r.rating_count = 12; } else if (i % 3 === 1) { r.rating_avg = 2.5; r.rating_count = 4; } });
        await route.fulfill({ response: res, json: j });
      });
      await page.goto(`${base()}/search?q=a`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
      const info = await page.evaluate(() => [...document.querySelectorAll('.pgrid .pcard')].map((c) => {
        const st = c.querySelector('.pmrow .stars') as HTMLElement | null; const card = c.getBoundingClientRect(), img = c.querySelector('.pimg')!.getBoundingClientRect(), body = c.querySelector('.pbody')!.getBoundingClientRect();
        const r = st?.getBoundingClientRect(); return { has: !!st, label: st?.getAttribute('aria-label') ?? '', inside: !!r && r.left >= card.left && r.right <= card.right + 0.5 && r.top >= img.bottom - 0.5 && r.bottom <= body.bottom + 0.5, h: Math.round(card.height), ih: Math.round(img.height), w: r ? r.width : 0 };
      }));
      expect(info.length).toBeGreaterThan(5);
      for (const c of info) { expect(c.has).toBe(true); expect(c.inside, `${c.label} sits in the details, below the picture`).toBe(true); expect(c.w).toBeGreaterThan(40); }
      expect(info.some((c) => /4\.3 out of 5/.test(c.label))).toBe(true); expect(info.some((c) => /Not rated yet/.test(c.label))).toBe(true);
      await page.addStyleTag({ content: '.pmrow .stars { display: none !important }' }); await page.waitForTimeout(100);
      const without = await page.evaluate(() => [...document.querySelectorAll('.pgrid .pcard')].map((c) => `${Math.round(c.getBoundingClientRect().height)}/${Math.round(c.querySelector('.pimg')!.getBoundingClientRect().height)}`));
      expect(info.map((c) => `${c.h}/${c.ih}`), 'adding the stars changes no card or picture size').toEqual(without);
      await page.addStyleTag({ content: '.pmrow .stars { display: inline-flex !important }' }); await page.waitForTimeout(100);
      await page.screenshot({ path: `/tmp/stars${w}.png`, clip: { x: 0, y: 150, width: Math.min(w, 760), height: 520 } });
      await ctx.close();
    }
  }, 120_000);
});

describe('store and kitchen ratings', () => {
  it('store and kitchen tiles carry a rating chip on the picture, the store page shows stars, and tile sizes do not change', async () => {
    for (const w of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
      const rate = (list: any[]) => list.forEach((r, i) => { if (i % 2 === 0) { r.rating_avg = 4.6; r.rating_count = 18; } });
      await page.route(/\/api\/(stores|kitchens)(\?.*)?$/, async (route) => { const res = await route.fetch(); const j = await res.json(); if (Array.isArray(j)) rate(j); await route.fulfill({ response: res, json: j }); });
      await page.route(/\/api\/stores\/[^/]+$/, async (route) => { const res = await route.fetch(); const j = await res.json(); j.rating_avg = 4.2; j.rating_count = 7; await route.fulfill({ response: res, json: j }); });
      for (const path of ['/stores', '/kitchens']) {
        await page.goto(`${base()}${path}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
        const tiles = await page.evaluate(() => [...document.querySelectorAll('.stile')].map((t) => { const c = t.querySelector('.stile-cover')!.getBoundingClientRect(), r = t.querySelector('.stile-rate')!.getBoundingClientRect(), s = t.querySelector('.stile-rate .stars') as HTMLElement; return { inside: r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom + 0.5, label: s.getAttribute('aria-label'), h: Math.round(t.getBoundingClientRect().height) }; }));
        expect(tiles.length, path).toBeGreaterThan(0);
        for (const t of tiles) expect(t.inside, `${path} chip sits on the picture`).toBe(true);
        expect(tiles.some((t) => /4\.6 out of 5/.test(t.label ?? ''))).toBe(true);
        await page.addStyleTag({ content: '.stile-rate { display: none !important }' }); await page.waitForTimeout(100);
        const without = await page.evaluate(() => [...document.querySelectorAll('.stile')].map((t) => Math.round(t.getBoundingClientRect().height)));
        expect(tiles.map((t) => t.h), `${path}: the chip changes no tile size`).toEqual(without);
        if (w === 390 && path === '/stores') { await page.addStyleTag({ content: '.stile-rate { display: inline-flex !important }' }); await page.screenshot({ path: '/tmp/storetile.png', clip: { x: 0, y: 120, width: 390, height: 420 } }); }
      }
      const link = await (async () => { await page.goto(`${base()}/stores`, { waitUntil: 'networkidle' }); return page.locator('a.stile').first().getAttribute('href'); })();
      await page.goto(`${base()}${link}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
      expect(await page.locator('.shead-body [aria-label*="4.2 out of 5"]').count()).toBe(1);
      if (w === 390) await page.screenshot({ path: '/tmp/storehead.png', clip: { x: 0, y: 100, width: 390, height: 460 } });
      await ctx.close();
    }
  }, 120_000);
});

describe('store tile is divided', () => {
  it('picture on top, details below, a smaller logo, rating chip on the picture', async () => {
    for (const w of [320, 390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
      for (const path of ['/stores', '/kitchens']) {
        await page.goto(`${base()}${path}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
        const r = await page.evaluate(() => [...document.querySelectorAll('.stile')].map((t) => {
          const tile = t.getBoundingClientRect(), cover = t.querySelector('.stile-cover')!.getBoundingClientRect(), body = t.querySelector('.stile-body')!.getBoundingClientRect();
          const logo = (t.querySelector('.stile-body > img, .stile-body .store-mark') as HTMLElement).getBoundingClientRect(), chip = t.querySelector('.stile-rate')!.getBoundingClientRect();
          return { divided: tile.height > cover.height + 40 && body.bottom > cover.bottom, logo: Math.round(logo.width), chipOnPicture: chip.left >= cover.left && chip.right <= cover.right && chip.bottom <= cover.bottom + 0.5 };
        }));
        expect(r.length, path).toBeGreaterThan(0);
        for (const t of r) { expect(t.divided, `${path} @${w}`).toBe(true); expect(t.logo).toBeLessThanOrEqual(38); expect(t.chipOnPicture).toBe(true); }
      }
      await ctx.close();
    }
  }, 120_000);
});
