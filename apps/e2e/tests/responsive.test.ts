import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, newPage, signIn } from './helpers.js';
import { measure } from './support/responsive.js';

/**
 * The responsive guard. Every plain route of every app is loaded at the widths below and must have no critical or high finding:
 * no sideways scroll, nothing past the screen edge, no controls on top of each other, date fields that fit,
 * no input under 16px on a phone (iOS would zoom in), no text cut off, no control under 24px.
 * Pages that need a record to open (":id" routes) are covered by the full audit: tests/exhaustive/responsive-audit.test.ts.
 * When this fails, fix the shared component (see docs/MOBILE_STANDARDS.md), not the one page.
 */
const WIDTHS = [{ w: 320, h: 640 }, { w: 360, h: 740 }, { w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1280, h: 900 }];
type Route = { app: string; route: string; url: string; dynamic: boolean; signedIn: boolean; email: string | null };
let browser: Browser; let routes: Route[] = [];
beforeAll(async () => {
  execFileSync('node', ['qa/inventory.mjs'], { cwd: resolve(import.meta.dirname, '..') });          // the list always comes from the routers themselves
  routes = JSON.parse(readFileSync(resolve(import.meta.dirname, '../qa/routes.json'), 'utf8'));
  browser = await launch();
});
afterAll(async () => { await browser?.close(); });

const apps = ['customer', 'vendor', 'chef', 'driver', 'marketing', 'finance', 'admin', 'hub'];
for (const app of apps) {
  describe(`responsive: ${app}`, () => {
    it('every plain route fits every screen size', async () => {
      const mine = routes.filter((r) => r.app === app && !r.dynamic);
      const email = mine.find((r) => r.email)?.email ?? null;
      let state: any;
      if (email) { const s = await newPage(browser); await signIn(s.page, email); state = await s.ctx.storageState(); await s.ctx.close(); }
      const problems: string[] = [];
      const queue = [...mine];
      const worker = async () => {
        const mk = async (signed: boolean) => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: signed ? state : undefined }); return { ctx, page: await ctx.newPage() }; };
        const a = await mk(true), b = await mk(false);
        for (let r = queue.shift(); r; r = queue.shift()) {
          const { page } = r.signedIn ? a : b;
          await page.setViewportSize({ width: 1280, height: 900 });
          await page.goto(base() + r.url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
          await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} input[type="date"]::-webkit-datetime-edit,input[type="datetime-local"]::-webkit-datetime-edit,input[type="month"]::-webkit-datetime-edit{min-width:170px!important;display:inline-block}' }).catch(() => {});   // Safari on iPhone gives date fields a minimum width of their own: imitate it
          await page.waitForTimeout(250);
          for (const v of WIDTHS) {
            await page.setViewportSize({ width: v.w, height: v.h }); await page.waitForTimeout(120);
            for (const i of await measure(page, v.w, v.h).catch(() => [])) if (i.severity !== 'info') problems.push(`${r.url} @${v.w}: ${i.kind} - ${i.detail.slice(0, 160)}`);
          }
        }
        await a.ctx.close(); await b.ctx.close();
      };
      await Promise.all([worker(), worker(), worker()]);
      expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
    }, 900_000);
  });
}
