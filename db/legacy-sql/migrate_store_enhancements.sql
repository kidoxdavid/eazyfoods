-- Migration: Enhance vendors table with additional store profile fields
-- This adds fields for a more robust store profile that customers will see

-- Add new columns to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS store_gallery JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
ADD COLUMN IF NOT EXISTS store_tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Tags like 'african', 'caribbean', 'halal', 'organic'
ADD COLUMN IF NOT EXISTS store_features JSONB DEFAULT '{}'::jsonb, -- Features like {"halal": true, "kosher": false, "organic": true}
ADD COLUMN IF NOT EXISTS minimum_order_amount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS free_delivery_threshold DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS estimated_prep_time_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS payment_methods_accepted TEXT[] DEFAULT ARRAY['cash', 'card']::TEXT[],
ADD COLUMN IF NOT EXISTS return_policy TEXT,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}'::jsonb, -- {"facebook": "url", "instagram": "url", "twitter": "url"}
ADD COLUMN IF NOT EXISTS specialties TEXT[], -- Store specialties/cuisine types
ADD COLUMN IF NOT EXISTS store_banner_image_url VARCHAR(255), -- Banner image for store header
ADD COLUMN IF NOT EXISTS accepts_online_payment BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS accepts_cash_on_delivery BOOLEAN DEFAULT TRUE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_tags ON vendors USING GIN(store_tags);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN vendors.store_gallery IS 'Array of image URLs for store gallery';
COMMENT ON COLUMN vendors.store_tags IS 'Array of tags categorizing the store (e.g., african, caribbean, halal)';
COMMENT ON COLUMN vendors.store_features IS 'JSON object with store features (halal, kosher, organic, etc.)';
COMMENT ON COLUMN vendors.minimum_order_amount IS 'Minimum order amount required for delivery/pickup';
COMMENT ON COLUMN vendors.delivery_fee IS 'Standard delivery fee';
COMMENT ON COLUMN vendors.free_delivery_threshold IS 'Order amount threshold for free delivery (NULL if not applicable)';
COMMENT ON COLUMN vendors.estimated_prep_time_minutes IS 'Estimated preparation time in minutes';
COMMENT ON COLUMN vendors.payment_methods_accepted IS 'Array of accepted payment methods';
COMMENT ON COLUMN vendors.return_policy IS 'Store return policy text';
COMMENT ON COLUMN vendors.cancellation_policy IS 'Store cancellation policy text';
COMMENT ON COLUMN vendors.social_media_links IS 'JSON object with social media URLs';
COMMENT ON COLUMN vendors.specialties IS 'Array of store specialties/cuisine types';
COMMENT ON COLUMN vendors.store_banner_image_url IS 'Banner image URL for store header display';
COMMENT ON COLUMN vendors.accepts_online_payment IS 'Whether store accepts online payments';
COMMENT ON COLUMN vendors.accepts_cash_on_delivery IS 'Whether store accepts cash on delivery';

