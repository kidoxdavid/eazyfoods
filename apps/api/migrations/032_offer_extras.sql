-- Per-store product details a vendor manages themselves (kept on the offer, not the shared product).
ALTER TABLE store_offers ADD COLUMN track_expiry boolean NOT NULL DEFAULT false;
ALTER TABLE store_offers ADD COLUMN expiry_date date;
ALTER TABLE store_offers ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE store_offers ADD COLUMN is_newly_stocked boolean NOT NULL DEFAULT false;
-- Stock history is append-only and must outlive a listing: keep every row as written, and stop it from blocking the deletion of a product nobody ever ordered.
ALTER TABLE inventory_adjustments DROP CONSTRAINT inventory_adjustments_offer_id_fkey;
