-- Add Stripe PaymentIntent ID to orders (for Stripe checkout).
-- Run once: psql -h localhost -U postgres -d easyfoods -f migrations/add_stripe_payment_intent_id.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
