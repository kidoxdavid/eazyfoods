-- Stripe Connect for chefs & drivers
-- Run this in your PostgreSQL client (psql, pgAdmin, Render SQL).

ALTER TABLE chefs ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT FALSE;

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT FALSE;

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255);

