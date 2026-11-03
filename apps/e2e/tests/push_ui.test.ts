import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, newPage, seeText, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('notifications control', () => {
  it('shows in the customer account page and in the vendor portal, and the portal pages offer their own installable manifest', async () => {
    const c = await newPage(browser, { width: 390, height: 844 });
    await c.ctx.grantPermissions(['notifications'], { origin: base() });
    await signIn(c.page, 'customer@example.test');
    await c.page.goto(`${base()}/account`, { waitUntil: 'domcontentloaded' });
    await seeText(c.page.locator('[data-testid=push-toggle]'), 'Turn on notifications');

    const v = await newPage(browser, { width: 1280, height: 900 });
    await v.ctx.grantPermissions(['notifications'], { origin: base() });
    await signIn(v.page, 'owner1@example.test');
    await v.page.goto(`${base()}/vendor`, { waitUntil: 'domcontentloaded' });
    await seeText(v.page.locator('[data-testid=push-toggle]').first(), 'Turn on notifications');
    expect(await v.page.locator('link#app-manifest').getAttribute('href')).toBe('/manifest-vendor.webmanifest');
    const man = await (await fetch(`${base()}/manifest-vendor.webmanifest`)).json();
    expect(man.start_url).toBe('/vendor/'); expect(man.scope).toBe('/vendor/'); expect(man.display).toBe('standalone');
  }, 90_000);
});
