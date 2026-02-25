-- Add optional attachment (picture/document) to support tickets from contact form
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) NULL;
