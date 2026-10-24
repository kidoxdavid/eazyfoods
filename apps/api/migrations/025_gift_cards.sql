-- Gift cards customers can buy. Payment is taken like an order's; the code is created only once the payment is confirmed.
CREATE TABLE gift_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES users(id),
  amount_cents int NOT NULL CHECK (amount_cents BETWEEN 1000 AND 50000),
  recipient_name text CHECK (char_length(recipient_name) <= 80),
  recipient_email citext,
  message text CHECK (char_length(message) <= 300),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','failed')),
  code text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE (buyer_id, idempotency_key)
);
ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN gift_purchase_id uuid REFERENCES gift_purchases(id);
ALTER TABLE payments ADD CONSTRAINT payments_one_target CHECK ((order_id IS NOT NULL) <> (gift_purchase_id IS NOT NULL));
ALTER TABLE gift_codes ADD COLUMN purchase_id uuid REFERENCES gift_purchases(id);

INSERT INTO feature_flags(key, label, description, grp, sort) VALUES
 ('shop.gift_cards', 'Gift cards', 'Customers can buy a gift card for someone; the code arrives by email once payment is confirmed.', 'Checkout', 60);
INSERT INTO notification_templates(key, subject, body) VALUES
 ('gift_card_received', '{{from}} sent you an EAZyfoods gift card', E'{{from}} sent you a ${{amount}} gift card for EAZyfoods, African groceries from local stores.\n\n{{message}}\n\nYour code: {{code}}\n\nSign in, open Account → Store credit and enter the code. It can be used at checkout.\n{{web_url}}/credit'),
 ('gift_card_receipt', 'Your EAZyfoods gift card', E'Thank you. Your ${{amount}} gift card is ready.\n\nCode: {{code}}\n{{sent_to}}\n\nGift cards are not refundable. The code can be redeemed once, at {{web_url}}/credit');
