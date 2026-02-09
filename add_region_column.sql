-- Add region column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- Add comment
COMMENT ON COLUMN vendors.region IS 'African region: West African, East African, North African, Central African, South African';
