-- Migration: Add is_newly_stocked column to products table
-- Run this migration to add the is_newly_stocked field

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_newly_stocked BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN products.is_newly_stocked IS 'Mark product as newly stocked to show NEW badge on customer side';

