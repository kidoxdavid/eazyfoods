-- Add document validity columns to drivers table (run on Render PostgreSQL)
-- Execute via: psql $DATABASE_URL -f migrations/add_driver_document_validity.sql
-- Or paste into Render Dashboard > PostgreSQL > Shell

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_license_validity TIMESTAMP;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_registration_validity TIMESTAMP;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_validity TIMESTAMP;
