-- Web push: one row per device (browser or home-screen app) a person turned notifications on for.
-- "area" is which app they enabled it in (shop, vendor, driver, admin, marketing, finance, kitchen), so a store's phone gets store alerts and a customer phone gets order updates.
CREATE TABLE push_subscriptions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  area text NOT NULL DEFAULT 'shop',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  failures int NOT NULL DEFAULT 0
);
CREATE INDEX push_subscriptions_user ON push_subscriptions(user_id, area);
