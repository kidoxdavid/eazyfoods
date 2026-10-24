import { tx } from '../db/pool.js';

/**
 * "Start from scratch": removes everything that came from the demo seed, plus every order, payment and ledger row, so the owner can build the marketplace by hand.
 * Kept: sign-in accounts for each area (admin, support, finance, dispatcher, marketing, driver, customer, one vendor, one chef), roles,
 * regions/countries/categories, delivery zones and fees, settings, switches and pages. The two vendor accounts get an empty store each.
 * Sets `demo.purged` so the seed (which runs on every deploy) does not bring the demo content back.
 */
export async function purgeDemoData() {
  return tx(async (c) => {
    // Orders, money and everything that points at them. CASCADE only follows foreign keys out of these tables.
    await c.query(`TRUNCATE orders, carts, reviews, favourites, search_events, analytics_events, ad_campaigns, coupons, credit_entries, gift_codes, gift_purchases, sms_outbox,
      notifications, support_tickets, ledger_entries, payouts, shopping_lists, product_alerts, product_questions, referrals, vendor_threads, import_jobs, error_events,
      marketing_campaigns, email_campaigns, social_posts, recipes, collections, vendor_prospects, deliveries CASCADE`);
    await c.query('TRUNCATE store_offers, inventory_adjustments CASCADE');
    await c.query('DELETE FROM products');
    await c.query('DELETE FROM brands');
    await c.query('DELETE FROM stores');
    await c.query('DELETE FROM user_roles WHERE vendor_id IS NOT NULL');
    await c.query('DELETE FROM vendors');
    // Demo owners/chefs other than the first of each (those become the blank vendor and chef accounts).
    await c.query(`DELETE FROM users WHERE email ~ '^(owner|chef)[0-9]+@example\\.test$' AND email NOT IN ('owner1@example.test','chef1@example.test')`);

    const blank = async (email: string, kind: 'store' | 'chef', name: string, slug: string) => {
      const u = (await c.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
      if (!u) return;
      const v = (await c.query(`INSERT INTO vendors(name, legal_name, status, kind) VALUES ($1,$1,'approved',$2) RETURNING id`, [name, kind])).rows[0].id;
      await c.query(`INSERT INTO user_roles(user_id, role, vendor_id) VALUES ($1,'vendor_owner',$2)`, [u.id, v]);
      const st = (await c.query(
        `INSERT INTO stores(vendor_id, slug, name, description, status, min_order_cents${kind === 'chef' ? ', kind, offers_pickup, preorders_enabled' : ''})
         VALUES ($1,$2,$3,'','published',0${kind === 'chef' ? `,'kitchen',false,true` : ''}) RETURNING id`, [v, slug, name])).rows[0].id;
      for (let d = 0; d < 7; d++) await c.query('INSERT INTO store_hours VALUES ($1,$2,$3,$4)', [st, d, '09:00', '21:00']);
      await c.query('INSERT INTO store_delivery_zones SELECT $1, id FROM delivery_zones ON CONFLICT DO NOTHING', [st]);
    };
    await blank('owner1@example.test', 'store', 'My Store', 'my-store');
    await blank('chef1@example.test', 'chef', 'My Kitchen', 'my-kitchen');
    await c.query(`INSERT INTO app_settings(key, value) VALUES ('demo.purged', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now()`);
  });
}
