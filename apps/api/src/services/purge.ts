import { tx } from '../db/pool.js';

/**
 * "Start from scratch": removes everything that came from the demo seed, plus every order, payment and ledger row, so the owner can build the marketplace by hand.
 * Kept: regions/countries/categories, delivery zones and fees, settings, switches and pages. Accounts are handled by removeTestLogins().
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
    await c.query(`INSERT INTO app_settings(key, value) VALUES ('demo.purged', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now()`);
  });
}
