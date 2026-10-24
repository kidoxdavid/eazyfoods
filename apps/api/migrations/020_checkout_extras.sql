-- Driver tips, per-item substitution preference, multi-buy pricing, gifting, product questions, review photos.

ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_account_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_account_check CHECK (account IN
  ('cash_provider','vendor_payable','commission_revenue','delivery_revenue','tax_payable','discount_expense','driver_payable','delivery_cost','refund_loss','tips_payable'));

-- Tips: held per delivery suborder, passed to the driver only once delivered, returned if the delivery never happens.
ALTER TABLE orders ADD COLUMN tip_cents int NOT NULL DEFAULT 0 CHECK (tip_cents BETWEEN 0 AND 10000);
ALTER TABLE orders ADD COLUMN is_gift boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN gift_message text CHECK (char_length(gift_message) <= 300);
ALTER TABLE suborders ADD COLUMN tip_cents int NOT NULL DEFAULT 0 CHECK (tip_cents >= 0);
ALTER TABLE suborders ADD COLUMN tip_refunded boolean NOT NULL DEFAULT false;
ALTER TABLE driver_earnings ADD COLUMN tip_cents int NOT NULL DEFAULT 0 CHECK (tip_cents >= 0);
ALTER TABLE refunds ADD COLUMN include_tip boolean NOT NULL DEFAULT false;
ALTER TABLE refunds ADD COLUMN tip_cents int NOT NULL DEFAULT 0;

-- What to do if an item is unavailable: swap for the closest match, ask first, or just refund it.
ALTER TABLE cart_items ADD COLUMN sub_pref text NOT NULL DEFAULT 'ask' CHECK (sub_pref IN ('closest','ask','refund'));
ALTER TABLE order_lines ADD COLUMN sub_pref text NOT NULL DEFAULT 'ask' CHECK (sub_pref IN ('closest','ask','refund'));

-- Multi-buy: "2 for $X each" style price breaks per offer. The best tier the quantity qualifies for sets the unit price.
CREATE TABLE offer_tiers (
  offer_id uuid NOT NULL REFERENCES store_offers(id) ON DELETE CASCADE,
  min_qty int NOT NULL CHECK (min_qty BETWEEN 2 AND 99),
  unit_price_cents int NOT NULL CHECK (unit_price_cents > 0),
  PRIMARY KEY (offer_id, min_qty)
);

CREATE TABLE product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  question text NOT NULL CHECK (char_length(question) BETWEEN 5 AND 400),
  answer text CHECK (char_length(answer) <= 1000),
  answered_by uuid REFERENCES users(id),
  answered_at timestamptz,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_questions_product ON product_questions(product_id, created_at DESC);

ALTER TABLE reviews ADD COLUMN photo_url text;
