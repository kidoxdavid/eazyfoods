-- Marketing: consent evidence, segments, email campaigns with tracking, campaign groups, automations, social planner, budgets, asset library.
ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN
  ('customer','vendor_owner','vendor_staff','driver','owner','admin','support','finance','dispatcher','catalog','marketing'));

-- Evidence of consent (CASL): who agreed or withdrew, when, and where.
CREATE TABLE marketing_consent_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('opt_in','opt_out')),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_user ON marketing_consent_log(user_id, created_at);
INSERT INTO marketing_consent_log(user_id, action, source, created_at) SELECT id, 'opt_in', 'existing account setting', marketing_opt_in_at FROM users WHERE marketing_opt_in_at IS NOT NULL;

CREATE TABLE segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text,
  rules jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, objective text,
  starts_on date, ends_on date,
  budget_cents int NOT NULL DEFAULT 0 CHECK (budget_cents >= 0),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','finished','cancelled')),
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  theme_id uuid REFERENCES themes(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL, subject_b text, ab_percent_b int NOT NULL DEFAULT 50 CHECK (ab_percent_b BETWEEN 0 AND 100),
  body text NOT NULL,
  segment_id uuid REFERENCES segments(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at timestamptz, queued_at timestamptz,
  recipients int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE email_sends (
  id bigserial PRIMARY KEY,
  email_campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE,
  automation_id uuid,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant text NOT NULL DEFAULT 'a' CHECK (variant IN ('a','b')),
  token text NOT NULL UNIQUE,
  notification_id bigint REFERENCES notifications(id) ON DELETE SET NULL,
  first_clicked_at timestamptz, clicks int NOT NULL DEFAULT 0,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_campaign_id, user_id)
);
CREATE INDEX email_sends_user ON email_sends(user_id, created_at);

CREATE TABLE marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, subject text NOT NULL, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketing_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('welcome','winback','first_order_followup')),
  delay_days int NOT NULL DEFAULT 0 CHECK (delay_days BETWEEN 0 AND 365),
  subject text NOT NULL, body text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE automation_runs (
  automation_id uuid NOT NULL REFERENCES marketing_automations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (automation_id, user_id, created_at)
);

CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('instagram','facebook','tiktok','x','whatsapp','other')),
  caption text NOT NULL, image_url text, link text,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted')),
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketing_budgets (
  month date NOT NULL, channel text NOT NULL CHECK (channel IN ('email','ads','coupons','social','events','other')),
  budget_cents int NOT NULL CHECK (budget_cents >= 0),
  PRIMARY KEY (month, channel)
);
CREATE TABLE marketing_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  on_date date NOT NULL, channel text NOT NULL CHECK (channel IN ('email','ads','coupons','social','events','other')),
  amount_cents int NOT NULL CHECK (amount_cents > 0), note text,
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, url text NOT NULL, tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings(key, value) VALUES
 ('marketing.sender_name', '"EAZyfoods"'),
 ('marketing.postal_address', '""'),
 ('marketing.max_send_per_campaign', '5000');

-- Starter automations, all OFF, in plain words the team can edit. They only ever go to people who opted in.
INSERT INTO marketing_automations(name, trigger, delay_days, subject, body) VALUES
 ('Welcome email', 'welcome', 0, 'Welcome to EAZyfoods, {{first_name}}', E'Hi {{first_name}},\n\nThanks for joining EAZyfoods. Browse African groceries from local stores by region:\n{{link:/search}}\n\nSee this week''s deals:\n{{link:/deals}}'),
 ('Win-back after 30 days', 'winback', 30, 'We miss you, {{first_name}}', E'Hi {{first_name}},\n\nIt has been a while since your last order. Here is what is new:\n{{link:/new}}'),
 ('First-order follow-up', 'first_order_followup', 3, 'How was your first EAZyfoods order?', E'Hi {{first_name}},\n\nWe hope your first order arrived just right. If you want to order again:\n{{link:/orders}}');
