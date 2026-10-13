-- Add is_featured and sort_order for recipes and meal plans (marketing/merchandising)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;
