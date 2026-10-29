-- Low-stock emails to vendors: one digest per vendor, sent when items first run low, and again only after they were restocked and ran low once more.
ALTER TABLE store_offers ADD COLUMN low_stock_notified_at timestamptz;
ALTER TABLE vendors ADD COLUMN low_stock_emails boolean NOT NULL DEFAULT true;

INSERT INTO notification_templates(key, subject, body) VALUES
 ('vendor_low_stock', '{{count}} item(s) running low at {{vendor}}', E'These items are at or below the level you set. Restock them, or lower the level, so shoppers can keep ordering.\n\n{{items}}\n\nUpdate stock: {{web_url}}/vendor/inventory\nYou can turn these emails off on the Inventory page.');
