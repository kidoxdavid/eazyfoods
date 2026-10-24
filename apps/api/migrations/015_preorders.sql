-- Pre-order time slots: a store (typically a home kitchen) can let customers pick a later delivery/pickup slot.
ALTER TABLE stores
  ADD COLUMN preorders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN preorder_lead_minutes int NOT NULL DEFAULT 120 CHECK (preorder_lead_minutes BETWEEN 30 AND 2880),
  ADD COLUMN preorder_max_days int NOT NULL DEFAULT 7 CHECK (preorder_max_days BETWEEN 1 AND 14),
  ADD COLUMN slot_minutes int NOT NULL DEFAULT 60 CHECK (slot_minutes IN (30, 60, 90, 120)),
  ADD COLUMN slot_capacity int NOT NULL DEFAULT 3 CHECK (slot_capacity BETWEEN 1 AND 50);
UPDATE stores SET preorders_enabled = true WHERE kind = 'kitchen';

CREATE TABLE store_closures (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  on_date date NOT NULL,
  reason text,
  PRIMARY KEY (store_id, on_date)
);

ALTER TABLE suborders ADD COLUMN scheduled_for timestamptz, ADD COLUMN scheduled_until timestamptz;
CREATE INDEX suborders_slot ON suborders(store_id, scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Any migration that adds columns to `stores` must recreate this view (see 008).
DROP VIEW storefronts;
CREATE VIEW storefronts AS
SELECT s.*,
       (s.status = 'published' AND v.status = 'approved') AS orderable,
       EXISTS (
         SELECT 1 FROM store_hours h
          WHERE h.store_id = s.id
            AND h.dow = EXTRACT(DOW FROM (now() AT TIME ZONE s.timezone))
            AND (now() AT TIME ZONE s.timezone)::time >= h.opens
            AND (now() AT TIME ZONE s.timezone)::time <  h.closes
       ) AS is_open
  FROM stores s JOIN vendors v ON v.id = s.vendor_id;
