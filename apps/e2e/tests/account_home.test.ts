import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, db, launch, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('account: rewards, EAZY+ and the tidy list', () => {
  it('shows points and their value, starts the free trial once, redeems points for credit, and lists the things people come for', async () => {
    const c = await db(); const uid = (await c.query(`SELECT id FROM users WHERE email = 'customer@example.test'`)).rows[0].id;
    await c.query(`DELETE FROM memberships WHERE user_id = $1`, [uid]); await c.query(`DELETE FROM reward_points WHERE user_id = $1`, [uid]);
    await c.query(`INSERT INTO reward_points(user_id, delta, reason, note) VALUES ($1, 1240, 'adjust', 'test')`, [uid]); await c.end();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    await signIn(page, 'customer@example.test');
    await page.goto(`${base()}/account`, { waitUntil: 'networkidle' });
    const rw = page.getByRole('region', { name: 'EAZY Rewards' }); await rw.waitFor();
    expect(await rw.innerText()).toMatch(/1,240 pts[\s\S]*\$12\.40 in store credit[\s\S]*260 pts to your next \$15\.00 reward/);
    expect(await page.getByRole('progressbar', { name: /next reward/ }).getAttribute('aria-valuenow')).toBe('48');   // 240 of the 500 step
    // EAZY+ trial, once
    const plus = page.getByRole('region', { name: 'EAZY+' }); expect(await plus.innerText()).toMatch(/free for 30 days/);
    await plus.getByRole('button', { name: 'Try free' }).click(); await page.getByText(/EAZY\+ member/).waitFor();
    expect(await plus.getByRole('button', { name: 'Try free' }).count()).toBe(0);
    // redeem a step
    await rw.getByRole('button', { name: /Redeem 500 pts for \$5\.00/ }).click(); await page.getByText(/1,240 pts|740 pts/).first().waitFor({ timeout: 10_000 });
    await page.getByText('740 pts').waitFor();
    // the list
    const list = page.getByRole('navigation', { name: 'Your things' });
    for (const name of [/Buy again/, /Saved items/, /Group orders/, /Messages/]) expect(await list.getByRole('link', { name }).count()).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await page.screenshot({ path: '/tmp/account390.png' });
    await list.getByRole('link', { name: /Saved items/ }).click(); await page.waitForURL(/\/saved/);
    await ctx.close();
    const c2 = await db(); await c2.query(`DELETE FROM memberships WHERE user_id = $1`, [uid]); await c2.query(`DELETE FROM reward_points WHERE user_id = $1`, [uid]); await c2.end();
  }, 120_000);
});
