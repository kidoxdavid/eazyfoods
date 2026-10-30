import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { Browser, BrowserContext } from 'playwright-core';
import { base, launch, newPage, signIn } from '../helpers.js';
import { measure, VIEWPORTS, type Issue } from '../support/responsive.js';
import { seedSamples } from '../support/seed.js';

/**
 * The full responsive audit: every route of every app, at every width, with the page's own measurements.
 * It reports; it does not fail on findings (the everyday regression test in tests/responsive.test.ts is the strict one).
 * Run: QA_AUDIT=1 npx vitest run tests/exhaustive/responsive-audit.test.ts     Output: qa/results.json, docs/MOBILE_QA_REGISTER.md
 */
const QA = resolve(import.meta.dirname, '../../qa');
const SHOTS = resolve(QA, 'screenshots');
type Route = { app: string; route: string; url: string; dynamic: boolean; signedIn: boolean; email: string | null };
const routes: Route[] = JSON.parse(readFileSync(resolve(QA, 'routes.json'), 'utf8'));
type Row = { app: string; route: string; url: string; status: 'audited' | 'unresolved' | 'redirected'; landed?: string; issues: Record<string, Issue[]>; load: string[] };
const rows: Row[] = [];
let browser: Browser;
let samples: Record<string, string> = {};
beforeAll(async () => { browser = await launch(); mkdirSync(SHOTS, { recursive: true }); samples = await seedSamples(); console.log('SEEDED', Object.keys(samples).length, 'sample records'); }, 120_000);
afterAll(async () => { await browser?.close(); writeFileSync(resolve(QA, 'results.json'), JSON.stringify(rows, null, 1)); });

const apps = [...new Set(routes.map((r) => r.app))];
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';

for (const app of apps) {
  describe(`responsive audit: ${app}`, () => {
    it('every route at every width', async () => {
      const mine = routes.filter((r) => r.app === app);
      const email = mine.find((r) => r.email)?.email ?? null;
      // One signed-in browser state per app, one signed-out for the sign-in pages.
      let authState: Awaited<ReturnType<BrowserContext['storageState']>> | undefined;
      if (email) { const s = await newPage(browser); await signIn(s.page, email); authState = await s.ctx.storageState(); await s.ctx.close(); }
      const open = async (signed: boolean) => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: signed ? authState : undefined, hasTouch: false }); return { ctx, page: await ctx.newPage() }; };

      // Pass 1: the plain routes, and every address seen on them (to find the detail pages behind ":id" routes).
      const seen = new Set<string>();
      const concrete: { r: Route; url: string }[] = [];
      for (const r of mine.filter((x) => !x.dynamic)) concrete.push({ r, url: r.url });
      const probe = await open(true);
      for (const { r, url } of concrete.filter((c) => c.r.signedIn).slice(0, 60)) {
        await probe.page.goto(base() + url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {}); await probe.page.waitForTimeout(150);
        (await probe.page.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map((a) => (a as HTMLAnchorElement).getAttribute('href')!))).forEach((h) => seen.add(h.split('?')[0].split('#')[0]));
        void r;
      }
      await probe.ctx.close();
      for (const r of mine.filter((x) => x.dynamic)) {
        const re = new RegExp('^' + r.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]+/g, '[^/]+') + '$');
        const hit = samples[r.url] ?? [...seen].find((h) => re.test(h));
        if (hit) concrete.push({ r, url: hit }); else rows.push({ app, route: r.route, url: r.url, status: 'unresolved', issues: {}, load: ['no sample data to open this page with'] });
      }

      // Pass 2: audit, four pages at a time.
      const queue = [...concrete];
      const worker = async () => {
        const w = await open(true); const wv = await open(false);
        for (let item = queue.shift(); item; item = queue.shift()) {
          const { r, url } = item; const { page } = r.signedIn ? w : wv;
          const load: string[] = [];
          const onResp = (x: any) => { if (x.status() >= 500) load.push(`${x.status()} ${new URL(x.url()).pathname}`); };
          const onErr = (e: Error) => load.push(`script error: ${e.message.slice(0, 100)}`);
          page.on('response', onResp); page.on('pageerror', onErr);
          await page.setViewportSize({ width: 1280, height: 900 });
          await page.goto(base() + url, { waitUntil: 'networkidle', timeout: 30_000 }).catch((e) => load.push('did not load: ' + String(e.message).slice(0, 60)));
          await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} input[type="date"]::-webkit-datetime-edit,input[type="datetime-local"]::-webkit-datetime-edit,input[type="month"]::-webkit-datetime-edit{min-width:170px!important;display:inline-block}' }).catch(() => {});   // Safari on iPhone gives date fields a minimum width of their own: imitate it   // measure the settled layout, not a menu mid-slide
          await page.waitForTimeout(250);
          page.off('response', onResp); page.off('pageerror', onErr);
          const landed = new URL(page.url()).pathname;
          const issues: Record<string, Issue[]> = {};
          for (const v of VIEWPORTS) {
            await page.setViewportSize({ width: v.width, height: v.height }); await page.waitForTimeout(140);
            const found = await measure(page, v.width, v.height).catch(() => [] as Issue[]);
            if (found.length) issues[v.name] = found;
          }
          if ((issues['360'] ?? []).some((i) => i.severity === 'critical' || i.severity === 'high')) { await page.setViewportSize({ width: 360, height: 740 }); await page.screenshot({ path: resolve(SHOTS, `${app}-${slug(url)}-360.png`), fullPage: false }).catch(() => {}); }
          rows.push({ app, route: r.route, url, status: landed !== new URL(base() + url).pathname ? 'redirected' : 'audited', landed, issues, load });
        }
        await w.ctx.close(); await wv.ctx.close();
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      const crit = rows.filter((x) => x.app === app).flatMap((x) => Object.values(x.issues).flat()).filter((i) => i.severity === 'critical').length;
      console.log(`AUDIT ${app}: ${rows.filter((x) => x.app === app).length} routes, ${crit} critical findings`);
    }, 1_800_000);
  });
}
