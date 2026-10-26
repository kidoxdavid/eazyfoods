-- Versioned, effective-dated, scoped pricing rules. One authoritative place for delivery fees, driver pay, commission and customer service fees.
CREATE TABLE pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('delivery','driver_pay','commission','service_fee')),
  scope_type text NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global','zone','store','vendor')),
  scope_id uuid,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  params jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','active','retired','rejected')),
  version int NOT NULL DEFAULT 1,
  effective_from timestamptz,
  effective_to timestamptz,
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_by uuid REFERENCES users(id), submitted_at timestamptz,
  approved_by uuid REFERENCES users(id), approved_at timestamptz,
  CHECK ((scope_type = 'global') = (scope_id IS NULL))
);
CREATE INDEX pricing_rules_lookup ON pricing_rules(kind, scope_type, scope_id, status, effective_from);

-- Append-only history of everything that happened to a rule.
CREATE TABLE pricing_rule_events (
  id bigserial PRIMARY KEY,
  rule_id uuid NOT NULL REFERENCES pricing_rules(id),
  action text NOT NULL,
  actor_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pricing_rule_events_rule ON pricing_rule_events(rule_id, id);
CREATE OR REPLACE FUNCTION pricing_rule_events_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'pricing_rule_events is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER pricing_rule_events_no_change BEFORE UPDATE OR DELETE ON pricing_rule_events FOR EACH ROW EXECUTE FUNCTION pricing_rule_events_immutable();

-- Coordinates for distance pricing (filled by a geocoding provider when one is configured; never guessed).
ALTER TABLE addresses ADD COLUMN lat numeric(9,6), ADD COLUMN lng numeric(9,6), ADD COLUMN geocoded_at timestamptz;

-- What was agreed at checkout, so later rule changes never alter an order already placed.
ALTER TABLE suborders ADD COLUMN pricing_snapshot jsonb;
ALTER TABLE deliveries ADD COLUMN pay_breakdown jsonb;

INSERT INTO app_settings(key, value) VALUES ('finance.require_second_approver', 'false') ON CONFLICT DO NOTHING;

-- Proposed starting profile (CAD). Created as DRAFTS: nothing is live until an administrator approves it. These are assumptions, not proven rates.
INSERT INTO pricing_rules(kind, scope_type, name, params, status, note) VALUES
('delivery', 'global', 'Proposed Calgary distance bands', '{"model":"distance_bands","bands":[{"up_to_km":3,"fee_cents":499},{"up_to_km":5,"fee_cents":599},{"up_to_km":8,"fee_cents":799},{"up_to_km":12,"fee_cents":999},{"up_to_km":15,"fee_cents":1199}],"max_distance_km":15,"over_max":"block","fallback":"zone_fee","straight_line_factor":1.3,"free_over_cents":null}', 'draft', 'Initial business assumption. Not validated for profitability.'),
('driver_pay', 'global', 'Proposed driver base pay by distance', '{"bands":[{"up_to_km":3,"base_cents":500},{"up_to_km":5,"base_cents":575},{"up_to_km":8,"base_cents":700},{"up_to_km":12,"base_cents":850},{"up_to_km":15,"base_cents":1000}],"unknown_distance_cents":500,"waiting":{"grace_minutes":5,"per_minute_cents":0,"max_cents":0},"additional_pickup_cents":0,"handling_cents":0}', 'draft', 'Initial business assumption. Waiting pay is off (0) until the arrival event is recorded and a rate is chosen.'),
('commission', 'global', 'Proposed default commission 12%', '{"bps":1200,"base":"after_discount","min_cents":0}', 'draft', 'Proposed default. Must match each vendor agreement before activation.');
