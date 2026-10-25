-- The driver application and profile carry the details the original driver portal collected: address, vehicle, licence and the three documents.
ALTER TABLE drivers
  ADD COLUMN street_address text, ADD COLUMN city text, ADD COLUMN state text, ADD COLUMN postal_code text, ADD COLUMN country text NOT NULL DEFAULT 'Canada',
  ADD COLUMN vehicle_type text, ADD COLUMN vehicle_make text, ADD COLUMN vehicle_model text, ADD COLUMN vehicle_year text, ADD COLUMN vehicle_color text,
  ADD COLUMN license_plate text, ADD COLUMN driver_license_number text,
  ADD COLUMN preferred_delivery_zones text[] NOT NULL DEFAULT '{}', ADD COLUMN delivery_radius_km numeric(6,1),
  ADD COLUMN documents jsonb NOT NULL DEFAULT '{}'::jsonb;   -- { driver_license: {url, validity}, vehicle_registration: {...}, insurance: {...} }
ALTER TABLE deliveries ADD COLUMN photo_url text;   -- proof of delivery

-- Messages between a driver and the EAZyfoods team (the Chat page).
CREATE TABLE driver_messages (
  id bigserial PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  from_staff boolean NOT NULL,
  author_user_id uuid REFERENCES users(id),
  body text NOT NULL,
  read_by_other_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX driver_messages_driver ON driver_messages(driver_id, id);
