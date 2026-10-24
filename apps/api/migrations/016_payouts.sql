-- Stripe Connect payout accounts, automatic payouts and kitchen hold period.
ALTER TABLE vendors
  ADD COLUMN payout_status text NOT NULL DEFAULT 'none' CHECK (payout_status IN ('none','pending','enabled','restricted')),
  ADD COLUMN payout_checked_at timestamptz,
  ADD COLUMN payout_requirements jsonb NOT NULL DEFAULT '[]';
-- An account id that finance already attached by hand counts as enabled.
UPDATE vendors SET payout_status = 'enabled' WHERE stripe_account_id IS NOT NULL;

ALTER TABLE payouts
  ADD COLUMN trigger text NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual','auto')),
  ADD COLUMN attempts int NOT NULL DEFAULT 0,
  ADD COLUMN paid_at timestamptz;
UPDATE payouts SET paid_at = created_at WHERE status = 'paid';

INSERT INTO app_settings(key, value) VALUES
 ('payout.hold_days_kitchen', '1'),
 ('payout.auto_enabled', 'false'),
 ('payout.auto_min_cents', '2000');

INSERT INTO notification_templates(key, subject, body) VALUES
 ('payout_paid', 'We sent you ${{amount}} CAD', E'A payout of ${{amount}} CAD for your completed orders was sent to your connected account.\n\nDetails and history: {{web_url}}/vendor/payouts\n\nIt can take a few business days to reach your bank, depending on your account.');
