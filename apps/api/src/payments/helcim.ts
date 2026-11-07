import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import type { NormalizedEvent, PaymentProvider } from './provider.js';

/**
 * Helcim adapter (HelcimPay.js checkout).
 *
 * How it works, from Helcim's developer docs (devdocs.helcim.com):
 *  1. Our server calls POST {base}/helcim-pay/initialize with the api-token header. Helcim answers with a checkoutToken (public, goes to the browser) and a
 *     secretToken (private, we keep it). We ask Helcim to create an invoice with OUR unique invoice number, which is how a later transaction is matched
 *     back to our payment. Both tokens expire after 60 minutes.
 *  2. The browser loads https://secure.helcim.app/helcim-pay/services/start.js and calls appendHelcimPayIframe(checkoutToken). The card is typed into
 *     Helcim's iframe, so card numbers never touch our site or server.
 *  3. A result reaches us two ways, and both end in the same idempotent code: the browser posts the iframe's result to /api/payments/helcim/confirm
 *     (we check Helcim's SHA-256 hash with the secretToken, then read the transaction back from Helcim), and Helcim's webhook {id, type: "cardTransaction"}
 *     (we check its HMAC signature, then read the transaction back from Helcim). We never trust a browser or a webhook body for the amount or status.
 *
 * NOT YET VERIFIED against a Helcim developer test account: no credentials were available when this was written. Run the Helcim checklist in docs/PAYMENTS.md first.
 * Helcim has no marketplace "connect" product, so vendor payouts stay manual bank transfers (the platform's existing manual payout flow).
 */
export type HelcimOptions = { apiToken?: string; verifierToken?: string; baseUrl?: string; partnerToken?: string; refundIp?: string };

export class HelcimError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'HelcimError'; }
}

/** JSON the way Helcim hashes it: compact, with non-ASCII written as \uXXXX (Helcim's hash is over the PHP-style escaped text). */
export const helcimJson = (data: unknown, escapeSlashes = false) => {
  let s = JSON.stringify(data).replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  if (escapeSlashes) s = s.replace(/\//g, '\\/');
  return s;
};

/** Checks the hash Helcim returns with a HelcimPay.js result: sha256(JSON(data) + secretToken). */
export function verifyHelcimHash(data: unknown, hash: string, secretToken: string): boolean {
  const want = Buffer.from(String(hash).toLowerCase(), 'hex');
  if (want.length !== 32) return false;
  return [false, true].some((slashes) => {
    const got = createHash('sha256').update(helcimJson(data, slashes) + secretToken).digest();
    return timingSafeEqual(got, want);
  });
}

/** Helcim wants a 25 to 36 character idempotency key of letters, digits, - and _. Ours are UUIDs; anything else is turned into a stable key of that shape. */
const key = (base: string, suffix = '') => (/^[A-Za-z0-9_-]{25,36}$/.test(base) && !suffix ? base : ('ez' + createHash('sha256').update(base + suffix).digest('hex')).slice(0, 34));
const dollars = (cents: number) => Math.round(cents) / 100;
const toCents = (amount: unknown) => Math.round(Number(amount) * 100);

export class HelcimProvider implements PaymentProvider {
  readonly name = 'helcim' as const;
  private token: string; private verifier: string | undefined; private base: string; private partner: string | undefined; private refundIp: string;

  constructor(o: HelcimOptions = {}) {
    this.token = o.apiToken ?? config.HELCIM_API_TOKEN ?? '';
    this.verifier = o.verifierToken ?? config.HELCIM_WEBHOOK_VERIFIER;
    this.base = (o.baseUrl ?? config.HELCIM_API_BASE).replace(/\/$/, '');
    this.partner = o.partnerToken ?? config.HELCIM_PARTNER_TOKEN;
    this.refundIp = o.refundIp ?? config.HELCIM_REFUND_IP ?? '127.0.0.1';
    if (!this.token) throw new Error('HELCIM_API_TOKEN is required when PAYMENT_PROVIDER=helcim');
  }

  private async call(method: 'GET' | 'POST', path: string, body?: unknown, extra: Record<string, string> = {}): Promise<any> {
    const res = await fetch(this.base + path, {
      method, signal: AbortSignal.timeout(20_000),
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-token': this.token, ...(this.partner ? { 'partner-token': this.partner } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!res.ok) throw new HelcimError(res.status, typeof json?.errors === 'string' ? json.errors : json?.errors ? JSON.stringify(json.errors) : `Helcim answered ${res.status}`);
    return json;
  }

  async createPayment(a: { amountCents: number; currency: string; orderNumber: string; email: string; idempotencyKey: string }) {
    const invoiceNumber = 'EZ' + randomBytes(8).toString('hex').toUpperCase();   // unique, ours, and how the transaction is matched back to this payment
    const amount = dollars(a.amountCents);
    const r = await this.call('POST', '/helcim-pay/initialize', {
      paymentType: 'purchase', amount, currency: a.currency.toUpperCase(), paymentMethod: 'cc', confirmationScreen: false, language: 'en',
      invoiceRequest: { invoiceNumber, notes: `EAZyfoods ${a.orderNumber}`, lineItems: [{ description: `EAZyfoods ${a.orderNumber}`, quantity: 1, price: amount, total: amount }] },
    });
    if (!r?.checkoutToken || !r?.secretToken) throw new Error('Helcim did not return a checkout session');
    return { providerPaymentId: invoiceNumber, clientSecret: String(r.checkoutToken), providerSecret: String(r.secretToken) };
  }

  /** Helcim has nothing to cancel: an unused checkout token simply expires. */
  async cancelPayment(): Promise<void> { /* nothing to do */ }

  /** Reads a card transaction back from Helcim: the source of truth for amount and status. */
  async getTransaction(id: string | number): Promise<any> { return this.call('GET', `/card-transactions/${encodeURIComponent(String(id))}`); }

  /** Turns a Helcim transaction into our event. Only an approved purchase counts as a payment; a decline inside the modal lets the customer try another card. */
  eventFromTransaction(tx: any): NormalizedEvent {
    const id = String(tx?.transactionId ?? tx?.id ?? '');
    const approved = /^APPROV/i.test(String(tx?.status ?? '')) && String(tx?.type ?? '').toLowerCase() === 'purchase';
    return approved
      ? { id: `txn:${id}`, type: 'payment_succeeded', providerPaymentId: String(tx.invoiceNumber ?? ''), providerTransactionId: id, amountCents: toCents(tx.amount), raw: tx }
      : { id: `txn:${id}`, type: 'other', raw: tx };
  }

  async parseWebhook(raw: Buffer, headers: Record<string, string | string[] | undefined>): Promise<NormalizedEvent> {
    if (!this.verifier) throw new Error('HELCIM_WEBHOOK_VERIFIER is not set');
    const h = (n: string) => String(Array.isArray(headers[n]) ? headers[n]![0] : headers[n] ?? '');
    const id = h('webhook-id'), ts = h('webhook-timestamp'), sigs = h('webhook-signature').split(' ').filter(Boolean);
    if (!id || !ts || !sigs.length) throw new Error('missing webhook headers');
    if (!Number.isFinite(Number(ts)) || Math.abs(Date.now() / 1000 - Number(ts)) > 24 * 3600) throw new Error('webhook timestamp out of range');   // Helcim retries for up to ~10 hours
    const expected = createHmac('sha256', Buffer.from(this.verifier, 'base64')).update(`${id}.${ts}.${raw.toString('utf8')}`).digest();
    const ok = sigs.some((s) => {
      const [v, b64] = s.split(',');
      if (v !== 'v1' || !b64) return false;
      const got = Buffer.from(b64, 'base64');
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
    if (!ok) throw new Error('invalid webhook signature');
    const body = JSON.parse(raw.toString('utf8'));
    if (body?.type !== 'cardTransaction' || !body?.id) return { id: `evt:${id}`, type: 'other', raw: body };
    return this.eventFromTransaction(await this.getTransaction(body.id));
  }

  async refund(a: { providerPaymentId: string; amountCents: number; idempotencyKey: string; providerTransactionId?: string | null; originalAmountCents?: number }) {
    if (!a.providerTransactionId) throw new Error('This payment has no Helcim transaction id on file, so it cannot be refunded automatically. Refund it from the Helcim dashboard.');
    const originalTransactionId = Number(a.providerTransactionId);
    try {
      const r = await this.call('POST', '/payment/refund', { originalTransactionId, amount: dollars(a.amountCents), ipAddress: this.refundIp, ecommerce: true }, { 'idempotency-key': key(a.idempotencyKey) });
      return { providerRefundId: String(r?.transactionId ?? r?.id ?? '') };
    } catch (e) {
      // A charge that has not settled yet can usually only be reversed (voided), and only in full.
      if (a.originalAmountCents !== undefined && a.originalAmountCents === a.amountCents) {
        const r = await this.call('POST', '/payment/reverse', { cardTransactionId: originalTransactionId, ipAddress: this.refundIp, ecommerce: true }, { 'idempotency-key': key(a.idempotencyKey, ':reverse') });
        return { providerRefundId: String(r?.transactionId ?? r?.id ?? '') };
      }
      throw e;
    }
  }
}
