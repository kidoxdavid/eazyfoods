-- Shopping lists (shareable), back-in-stock / price-drop alerts.
CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopping_lists_user ON shopping_lists(user_id);
CREATE TABLE shopping_list_items (
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, product_id)
);

CREATE TABLE product_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('back_in_stock','price_drop')),
  price_at_creation_cents int,
  active boolean NOT NULL DEFAULT true,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, kind)
);
CREATE INDEX product_alerts_active ON product_alerts(product_id) WHERE active;

INSERT INTO notification_templates(key, subject, body) VALUES
 ('product_alert', '{{headline}}', E'{{message}}\n\n{{web_url}}/p/{{slug}}\n\nYou asked us to tell you about this. You can remove alerts any time from your account: {{web_url}}/account');
