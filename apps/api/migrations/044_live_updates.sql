-- Real-time pages. Whenever data a person can see changes, the database says which people (topics) should refresh:
--   user:<id>    the person the data belongs to (their orders, cart, messages, notifications; also their other devices)
--   vendor:<id>  everyone on that vendor's team
--   drivers      every driver (the list of available deliveries)
--   admin        every back-office user
-- The topic is all that is sent, never the data; the page then asks the API for what it is allowed to see. Triggers catch every writer
-- (requests, webhooks, background jobs), and LISTEN/NOTIFY carries it to every API instance. Identical notifications in one transaction collapse into one.
CREATE FUNCTION live_vendor(store uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN SELECT vendor_id INTO v FROM stores WHERE id = store; IF v IS NOT NULL THEN PERFORM pg_notify('live', 'vendor:' || v); END IF; END $$;

CREATE FUNCTION live_user(u uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF u IS NOT NULL THEN PERFORM pg_notify('live', 'user:' || u); END IF; END $$;

CREATE FUNCTION live_suborder(sid uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE s record;
BEGIN
  SELECT so.vendor_id, o.user_id INTO s FROM suborders so JOIN orders o ON o.id = so.order_id WHERE so.id = sid;
  IF FOUND THEN PERFORM pg_notify('live', 'vendor:' || s.vendor_id); PERFORM live_user(s.user_id); END IF;
  PERFORM pg_notify('live', 'admin');
END $$;

CREATE FUNCTION live_ping() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record; x record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  CASE TG_TABLE_NAME
    WHEN 'products' THEN
      PERFORM pg_notify('live', 'admin');
      IF r.suggested_by_vendor_id IS NOT NULL THEN PERFORM pg_notify('live', 'vendor:' || r.suggested_by_vendor_id); END IF;
      IF r.owner_store_id IS NOT NULL THEN PERFORM live_vendor(r.owner_store_id); END IF;
      FOR x IN SELECT DISTINCT s.vendor_id FROM store_offers o JOIN stores s ON s.id = o.store_id WHERE o.product_id = r.id LOOP PERFORM pg_notify('live', 'vendor:' || x.vendor_id); END LOOP;
    WHEN 'product_images' THEN
      PERFORM pg_notify('live', 'admin');
      FOR x IN SELECT DISTINCT s.vendor_id FROM store_offers o JOIN stores s ON s.id = o.store_id WHERE o.product_id = r.product_id LOOP PERFORM pg_notify('live', 'vendor:' || x.vendor_id); END LOOP;
      FOR x IN SELECT suggested_by_vendor_id AS v FROM products WHERE id = r.product_id AND suggested_by_vendor_id IS NOT NULL LOOP PERFORM pg_notify('live', 'vendor:' || x.v); END LOOP;
    WHEN 'store_offers' THEN PERFORM live_vendor(r.store_id); PERFORM pg_notify('live', 'admin');
    WHEN 'inventory_adjustments' THEN
      FOR x IN SELECT store_id FROM store_offers WHERE id = r.offer_id LOOP PERFORM live_vendor(x.store_id); END LOOP;
    WHEN 'offer_promotions' THEN
      FOR x IN SELECT store_id FROM store_offers WHERE id = r.offer_id LOOP PERFORM live_vendor(x.store_id); END LOOP;
      PERFORM pg_notify('live', 'admin');
    WHEN 'stores' THEN PERFORM live_vendor(r.id); PERFORM pg_notify('live', 'admin');
    WHEN 'orders' THEN PERFORM live_user(r.user_id); PERFORM pg_notify('live', 'admin');
    WHEN 'suborders' THEN
      PERFORM live_suborder(r.id);
      IF r.status IN ('ready', 'accepted', 'preparing') THEN PERFORM pg_notify('live', 'drivers'); END IF;
    WHEN 'order_lines' THEN PERFORM live_suborder(r.suborder_id);
    WHEN 'deliveries' THEN
      PERFORM live_suborder(r.suborder_id); PERFORM pg_notify('live', 'drivers');
      IF r.driver_id IS NOT NULL THEN FOR x IN SELECT user_id FROM drivers WHERE id = r.driver_id LOOP PERFORM live_user(x.user_id); END LOOP; END IF;
    WHEN 'reviews' THEN PERFORM live_vendor(r.store_id); PERFORM live_user(r.user_id); PERFORM pg_notify('live', 'admin');
    WHEN 'support_tickets' THEN
      PERFORM live_user(r.user_id); PERFORM pg_notify('live', 'admin');
      IF r.vendor_id IS NOT NULL THEN PERFORM pg_notify('live', 'vendor:' || r.vendor_id); END IF;
    WHEN 'ticket_messages' THEN
      FOR x IN SELECT user_id, vendor_id FROM support_tickets WHERE id = r.ticket_id LOOP
        PERFORM live_user(x.user_id); IF x.vendor_id IS NOT NULL THEN PERFORM pg_notify('live', 'vendor:' || x.vendor_id); END IF;
      END LOOP;
      PERFORM pg_notify('live', 'admin');
    WHEN 'vendor_threads' THEN PERFORM pg_notify('live', 'vendor:' || r.vendor_id); PERFORM pg_notify('live', 'admin');
    WHEN 'vendor_messages' THEN
      FOR x IN SELECT vendor_id FROM vendor_threads WHERE id = r.thread_id LOOP PERFORM pg_notify('live', 'vendor:' || x.vendor_id); END LOOP;
      PERFORM pg_notify('live', 'admin');
    WHEN 'driver_messages' THEN
      FOR x IN SELECT user_id FROM drivers WHERE id = r.driver_id LOOP PERFORM live_user(x.user_id); END LOOP;
      PERFORM pg_notify('live', 'admin');
    WHEN 'notifications' THEN PERFORM live_user(r.user_id);
    WHEN 'carts' THEN PERFORM live_user(r.user_id);
    WHEN 'cart_items' THEN FOR x IN SELECT user_id FROM carts WHERE id = r.cart_id LOOP PERFORM live_user(x.user_id); END LOOP;
    WHEN 'favourites' THEN PERFORM live_user(r.user_id);
    WHEN 'shopping_lists' THEN PERFORM live_user(r.user_id);
    WHEN 'addresses' THEN PERFORM live_user(r.user_id);
    WHEN 'refunds' THEN PERFORM live_suborder(r.suborder_id);
    WHEN 'payouts' THEN
      PERFORM pg_notify('live', 'admin');
      IF r.vendor_id IS NOT NULL THEN PERFORM pg_notify('live', 'vendor:' || r.vendor_id); END IF;
      IF r.driver_id IS NOT NULL THEN FOR x IN SELECT user_id FROM drivers WHERE id = r.driver_id LOOP PERFORM live_user(x.user_id); END LOOP; END IF;
    WHEN 'driver_earnings' THEN
      FOR x IN SELECT user_id FROM drivers WHERE id = r.driver_id LOOP PERFORM live_user(x.user_id); END LOOP;
    WHEN 'drivers' THEN PERFORM live_user(r.user_id); PERFORM pg_notify('live', 'admin');
    ELSE PERFORM pg_notify('live', 'admin');
  END CASE;
  RETURN NULL;
END $$;

-- Back-office tables nobody else watches: one "admin" ping per statement.
CREATE FUNCTION live_ping_admin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM pg_notify('live', 'admin'); RETURN NULL; END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','product_images','store_offers','inventory_adjustments','offer_promotions','stores','orders','suborders','order_lines','deliveries','reviews',
    'support_tickets','ticket_messages','vendor_threads','vendor_messages','driver_messages','notifications','carts','cart_items','favourites','shopping_lists','addresses','refunds','payouts','driver_earnings','drivers']
  LOOP
    EXECUTE format('CREATE TRIGGER live_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION live_ping()', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['brands','categories','collections','collection_products','coupons','delivery_zones','delivery_zone_fsas','store_delivery_zones','pricing_rules','feature_flags','app_settings',
    'pages','content_blocks','home_banners','marketing_campaigns','marketing_assets','marketing_automations','marketing_budgets','marketing_templates','marketing_expenses','email_campaigns','segments',
    'themes','vendors','vendor_documents','user_roles','users','gift_codes','gift_purchases','finance_exception_notes','prospect_activities','vendor_prospects','recipes','ad_campaigns','credit_entries',
    'payments','payout_holds','ledger_entries','portal_config','social_posts','referrals','product_questions','product_aliases','store_hours','store_closures','store_branding','import_jobs']
  LOOP
    EXECUTE format('CREATE TRIGGER live_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION live_ping_admin()', t, t);
  END LOOP;
END $$;
