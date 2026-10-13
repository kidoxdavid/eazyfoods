-- Stripe Connect: run this in your PostgreSQL client (psql, pgAdmin, or Render SQL)
-- Add columns if they don't exist (safe to run multiple times).

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255);
