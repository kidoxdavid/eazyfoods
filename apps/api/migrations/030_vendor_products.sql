-- Vendors can create their own products (with price and stock) in one step. This switch says whether our team must approve them before customers see them.
INSERT INTO feature_flags(key, label, description, grp, enabled, sort) VALUES
  ('vendor.products_need_review', 'New vendor products need approval', 'On: a product a vendor creates stays hidden until the catalogue team approves it. Off: it goes live straight away.', 'Vendors', true, 50)
ON CONFLICT (key) DO NOTHING;
