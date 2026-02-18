-- Add ad_duration, ad_cost, payment_intent_id to marketing_ads
-- Run: psql $DATABASE_URL -f migrations/add_ad_payment_columns.sql

ALTER TABLE marketing_ads ADD COLUMN IF NOT EXISTS ad_duration VARCHAR(20);
ALTER TABLE marketing_ads ADD COLUMN IF NOT EXISTS ad_cost DECIMAL(10, 2);
ALTER TABLE marketing_ads ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);
