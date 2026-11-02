-- Group orders: one person starts a shared basket and shares a link; friends and family (signed in) add their own items;
-- the starter then moves everything into their own basket and checks out as usual (so tax, delivery and payment all work the same).
CREATE TABLE group_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_orders_owner ON group_orders(owner_id, status);
CREATE TABLE group_items (
  group_id uuid NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES store_offers(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id, offer_id)
);
-- Real-time: whoever is in a group order sees changes without reloading.
CREATE FUNCTION live_group(gid uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE x record;
BEGIN
  FOR x IN SELECT owner_id AS u FROM group_orders WHERE id = gid UNION SELECT user_id FROM group_items WHERE group_id = gid LOOP PERFORM live_user(x.u); END LOOP;
END $$;
CREATE FUNCTION live_group_ping() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF TG_TABLE_NAME = 'group_orders' THEN PERFORM live_group(r.id); ELSE PERFORM live_group(r.group_id); PERFORM live_user(r.user_id); END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER group_orders_live AFTER INSERT OR UPDATE OR DELETE ON group_orders FOR EACH ROW EXECUTE FUNCTION live_group_ping();
CREATE TRIGGER group_items_live AFTER INSERT OR UPDATE OR DELETE ON group_items FOR EACH ROW EXECUTE FUNCTION live_group_ping();
