-- Add third document URL for vendor and chef (3 documents required like driver)
-- Run: psql $DATABASE_URL -f migrations/add_third_document_vendor_chef.sql

-- Vendor: third document (government_id_url, business_registration_url already exist)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tax_permit_url VARCHAR(255);

-- Chef: third document (government_id_url, chef_certification_url exist; add business_permit_url)
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS business_permit_url VARCHAR(255);
