import { describe, expect, it } from 'vitest';
import { call, newCustomer, openAllStores, setOffer } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';

describe('saved items', () => {
  it('come back as full product cards: the real picture, price, stock, rating fields and the add-to-basket offer', async () => {
    await openAllStores();
    const u = await newCustomer();
    await setOffer(S1, 'garri-white', 2000, 50);
    const pid = (await pool.query(`SELECT id FROM products WHERE slug = 'garri-white'`)).rows[0].id;
    await pool.query(`DELETE FROM product_images WHERE product_id = $1`, [pid]);
    await pool.query(`INSERT INTO product_images(product_id, url, alt, sort_order) VALUES ($1, '/uploads/garri-test.jpg', 'Garri', 0)`, [pid]);
    await call(u.cookie, 'PUT', '/api/favourites/garri-white');
    const card = (await call(u.cookie, 'GET', '/api/favourites')).body.find((c: any) => c.slug === 'garri-white');
    expect(card.image_url).toBe('/uploads/garri-test.jpg');                       // the real picture, not a placeholder
    expect(card.offer_id).toBeTruthy(); expect(card.min_price).toBeLessThanOrEqual(2000); expect(card.in_stock).toBe(true); expect(card.store_slug).toBeTruthy();
    expect(card).toHaveProperty('rating_avg'); expect(card).toHaveProperty('unit_price_cents'); expect(card).toHaveProperty('category_slug');
    await pool.query(`DELETE FROM product_images WHERE product_id = $1`, [pid]);
  });
  it('a saved product that no store has right now is still listed, as out of stock', async () => {
    await openAllStores();
    const u = await newCustomer();
    await setOffer(S1, 'plantain-chips-salted', 1500, 10);
    await call(u.cookie, 'PUT', '/api/favourites/plantain-chips-salted');
    await pool.query(`UPDATE store_offers SET is_active = false WHERE product_id = (SELECT id FROM products WHERE slug = 'plantain-chips-salted')`);
    const card = (await call(u.cookie, 'GET', '/api/favourites')).body.find((c: any) => c.slug === 'plantain-chips-salted');
    expect(card).toBeTruthy(); expect(card.in_stock).toBe(false); expect(card.offer_id ?? null).toBeNull();
    await pool.query(`UPDATE store_offers SET is_active = true WHERE product_id = (SELECT id FROM products WHERE slug = 'plantain-chips-salted')`);
  });
});
