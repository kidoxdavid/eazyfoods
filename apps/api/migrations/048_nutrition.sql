-- A Nutrition Facts panel for a product, per serving, as entered by the catalogue team from the pack (never guessed):
-- {"serving": "1/4 cup (45 g)", "calories": 160, "fat_g": 1, "sat_fat_g": 0, "trans_fat_g": 0, "carbs_g": 36, "fibre_g": 1, "sugars_g": 0, "protein_g": 3, "sodium_mg": 0}
ALTER TABLE products ADD COLUMN nutrition jsonb;
