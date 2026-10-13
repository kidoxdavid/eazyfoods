-- Add product_id column to reviews table to support product reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Add comment
COMMENT ON COLUMN reviews.product_id IS 'Product being reviewed (optional - can review vendor or product)';

