-- Add Google OAuth support: google_id column and nullable password_hash for customer, vendor, vendor_users, chef, driver.
-- Run this once against your database (local and production).

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL;

-- Vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE vendors ALTER COLUMN password_hash DROP NOT NULL;

-- Vendor users
ALTER TABLE vendor_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE vendor_users ALTER COLUMN password_hash DROP NOT NULL;

-- Chefs
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE chefs ALTER COLUMN password_hash DROP NOT NULL;

-- Drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE drivers ALTER COLUMN password_hash DROP NOT NULL;
