-- Driver tools: choose a navigation app, share live location while delivering, customers rate deliveries.
ALTER TABLE drivers ADD COLUMN nav_app text NOT NULL DEFAULT 'google' CHECK (nav_app IN ('google','apple','waze'));
ALTER TABLE drivers ADD COLUMN share_location boolean NOT NULL DEFAULT false;

-- Only the latest position of a delivery in progress, shown to that order's customer, and removed the moment the delivery ends.
CREATE TABLE delivery_locations (
  delivery_id uuid PRIMARY KEY REFERENCES deliveries(id) ON DELETE CASCADE,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  accuracy_m int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_ratings (
  delivery_id uuid PRIMARY KEY REFERENCES deliveries(id),
  user_id uuid NOT NULL REFERENCES users(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO feature_flags(key, label, description, grp, sort) VALUES
 ('driver.self_assign', 'Drivers can accept deliveries', 'Approved, available drivers can claim unassigned deliveries themselves (dispatch can still assign).', 'Drivers', 10),
 ('driver.live_location', 'Live driver location', 'Drivers who choose to can share their position while delivering, and the customer sees it on their order.', 'Drivers', 20),
 ('shop.rate_drivers', 'Customers rate deliveries', 'After a delivery, the customer can rate the driver.', 'Drivers', 30);
