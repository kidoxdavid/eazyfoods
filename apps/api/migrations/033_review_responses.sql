-- A store can answer a review, mark reviews as read, and report one that breaks the rules (our team then decides).
ALTER TABLE reviews ADD COLUMN vendor_response text CHECK (vendor_response IS NULL OR char_length(vendor_response) <= 1000);
ALTER TABLE reviews ADD COLUMN vendor_response_at timestamptz;
ALTER TABLE reviews ADD COLUMN read_by_vendor_at timestamptz;
ALTER TABLE reviews ADD COLUMN vendor_report_reason text;
ALTER TABLE reviews ADD COLUMN vendor_reported_at timestamptz;
