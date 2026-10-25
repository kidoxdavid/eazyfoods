-- Photos of the kitchen or store beyond the logo and cover (the Gallery page).
ALTER TABLE stores ADD COLUMN gallery text[] NOT NULL DEFAULT '{}';
