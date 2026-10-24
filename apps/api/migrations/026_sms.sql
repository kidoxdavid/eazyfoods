-- Text messages for order progress, only for people who asked for them (own phone number, own consent, recorded).
ALTER TABLE users ADD COLUMN sms_opt_in_at timestamptz;
CREATE TABLE sms_outbox (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  to_phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX sms_outbox_pending ON sms_outbox(status, id) WHERE status = 'pending';
INSERT INTO feature_flags(key, label, description, grp, sort) VALUES
 ('shop.sms', 'Text-message order updates', 'Customers who opt in get a text when their order is out for delivery or ready for pickup.', 'Site', 40);
