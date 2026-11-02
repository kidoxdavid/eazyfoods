import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'playwright-core';
import { base, launch, setOffer, signIn } from './helpers.js';

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

describe('order chat (browser)', () => {
  it('the customer writes from the order page, the store replies from its portal, and each sees it without reloading', async () => {
    let orderId: string | undefined;
    await setOffer('demo-calgary-west-african-market', 'garri-white', 2000, 50);
    const host = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const cp = await host.newPage();
    await cp.addInitScript(() => { try { localStorage.setItem('ez_live', '1'); } catch { /* */ } });
    await signIn(cp, 'customer@example.test');
    // a paid order for the customer, made through the API so the test stays about the chat
    orderId = await cp.evaluate(async () => {
      const j = async (m: string, u: string, b?: unknown, h: Record<string, string> = {}) => (await fetch(u, { method: m, credentials: 'include', headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined })).json();
      const addr = await j('POST', '/api/addresses', { recipient_name: 'Test Buyer', phone: '5875550100', line1: '1 Test St', city: 'Calgary', postal_code: 'T2A0A1' });
      const hit = (await j('GET', '/api/stores/demo-calgary-west-african-market')).products.find((p: any) => p.slug === 'garri-white');
      await j('PUT', `/api/cart/items/${hit.offer_id}`, { quantity: 3 });
      const c = await j('POST', '/api/checkout', { address_id: addr.id, method: 'delivery' }, { 'idempotency-key': crypto.randomUUID() });
      if (!c.order) throw new Error('CHECKOUT ' + JSON.stringify(c).slice(0, 400));
      await j('POST', `/api/dev/orders/${c.order.id}/simulate-payment`, { outcome: 'succeeded' });
      return c.order.id as string;
    });
    expect(orderId).toBeTruthy();
    await cp.goto(`${base()}/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    await cp.getByText(/^Message /).first().click();
    await cp.getByLabel(/^Message to /).fill('Please leave it at the back door.'); await cp.getByRole('button', { name: 'Send' }).click();
    await cp.locator('.ochat-msg:visible', { hasText: 'Please leave it at the back door.' }).first().waitFor();
    // the store sees it in the order, and replies
    const sp = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await sp.addInitScript(() => { try { localStorage.setItem('ez_live', '1'); } catch { /* */ } });
    await signIn(sp, 'owner1@example.test');
    const sub = await cp.evaluate(async (id) => (await (await fetch(`/api/orders/${id}`)).json()).suborders[0].id as string, orderId);
    await sp.goto(`${base()}/vendor/orders/${sub}`, { waitUntil: 'domcontentloaded' });
    await sp.getByText('Please leave it at the back door.').waitFor();
    await sp.getByLabel('Message to the customer').fill('Sure, no problem!'); await sp.getByRole('button', { name: 'Send' }).click();
    // the customer sees the reply without reloading
    await cp.waitForFunction(() => [...document.querySelectorAll('.ochat-msg')].some((e) => (e as HTMLElement).offsetParent !== null && (e.textContent ?? '').includes('Sure, no problem!')), null, { timeout: 30_000 });
    await host.close();
  }, 150_000);
});
