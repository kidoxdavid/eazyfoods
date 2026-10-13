-- Add bank account columns to chefs table for payout (same as vendors/drivers)
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);
