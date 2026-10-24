-- Home kitchens: a chef is a vendor (kind 'chef') whose store (kind 'kitchen') sells dishes. Orders, payments, refunds,
-- delivery and messaging are the shared machinery; only the catalogue side differs.
ALTER TABLE vendors ADD COLUMN kind text NOT NULL DEFAULT 'store' CHECK (kind IN ('store','chef'));
ALTER TABLE stores  ADD COLUMN kind text NOT NULL DEFAULT 'grocery' CHECK (kind IN ('grocery','kitchen')),
                    ADD COLUMN cuisines text[] NOT NULL DEFAULT '{}';

-- Dishes live in `products` with their own status so that every existing grocery query (status = 'published') ignores them.
ALTER TABLE products DROP CONSTRAINT products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('draft','pending','published','archived','dish_live'));
ALTER TABLE products
  ADD COLUMN owner_store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  ADD COLUMN cuisine text,
  ADD COLUMN spice_level smallint CHECK (spice_level BETWEEN 0 AND 3),
  ADD COLUMN serves text,
  ADD COLUMN prep_minutes int CHECK (prep_minutes BETWEEN 5 AND 1440),
  ADD COLUMN dish_tags text[] NOT NULL DEFAULT '{}',          -- declared by the cook (halal, vegan...). Not verified by EAZyfoods.
  ADD CONSTRAINT dish_has_owner CHECK ((status = 'dish_live') = false OR owner_store_id IS NOT NULL);
CREATE INDEX products_owner_store ON products(owner_store_id) WHERE owner_store_id IS NOT NULL;

ALTER TABLE vendor_documents DROP CONSTRAINT vendor_documents_kind_check;
ALTER TABLE vendor_documents ADD CONSTRAINT vendor_documents_kind_check CHECK (kind IN ('business_licence','gst_registration','food_premises_permit','food_handler_cert','id','other'));

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

INSERT INTO app_settings(key, value) VALUES ('kitchens.enabled', 'true');

INSERT INTO pages(slug, title, body, needs_legal_review) VALUES
 ('home-kitchen-rules', 'Rules for home kitchens', E'DRAFT. This page must be reviewed by a qualified professional before real cooks sell food.\n\n## Permits\nSelling prepared food in Alberta generally requires an approved food premises permit and food-handler training. A cook cannot go live until the permit and certificate are uploaded and verified by our team. Verification confirms the documents look genuine; it is not legal advice and does not replace the cook''s own obligations.\n\n## Allergens\nEvery dish must list its allergens. Allergen and dietary labels are declared by the cook and are not independently verified. If you have a severe allergy, message the cook before ordering.\n\n## Ordering\nDishes are made to order. Portions available are set by the cook each day.', true);

-- Homepage layout gains a "kitchens" section: right after "stores" if the layout is still the default order, otherwise at the end.
UPDATE content_blocks SET value = CASE
  WHEN (SELECT array_agg(e->>'id') FROM jsonb_array_elements(value->'sections') e) = ARRAY['regions','deals','departments','collections_a','new','collections_b','stores','recipes','trust']
    THEN '{"sections":[{"id":"regions","enabled":true},{"id":"deals","enabled":true},{"id":"departments","enabled":true},{"id":"collections_a","enabled":true},{"id":"new","enabled":true},{"id":"collections_b","enabled":true},{"id":"stores","enabled":true},{"id":"kitchens","enabled":true},{"id":"recipes","enabled":true},{"id":"trust","enabled":true}]}'::jsonb
  ELSE jsonb_set(value, '{sections}', (value->'sections') || '[{"id":"kitchens","enabled":true}]'::jsonb) END
WHERE key = 'home_layout' AND value::text NOT LIKE '%kitchens%';
