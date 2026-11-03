import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, newPage, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypmp42'), Buffer.alloc(2048)]);

describe('vendor ad designer: video upload', () => {
  it('uploads an MP4 and reports success', async () => {
    const { page } = await newPage(browser, { width: 1280, height: 900 });
    const alerts: string[] = [];
    page.on('dialog', async (d) => { alerts.push(d.message()); await d.accept(); });
    await signIn(page, 'owner1@example.test');
    await page.goto(`${base()}/vendor/ads/new`, { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type=file][accept*="video"]');
    await input.waitFor({ state: 'attached', timeout: 20_000 });
    await input.setInputFiles({ name: 'promo.mp4', mimeType: 'video/mp4', buffer: MP4 });
    await expect.poll(() => alerts.join('|'), { timeout: 15_000 }).toMatch(/Video uploaded successfully/);
    alerts.length = 0;
    // a phone recording: .mov, QuickTime type (the picker used to refuse it)
    expect(await input.getAttribute('accept')).toMatch(/video\/\*/);
    await input.setInputFiles({ name: 'IMG_0412.MOV', mimeType: 'video/quicktime', buffer: MP4 });
    await expect.poll(() => alerts.join('|'), { timeout: 15_000 }).toMatch(/Video uploaded successfully/);
    expect(alerts.join('|')).not.toMatch(/Failed/);
  }, 90_000);
});
