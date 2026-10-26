-- Settlements: approval for large payouts, payout holds, and an append-only trail of how finance handled reconciliation exceptions.
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_status_check CHECK (status IN ('awaiting_approval','pending','paid','failed','cancelled'));
ALTER TABLE payouts ADD COLUMN approved_by uuid REFERENCES users(id), ADD COLUMN approved_at timestamptz;

CREATE TABLE payout_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_type text NOT NULL CHECK (payee_type IN ('vendor','driver')),
  vendor_id uuid REFERENCES vendors(id),
  driver_id uuid REFERENCES drivers(id),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 300),
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid REFERENCES users(id), released_at timestamptz,
  CHECK ((payee_type = 'vendor') = (vendor_id IS NOT NULL) AND (payee_type = 'driver') = (driver_id IS NOT NULL))
);
CREATE INDEX payout_holds_active ON payout_holds(payee_type, vendor_id, driver_id) WHERE released_at IS NULL;

CREATE TABLE finance_exception_notes (
  id bigserial PRIMARY KEY,
  exception_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('acknowledged','resolved','note')),
  note text NOT NULL CHECK (char_length(note) BETWEEN 3 AND 500),
  actor_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_exception_notes_key ON finance_exception_notes(exception_key, id);
CREATE TRIGGER finance_exception_notes_append_only BEFORE UPDATE OR DELETE ON finance_exception_notes FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 0 = off. Above this, a payout waits for a second person (a user with payouts.approve who did not create it).
INSERT INTO app_settings(key, value) VALUES ('payout.approval_threshold_cents', '0') ON CONFLICT DO NOTHING;
