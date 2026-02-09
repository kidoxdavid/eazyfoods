-- Add store_id to meal_plans for single-store meal plan association
-- store_id references Store.id or Vendor.id (for vendors without stores) - no FK for flexibility
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS store_id UUID;
