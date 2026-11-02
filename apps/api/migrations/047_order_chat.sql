-- Chat about one order between the customer and the store (the store's team). Everyone sees new messages without reloading.
CREATE TABLE order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suborder_id uuid NOT NULL REFERENCES suborders(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('customer','store')),
  sender_user_id uuid REFERENCES users(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 600),
  customer_read_at timestamptz,
  store_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_messages_suborder ON order_messages(suborder_id, created_at);
CREATE FUNCTION live_order_message() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM live_suborder(NEW.suborder_id); RETURN NULL; END $$;
CREATE TRIGGER order_messages_live AFTER INSERT OR UPDATE ON order_messages FOR EACH ROW EXECUTE FUNCTION live_order_message();
INSERT INTO notification_templates(key, subject, body) VALUES
 ('order_message_customer', 'A new message about your order {{order_number}}', E'{{from}} wrote about order {{order_number}}:\n\n"{{text}}"\n\nReply here: {{web_url}}/orders'),
 ('order_message_store', 'A customer wrote about order {{order_number}}', E'A customer wrote about order {{order_number}}:\n\n"{{text}}"\n\nReply in the vendor portal: {{web_url}}/vendor/orders');
