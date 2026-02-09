-- Add GPS routing and tracking fields to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS route_polyline TEXT,
ADD COLUMN IF NOT EXISTS route_distance_km DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS route_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS current_eta_minutes INTEGER,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;

-- Add index for faster queries on location updates
CREATE INDEX IF NOT EXISTS idx_deliveries_last_location_update ON deliveries(last_location_update);
CREATE INDEX IF NOT EXISTS idx_deliveries_status_location ON deliveries(status, current_latitude, current_longitude);

