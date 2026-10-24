import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { bad } from '../lib/errors.js';
import { requireLogin } from '../lib/permissions.js';
import { rl } from '../lib/ratelimit.js';
import { requireFeature } from '../services/features.js';
import { giftView, startGiftPurchase } from '../services/giftcards.js';

const body = z.object({
  amount_cents: z.number().int().min(1000).max(50000),
  recipient_name: z.string().trim().max(80).nullish(),
  recipient_email: z.string().trim().email().max(254).nullish().or(z.literal('')),
  message: z.string().trim().max(300).nullish(),
});

/** Buy a gift card: $10 to $500, paid like an order. The code is created only after the payment is confirmed, and shown to the buyer (and emailed to the recipient if given). */
export const giftCardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireLogin);
  app.post('/gift-cards', rl(10, '1 hour'), async (req, reply) => {
    await requireFeature('shop.gift_cards');
    const key = String(req.headers['idempotency-key'] ?? '');
    if (key.length < 8 || key.length > 100) throw bad('idempotency_key_required', 'Missing Idempotency-Key header.');
    const b = body.parse(req.body);
    if (b.recipient_email && b.recipient_email.toLowerCase() === req.user!.email.toLowerCase()) throw bad('self_gift', 'That is your own email. Leave the recipient blank to keep the code for yourself.');
    const r = await startGiftPurchase(req.user!, { amountCents: b.amount_cents, recipientName: b.recipient_name, recipientEmail: b.recipient_email || null, message: b.message, idempotencyKey: key });
    return reply.code(201).send(r);
  });
  app.get<{ Params: { id: string } }>('/gift-cards/:id', async (req) => giftView(z.string().uuid().parse(req.params.id), req.user!.id));
};
