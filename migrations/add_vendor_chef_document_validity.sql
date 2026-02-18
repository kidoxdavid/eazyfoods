-- Document validity for vendor and chef (same expiry logic as driver)
-- Run: psql $DATABASE_URL -f migrations/add_vendor_chef_document_validity.sql

-- Vendor: optional validity dates for documents
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS government_id_validity TIMESTAMP;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_registration_validity TIMESTAMP;

-- Chef: optional validity dates for documents
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS government_id_validity TIMESTAMP;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS chef_certification_validity TIMESTAMP;
