-- Add cuisine_id to order_items for chef/cuisine orders
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS cuisine_id UUID REFERENCES cuisines(id);
