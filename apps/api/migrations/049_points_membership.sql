-- EAZY Rewards: points earned on delivered orders, redeemed for store credit. EAZY+: a membership (a free trial for now) with free delivery over a minimum and bonus points.
CREATE TABLE reward_points (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason text NOT NULL CHECK (reason IN ('earn','redeem','adjust')),
  order_id uuid REFERENCES orders(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reward_points_user ON reward_points(user_id, created_at DESC);
CREATE UNIQUE INDEX reward_points_once ON reward_points(order_id) WHERE reason = 'earn';   -- an order earns points once
CREATE TABLE memberships (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('trial','active','ended','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL
);
INSERT INTO app_settings(key, value) VALUES
 ('rewards.points_per_dollar', '1'),
 ('rewards.points_per_credit_dollar', '100'),
 ('rewards.redeem_step_points', '500'),
 ('membership.trial_days', '30'),
 ('membership.free_delivery_min_cents', '3000'),
 ('membership.points_multiplier', '2'),
 ('membership.price_cents', '799');
INSERT INTO feature_flags(key, label, description, grp, sort) VALUES
 ('shop.points',     'EAZY Rewards points',  'Customers earn points on delivered orders and redeem them for store credit.',                           'Shop', 60),
 ('shop.membership', 'EAZY+ membership',     'A membership (free trial for now): free delivery over a minimum and bonus points.',                      'Shop', 70);
