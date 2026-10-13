-- Migration: Add customer support functionality to support_messages table
-- This allows customers to submit contact messages that appear in admin support

-- Make vendor_id nullable (for customer messages)
ALTER TABLE support_messages 
ALTER COLUMN vendor_id DROP NOT NULL;

-- Add customer_id column
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add message_type column to distinguish vendor vs customer messages
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'vendor';

-- Update existing records to have message_type = 'vendor'
UPDATE support_messages 
SET message_type = 'vendor' 
WHERE message_type IS NULL;

-- Make vendor_user_id nullable (not needed for customer messages)
ALTER TABLE support_messages 
ALTER COLUMN vendor_user_id DROP NOT NULL;

-- Add index for customer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_support_messages_customer_id ON support_messages(customer_id);

-- Add index for message_type for filtering
CREATE INDEX IF NOT EXISTS idx_support_messages_message_type ON support_messages(message_type);

