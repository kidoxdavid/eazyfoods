-- Control centre: feature switches, per-portal customisation, vendor capability switches. Everything defaults to ON so nothing changes until an admin decides.

CREATE TABLE feature_flags (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  grp text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO feature_flags(key, label, description, grp, sort) VALUES
 ('shop.tips',            'Driver tips',                 'Customers can add a tip for the driver at checkout.',                                  'Checkout', 10),
 ('shop.gift_notes',      'Gift notes',                  'Customers can mark an order as a gift and add a note for the store.',                  'Checkout', 20),
 ('shop.store_credit',    'Store credit at checkout',    'Customers can pay part of an order with store credit and redeem gift codes.',          'Checkout', 30),
 ('shop.substitution_prefs','Substitution choices',      'Customers choose per item what to do if it is unavailable (ask, swap, refund).',       'Checkout', 40),
 ('shop.preorders',       'Pre-order time slots',        'Stores that allow it can take orders for a later time.',                               'Checkout', 50),
 ('shop.multibuy',        'Multi-buy prices',            'Stores can offer lower prices for larger quantities, applied in baskets and orders.',  'Shop', 10),
 ('shop.flyer',           'Weekly flyer',                'The printable weekly flyer of live sales.',                                            'Shop', 20),
 ('shop.frequently_bought','Frequently bought together', 'Shows products often bought with the one being viewed (needs 3+ real orders).',        'Shop', 30),
 ('shop.lists',           'Shopping lists and reminders','Customers can save, share and be reminded about shopping lists.',                      'Shop', 40),
 ('shop.alerts',          'Back-in-stock and price alerts','Customers can ask to be emailed when a product returns or its price drops.',         'Shop', 50),
 ('shop.compare_stores',  'Compare stores by area',      'The delivery comparison table on the stores page.',                                    'Shop', 60),
 ('shop.questions',       'Product questions',           'Customers can ask questions on product pages; stores answer them.',                    'Community', 10),
 ('shop.review_photos',   'Review photos',               'Customers can attach a photo to a product review.',                                    'Community', 20),
 ('shop.language_switch', 'Language switch (EN/FR)',     'Shows the English/French switch in the shop header.',                                  'Site', 10),
 ('shop.install_app',     'Install-the-app prompt',      'Shows the "Install the EAZyfoods app" link in the footer.',                            'Site', 20),
 ('shop.help_centre',     'Help centre page',            'The /help page with FAQs and the contact form.',                                       'Site', 30);

-- Per-portal customisation: menu items an admin has hidden for everyone in that area, and a notice shown at the top.
CREATE TABLE portal_config (
  portal text PRIMARY KEY CHECK (portal IN ('admin','marketing','vendor','chef','driver')),
  hidden_nav text[] NOT NULL DEFAULT '{}',
  notice text,
  notice_tone text NOT NULL DEFAULT 'info' CHECK (notice_tone IN ('info','warn')),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO portal_config(portal) VALUES ('admin'),('marketing'),('vendor'),('chef'),('driver');

-- What vendors may do. Defaults apply to everyone; a vendor can have its own overrides.
ALTER TABLE vendors ADD COLUMN capabilities jsonb NOT NULL DEFAULT '{}';
INSERT INTO app_settings(key, value) VALUES ('vendor.default_capabilities',
  '{"promotions":true,"ads":true,"multibuy":true,"csv_import":true,"storefront":true,"schedule":true,"questions":true,"messages":true}');
