-- A promotion a vendor creates for several products is one campaign (name, type, value) that expands into one sale price per product.
ALTER TABLE offer_promotions ADD COLUMN group_id uuid;
ALTER TABLE offer_promotions ADD COLUMN name text;
ALTER TABLE offer_promotions ADD COLUMN description text;
ALTER TABLE offer_promotions ADD COLUMN discount_type text CHECK (discount_type IN ('percentage','fixed'));
ALTER TABLE offer_promotions ADD COLUMN discount_value numeric(10,2);
