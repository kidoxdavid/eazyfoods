-- Restaurants sell through the same kitchen machinery as home cooks (stores.kind stays 'kitchen'); this says which sort of kitchen it is.
-- A restaurant's street address and phone are public; a home cook's never are.
ALTER TABLE stores ADD COLUMN kitchen_type text NOT NULL DEFAULT 'home' CHECK (kitchen_type IN ('home','restaurant'));
-- Menu sections ("Starters", "Mains"...) for dishes, and short videos for stores and dishes (uploaded through EAZyfoods only).
ALTER TABLE products ADD COLUMN menu_section text CHECK (menu_section IS NULL OR length(menu_section) BETWEEN 2 AND 40);
ALTER TABLE products ADD COLUMN video_url text;
ALTER TABLE stores ADD COLUMN video_url text;
INSERT INTO feature_flags(key, label, description, grp, enabled, sort) VALUES
  ('shop.restaurants', 'Restaurants', 'Show restaurants alongside home cooks and let restaurants take orders.', 'Food', true, 20),
  ('shop.vendor_videos', 'Vendor videos', 'Show videos that stores, cooks and restaurants upload to their pages.', 'Food', true, 21)
ON CONFLICT (key) DO NOTHING;
