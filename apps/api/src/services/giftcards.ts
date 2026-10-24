import type { PoolClient } from 'pg';
import { pool, type After } from '../db/pool.js';
import { HttpError, notFound } from '../lib/errors.js';
import { getProvider } from '../payments/provider.js';
import { giftCode, newCode } from './credit.js';
import { post } from './ledger.js';
import { notify } from './notify.js';

export type GiftInput = { amountCents: number; recipientName?: string | null; recipientEmail?: string | null; message?: string | null; idempotencyKey: string };

/** Start paying for a gift card. The code does not exist until the payment is confirmed. Same key twice returns the same purchase. */
export async function startGiftPurchase(user: { id: string; email: string }, input: GiftInput) {
  const existing = (await pool.query('SELECT id FROM gift_purchases WHERE buyer_id = $1 AND idempotency_key = $2', [user.id, input.idempotencyKey])).rows[0];
  const id: string = existing?.id ?? (await pool.query(
    `INSERT INTO gift_purchases(buyer_id, amount_cents, recipient_name, recipient_email, message, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [user.id, input.amountCents, input.recipientName || null, input.recipientEmail || null, input.message || null, input.idempotencyKey])).rows[0].id;
  if (!(await pool.query('SELECT 1 FROM payments WHERE gift_purchase_id = $1', [id])).rowCount) {
    try {
      const provider = getProvider();
      const pay = await provider.createPayment({ amountCents: input.amountCents, currency: 'CAD', orderNumber: `GC-${newCode(6)}`, email: user.email, idempotencyKey: `gift:${id}` });
      await pool.query(`INSERT INTO payments(gift_purchase_id, provider, provider_payment_id, amount_cents, client_secret, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, provider.name, pay.providerPaymentId, input.amountCents, pay.clientSecret, `gift:${id}`]);
    } catch (e) {
      await pool.query(`UPDATE gift_purchases SET status = 'failed' WHERE id = $1`, [id]);
      console.error('gift card payment error', e);
      throw new HttpError(502, 'payment_unavailable', 'We could not start your payment. You have not been charged. Please try again in a moment.');
    }
  }
  return giftView(id, user.id);
}

export async function giftView(id: string, userId: string) {
  const g = (await pool.query('SELECT * FROM gift_purchases WHERE id = $1 AND buyer_id = $2', [id, userId])).rows[0];
  if (!g) throw notFound('Gift card not found');
  const p = (await pool.query('SELECT provider, client_secret, status FROM payments WHERE gift_purchase_id = $1 ORDER BY created_at DESC LIMIT 1', [id])).rows[0];
  return {
    id: g.id, amount_cents: g.amount_cents, status: g.status, recipient_name: g.recipient_name, recipient_email: g.recipient_email,
    code: g.status === 'paid' ? g.code : null,                    // only the buyer, only after payment
    payment: g.status === 'pending_payment' && p ? { provider: p.provider, client_secret: p.client_secret } : null,
  };
}

/** Payment confirmed (called from the webhook transaction): make the code, book the money as owed to customers, tell the people. Idempotent. */
export async function onGiftPaid(c: PoolClient, after: After, payment: { id: string; gift_purchase_id: string }) {
  const g = (await c.query('SELECT g.*, u.email AS buyer_email, u.full_name AS buyer_name FROM gift_purchases g JOIN users u ON u.id = g.buyer_id WHERE g.id = $1 FOR UPDATE OF g', [payment.gift_purchase_id])).rows[0];
  if (g.status === 'paid') return 'already_paid';
  await c.query(`UPDATE payments SET status = 'succeeded' WHERE id = $1`, [payment.id]);
  let code = '';
  for (let i = 0; i < 5 && !code; i++) {
    const cand = giftCode();
    const r = await c.query(`INSERT INTO gift_codes(code, amount_cents, note, created_by, purchase_id) VALUES ($1,$2,'purchased',$3,$4) ON CONFLICT DO NOTHING RETURNING code`, [cand, g.amount_cents, g.buyer_id, g.id]);
    if (r.rowCount) code = cand;
  }
  await c.query(`UPDATE gift_purchases SET status = 'paid', paid_at = now(), code = $2 WHERE id = $1`, [g.id, code]);
  // Cash came in, and it is owed to whoever redeems the card: a liability, not revenue.
  await post(c, 'gift_card_sold', { type: 'gift_purchase', id: g.id }, [{ account: 'cash_provider', amount: g.amount_cents }, { account: 'store_credit_liability', amount: -g.amount_cents }]);
  const amount = (g.amount_cents / 100).toFixed(2);
  after.push(async () => {
    await notify(pool, { userId: g.buyer_id, email: g.buyer_email, template: 'gift_card_receipt', vars: { amount, code, sent_to: g.recipient_email ? `We also emailed it to ${g.recipient_email}.` : 'Share the code with the person you are giving it to.' } });
    if (g.recipient_email) await notify(pool, { email: g.recipient_email, template: 'gift_card_received', vars: { amount, code, from: g.buyer_name.split(' ')[0], message: g.message ?? '' } });
  });
  return 'processed';
}

export async function onGiftFailed(c: PoolClient, payment: { id: string; gift_purchase_id: string }, message?: string) {
  await c.query(`UPDATE payments SET status = 'failed', failure_message = $2 WHERE id = $1`, [payment.id, message ?? null]);
  await c.query(`UPDATE gift_purchases SET status = 'failed' WHERE id = $1 AND status = 'pending_payment'`, [payment.gift_purchase_id]);
  return 'processed';
}
