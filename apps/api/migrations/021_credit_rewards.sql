-- Store credit (rewards, referrals, gift codes), list reminders, abandoned-basket automation, help centre.

ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_account_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_account_check CHECK (account IN
  ('cash_provider','vendor_payable','commission_revenue','delivery_revenue','tax_payable','discount_expense','driver_payable','delivery_cost','refund_loss','tips_payable',
   'store_credit_liability','credit_expense'));

-- One customer wallet, append-only. The balance is the sum; it can never go below zero.
CREATE TABLE credit_entries (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  delta_cents int NOT NULL CHECK (delta_cents <> 0),
  kind text NOT NULL CHECK (kind IN ('grant','cashback','referral','gift_code','redeem','release','refund','adjust')),
  order_id uuid REFERENCES orders(id),
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_entries_user ON credit_entries(user_id, id DESC);
-- A reward is paid once per order and person, whatever happens (retries, double completion).
CREATE UNIQUE INDEX credit_reward_once ON credit_entries(user_id, kind, order_id) WHERE kind IN ('cashback','referral') AND order_id IS NOT NULL;

ALTER TABLE orders ADD COLUMN credit_cents int NOT NULL DEFAULT 0 CHECK (credit_cents >= 0);
ALTER TABLE orders ADD COLUMN credit_released boolean NOT NULL DEFAULT false;
ALTER TABLE refunds ADD COLUMN credit_cents int NOT NULL DEFAULT 0;

ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
CREATE TABLE referrals (
  referred_user uuid PRIMARY KEY REFERENCES users(id),
  referrer_user uuid NOT NULL REFERENCES users(id),
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referred_user <> referrer_user)
);

CREATE TABLE gift_codes (
  code text PRIMARY KEY,
  amount_cents int NOT NULL CHECK (amount_cents BETWEEN 100 AND 50000),
  note text,
  expires_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by uuid REFERENCES users(id),
  redeemed_at timestamptz
);

-- Programmes are OFF until the team decides to fund them.
INSERT INTO app_settings(key, value) VALUES
 ('rewards.cashback_bps', '0'),
 ('referral.reward_cents', '0'),
 ('referral.min_order_cents', '3000'),
 ('referral.max_per_user', '10');

-- "Remind me to restock": a shopping list the customer asked to be reminded about.
CREATE TABLE list_reminders (
  list_id uuid PRIMARY KEY REFERENCES shopping_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  every_days int NOT NULL CHECK (every_days BETWEEN 7 AND 90),
  next_at timestamptz NOT NULL
);
INSERT INTO notification_templates(key, subject, body) VALUES
 ('list_reminder', 'Time to restock? Your list “{{list}}”', E'You asked us to remind you about your shopping list “{{list}}”.\nAdd everything to your basket in one tap: {{web_url}}/lists/{{list_id}}\n\nChange or stop reminders on the list page.');

-- Abandoned basket: a nudge to opted-in customers who left items behind (OFF by default, once per week at most).
ALTER TABLE marketing_automations DROP CONSTRAINT marketing_automations_trigger_check;
ALTER TABLE marketing_automations ADD CONSTRAINT marketing_automations_trigger_check CHECK (trigger IN ('welcome','winback','first_order_followup','abandoned_basket'));
INSERT INTO marketing_automations(name, trigger, delay_days, subject, body) VALUES
 ('Left something in your basket', 'abandoned_basket', 0, 'You left something in your basket, {{first_name}}', E'Hi {{first_name}},\n\nYour basket is still waiting:\n{{link:/cart}}\n\nItems and prices are checked again at checkout.');

-- Help centre
INSERT INTO pages(slug, title, body, needs_legal_review) VALUES
 ('help-centre', 'Help centre', E'## Where is my order?\nOpen **Your orders** and tap the order. You will see where each store''s part is and, once a driver is on the way, their first name and an estimated arrival time. Estimates are not guarantees.\n\n## Something is missing, wrong or damaged\nOpen the order and choose **Report a problem** within 48 hours of delivery. See the refund policy for how we decide.\n\n## An item you ordered is not available\nBefore you pay, choose per item what the store should do: ask you first, swap for the closest match, or just refund it.\n\n## How do tips work?\nA tip goes 100% to the driver who delivers your order. If the delivery does not happen, it is refunded.\n\n## Store credit and gift codes\nStore credit is applied at checkout if you choose to use it. Gift codes are redeemed in **Account → Credit**. Credit has no cash value and cannot be withdrawn.\n\n## I need to change my address or cancel\nYou can cancel until the store accepts your order. After that, send us a message below.\n\n## Still stuck?\nUse the contact form at the bottom of this page.', true)
ON CONFLICT (slug) DO NOTHING;
