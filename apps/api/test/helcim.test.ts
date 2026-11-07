import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { addToCart, app, call, checkout, ledgerSum, newCustomer, openAllStores, setOffer, login } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { setProviderForTests } from '../src/payments/provider.js';
import { HelcimProvider, helcimJson, verifyHelcimHash } from '../src/payments/helcim.js';

const S1 = 'demo-calgary-west-african-market';
const API_TOKEN = 'test-api-token';
const VERIFIER = Buffer.from('test-verifier-secret').toString('base64');

/** A small stand-in for Helcim's API so the real code paths run end to end. It answers the way Helcim's documentation says Helcim does. */
const fake = { inits: [] as any[], txns: {} as Record<string, any>, refunds: [] as any[], reverses: [] as any[], failRefund: false, n: 0 };
let server: Server; let base = '';
const readBody = (req: any) => new Promise<string>((res) => { let b = ''; req.on('data', (c: any) => (b += c)); req.on('end', () => res(b)); });

beforeAll(async () => {
  await openAllStores();
  server = createServer(async (req, res) => {
    const send = (code: number, obj: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers['api-token'] !== API_TOKEN) return send(403, { errors: 'Unauthorized' });
    const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : null;
    const url = req.url ?? '';
    if (req.method === 'POST' && url === '/helcim-pay/initialize') { fake.inits.push(body); fake.n++; return send(200, { checkoutToken: `ck${String(fake.n).padStart(6, "0")}abcdef0123456789`, secretToken: `sk${String(fake.n).padStart(6, "0")}0123456789abcdef` }); }
    const m = /^\/card-transactions\/(\d+)$/.exec(url);
    if (req.method === 'GET' && m) return fake.txns[m[1]] ? send(200, fake.txns[m[1]]) : send(404, { errors: 'Transaction not found' });
    if (req.method === 'POST' && url === '/payment/refund') {
      const key = String(req.headers['idempotency-key'] ?? '');
      fake.refunds.push({ ...body, key });
      if (!/^[A-Za-z0-9_-]{25,36}$/.test(key)) return send(400, { errors: 'bad idempotency key' });
      if (fake.failRefund) return send(400, { errors: 'Transaction has not settled' });
      return send(200, { transactionId: 7000 + fake.refunds.length, status: 'APPROVED', type: 'refund', amount: body.amount });
    }
    if (req.method === 'POST' && url === '/payment/reverse') { fake.reverses.push({ ...body, key: String(req.headers['idempotency-key'] ?? '') }); return send(200, { transactionId: 8000 + fake.reverses.length, status: 'APPROVED', type: 'reverse' }); }
    return send(404, { errors: 'no such route' });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  setProviderForTests(new HelcimProvider({ apiToken: API_TOKEN, verifierToken: VERIFIER, baseUrl: base, refundIp: '203.0.113.9' }));
});
afterAll(async () => { setProviderForTests(undefined); await new Promise((r) => server.close(r)); });

async function basket() {
  const u = await newCustomer();
  await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 10), 2);
  await addToCart(u.cookie, await setOffer(S1, 'plantain-chips-salted', 1000, 10), 1);
  return u;
}
async function openOrder() {
  const u = await basket();
  const o = (await checkout(u.cookie, u.addressId)).body.order;
  const pay = (await pool.query('SELECT * FROM payments WHERE order_id = $1', [o.id])).rows[0];
  return { u, o, pay };
}
const txn = (id: string, pay: any, over: Record<string, unknown> = {}) => {
  fake.txns[id] = { transactionId: id, status: 'APPROVED', type: 'purchase', amount: (pay.amount_cents / 100).toFixed(2), currency: 'CAD', invoiceNumber: pay.provider_payment_id, cardType: 'MC', ...over };
  return fake.txns[id];
};
/** What the HelcimPay.js window hands the browser: the transaction data plus Helcim's hash over it. */
const iframeResult = (data: any, secret: string) => ({ data, hash: createHash('sha256').update(helcimJson(data) + secret).digest('hex') });
const signedWebhook = (body: object, id = 'msg_' + randomUUID(), ts = Math.floor(Date.now() / 1000), verifier = VERIFIER) => {
  const raw = JSON.stringify(body);
  const sig = createHmac('sha256', Buffer.from(verifier, 'base64')).update(`${id}.${ts}.${raw}`).digest('base64');
  return { payload: Buffer.from(raw), headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': `v1,${sig}` } as Record<string, string> };
};
const sendWebhook = (w: ReturnType<typeof signedWebhook>) => app.inject({ method: 'POST', url: '/api/webhooks/payments', payload: w.payload, headers: w.headers });
const getOrder = async (u: { cookie: string }, id: string) => (await call(u.cookie, 'GET', `/api/orders/${id}`)).body;

describe('Helcim: starting a payment', () => {
  it('opens a HelcimPay.js checkout for the exact server total with our own invoice number, and keeps the secret token to ourselves', async () => {
    const { u, o, pay } = await openOrder();
    expect(pay.provider).toBe('helcim');
    expect(pay.client_secret).toMatch(/^ck\d{6}[a-f0-9]{16}$/);                       // the public checkout token goes to the browser
    expect(pay.provider_secret).toMatch(/^sk\d{6}[a-f0-9]{16}$/);                     // the secret token stays on the server
    expect(pay.provider_payment_id).toMatch(/^EZ[0-9A-F]{16}$/);
    const init = fake.inits[fake.inits.length - 1];
    expect(init).toMatchObject({ paymentType: 'purchase', currency: 'CAD', paymentMethod: 'cc' });
    expect(Math.round(init.amount * 100)).toBe(o.total_cents);
    expect(init.invoiceRequest.invoiceNumber).toBe(pay.provider_payment_id);
    const view = await call(u.cookie, 'GET', `/api/orders/${o.id}/payment`);
    expect(JSON.stringify(view.body)).not.toContain(pay.provider_secret);
    expect(JSON.stringify(view.body)).toContain(pay.client_secret);
    expect((await call(null, 'GET', '/api/config')).body.payment_provider).toBe('helcim');
  });
});

describe('Helcim: the customer finishes in the card window (browser confirmation)', () => {
  it('a result with a valid hash, confirmed by reading the transaction back from Helcim, places the order exactly once', async () => {
    const { u, o, pay } = await openOrder();
    const data = txn('1001', pay);
    const r = await call(u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, ...iframeResult(data, pay.provider_secret) });
    expect(r.status).toBe(200); expect(r.body.status).toBe('confirmed'); expect(r.body.outcome).toBe('processed');
    const order = await getOrder(u, o.id);
    expect(order.payment_status).toBe('paid'); expect(order.status).toBe('placed');
    expect((await pool.query('SELECT status, provider_transaction_id FROM payments WHERE id = $1', [pay.id])).rows[0]).toEqual({ status: 'succeeded', provider_transaction_id: '1001' });
    expect(await ledgerSum(o.id, 'cash_provider')).toBe(o.total_cents);
    // pressing the button twice, or the webhook arriving afterwards, changes nothing
    const again = await call(u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, ...iframeResult(data, pay.provider_secret) });
    expect(again.body.duplicate).toBe(true);
    const hook = await (await sendWebhook(signedWebhook({ id: '1001', type: 'cardTransaction' }))).json();
    expect(hook.duplicate).toBe(true);
    expect(await ledgerSum(o.id, 'cash_provider')).toBe(o.total_cents);
  });

  it('refuses a result whose hash does not match, a result for someone else’s payment, and an unknown checkout', async () => {
    const { u, o, pay } = await openOrder();
    const data = txn('1002', pay);
    const forged = iframeResult({ ...data, amount: '0.01' }, pay.provider_secret);
    expect((await call(u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, data, hash: forged.hash })).status).toBe(400);
    expect((await call(u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, ...iframeResult(data, 'not-the-secret') })).status).toBe(400);
    const stranger = await newCustomer();
    expect((await call(stranger.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, ...iframeResult(data, pay.provider_secret) })).status).toBe(404);
    expect((await call(u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: 'ck-unknown', ...iframeResult(data, pay.provider_secret) })).status).toBe(404);
    expect((await call(null, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, ...iframeResult(data, pay.provider_secret) })).status).toBe(401);
    expect((await getOrder(u, o.id)).payment_status).not.toBe('paid');
  });

  it('does not trust the browser: a valid-looking hash for a transaction Helcim says was declined, or for a different invoice or amount, pays nothing', async () => {
    const a = await openOrder();
    const declined = txn('1003', a.pay, { status: 'DECLINED' });
    const r = await call(a.u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: a.pay.client_secret, ...iframeResult(declined, a.pay.provider_secret) });
    expect(r.body.status).toBe('not_approved');
    expect((await getOrder(a.u, a.o.id)).payment_status).not.toBe('paid');
    const b = await openOrder();
    const other = txn('1004', b.pay, { invoiceNumber: 'EZSOMEONEELSE000' });
    expect((await call(b.u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: b.pay.client_secret, ...iframeResult(other, b.pay.provider_secret) })).status).toBe(409);
    const c = await openOrder();
    const cheap = txn('1005', c.pay, { amount: '1.00' });
    const r3 = await call(c.u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: c.pay.client_secret, ...iframeResult(cheap, c.pay.provider_secret) });
    expect(r3.body.outcome).toBe('amount_mismatch');
    expect((await getOrder(c.u, c.o.id)).payment_status).not.toBe('paid');
  });
});

describe('Helcim: the webhook', () => {
  it('a correctly signed cardTransaction event is confirmed with Helcim and places the order; a repeat does nothing', async () => {
    const { u, o, pay } = await openOrder();
    txn('2001', pay);
    const w = signedWebhook({ id: '2001', type: 'cardTransaction' });
    const first = await (await sendWebhook(w)).json();
    expect(first.outcome).toBe('processed');
    expect((await getOrder(u, o.id)).payment_status).toBe('paid');
    expect((await pool.query('SELECT provider_transaction_id FROM payments WHERE id = $1', [pay.id])).rows[0].provider_transaction_id).toBe('2001');
    expect((await (await sendWebhook(w)).json()).duplicate).toBe(true);
  });

  it('rejects a forged or stale signature, a wrong verifier token and missing headers', async () => {
    const { pay } = await openOrder();
    txn('2002', pay);
    const good = signedWebhook({ id: '2002', type: 'cardTransaction' });
    expect((await sendWebhook({ ...good, headers: { ...good.headers, 'webhook-signature': 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' } })).statusCode).toBe(400);
    expect((await sendWebhook(signedWebhook({ id: '2002', type: 'cardTransaction' }, undefined, undefined, Buffer.from('another-verifier').toString('base64')))).statusCode).toBe(400);
    expect((await sendWebhook(signedWebhook({ id: '2002', type: 'cardTransaction' }, undefined, Math.floor(Date.now() / 1000) - 3 * 24 * 3600))).statusCode).toBe(400);   // far too old to be a Helcim retry
    expect((await app.inject({ method: 'POST', url: '/api/webhooks/payments', payload: good.payload, headers: { 'content-type': 'application/json' } })).statusCode).toBe(400);
    // a body that was changed after signing no longer matches
    expect((await sendWebhook({ payload: Buffer.from(JSON.stringify({ id: '2003', type: 'cardTransaction' })), headers: good.headers })).statusCode).toBe(400);
  });

  it('a decline does not cancel the order (the customer can try another card), and other event types are ignored', async () => {
    const { u, o, pay } = await openOrder();
    txn('2004', pay, { status: 'DECLINED' });
    const r = await (await sendWebhook(signedWebhook({ id: '2004', type: 'cardTransaction' }))).json();
    expect(r.outcome).toBe('ignored');
    const order = await getOrder(u, o.id);
    expect(order.status).toBe('pending_payment'); expect(order.payment_status).not.toBe('failed');
    expect((await (await sendWebhook(signedWebhook({ type: 'terminalCancel', data: { transactionAmount: 1 } }))).json()).outcome).toBe('ignored');
  });

  it('answers 502 (so Helcim retries later) when Helcim cannot be asked about the transaction yet', async () => {
    const { pay } = await openOrder(); void pay;
    const r = await sendWebhook(signedWebhook({ id: '999999', type: 'cardTransaction' }));   // the fake answers 404 for an unknown transaction
    expect(r.statusCode).toBe(502);
  });
});

describe('Helcim: refunds', () => {
  async function paid() {
    const { u, o, pay } = await openOrder();
    const data = txn(String(3000 + fake.n), pay);
    await call(u.cookie, 'POST', '/api/payments/helcim/confirm', { checkoutToken: pay.client_secret, ...iframeResult(data, pay.provider_secret) });
    return { u, o: await getOrder(u, o.id), pay, txId: data.transactionId as string };
  }

  it('a store rejection refunds the card through Helcim, naming the original transaction, with an idempotency key and an IP address, and the books net to zero', async () => {
    const { u, o, txId } = await paid();
    fake.failRefund = false; fake.refunds.length = 0;
    const owner = await login('owner1@example.test');
    const r = await call(owner.cookie, 'POST', `/api/vendor/suborders/${o.suborders[0].id}/reject`, { reason: 'Out of stock today' });
    expect(r.status).toBe(200);
    expect(fake.refunds).toHaveLength(1);
    expect(fake.refunds[0]).toMatchObject({ originalTransactionId: Number(txId), ipAddress: '203.0.113.9', ecommerce: true });
    expect(fake.refunds[0].amount).toBeCloseTo(o.total_cents / 100, 2);
    expect(fake.refunds[0].key).toMatch(/^[A-Za-z0-9_-]{25,36}$/);
    expect((await getOrder(u, o.id)).payment_status).toBe('refunded');
    expect(await ledgerSum(o.id, 'cash_provider')).toBe(0);
  });

  it('when Helcim will not refund a full amount (not settled yet) the charge is reversed instead', async () => {
    const { u, o } = await paid();
    fake.failRefund = true; fake.refunds.length = 0; fake.reverses.length = 0;
    const owner = await login('owner1@example.test');
    const r = await call(owner.cookie, 'POST', `/api/vendor/suborders/${o.suborders[0].id}/reject`, { reason: 'Out of stock today' });
    fake.failRefund = false;
    expect(r.status).toBe(200);
    expect(fake.refunds).toHaveLength(1); expect(fake.reverses).toHaveLength(1);
    expect(fake.reverses[0].ipAddress).toBe('203.0.113.9');
    expect((await getOrder(u, o.id)).payment_status).toBe('refunded');
  });
});

describe('Helcim: hashing helpers', () => {
  it('matches the example in Helcim’s documentation and escapes accented characters the way Helcim does', () => {
    const data = { amount: '1234', approvalCode: 'T355ST', avsResponse: 'X', cardBatchId: '123456789', cardHolderName: 'John Smith', cardType: 'MC', cardNumber: '4000000028', cardToken: 'abcdefghijkl1234567890', currency: 'CAD', customerCode: 'CST1234', cvvResponse: '', dateCreated: '2025-01-01 11:11:11', invoiceNumber: 'INV1234', status: 'APPROVAL', transactionId: '123456789', type: 'purchase', warning: '' };
    const hash = createHash('sha256').update(JSON.stringify(data) + 'sample-secret').digest('hex');
    expect(verifyHelcimHash(data, hash, 'sample-secret')).toBe(true);
    expect(verifyHelcimHash(data, hash, 'other-secret')).toBe(false);
    expect(verifyHelcimHash({ ...data, amount: '1' }, hash, 'sample-secret')).toBe(false);
    expect(helcimJson({ n: 'José' })).toBe('{"n":"Jos\\u00e9"}');
    expect(verifyHelcimHash({ n: 'José' }, createHash('sha256').update('{"n":"Jos\\u00e9"}' + 's').digest('hex'), 's')).toBe(true);
  });
});
