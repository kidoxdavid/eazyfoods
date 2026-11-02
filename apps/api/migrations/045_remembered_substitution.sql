-- What a customer chose for an item if it is out of stock ("closest", "ask me", "refund") is remembered per product,
-- so the next time they put that product in the basket it starts with the same choice.
CREATE TABLE substitution_defaults (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sub_pref text NOT NULL CHECK (sub_pref IN ('closest','ask','refund')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
