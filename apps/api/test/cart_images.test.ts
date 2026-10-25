import { describe, expect, it } from 'vitest';
import { addToCart, call, newCustomer, openAllStores, setOffer } from './helpers.js';
import { pool } from '../src/db/pool.js';

describe('basket shows the product photo', () => {
  it('a cart line carries the product image so the basket is not a placeholder', async () => {
    await openAllStores();
    const u = await newCustomer();
    const offerId = await setOffer('demo-calgary-west-african-market', 'garri-white', 1500, 10);
    await pool.query(`DELETE FROM product_images WHERE product_id = (SELECT id FROM products WHERE slug = 'garri-white')`);
    await pool.query(`INSERT INTO product_images(product_id, url, alt, sort_order) SELECT id, '/uploads/test-garri.png', name, 0 FROM products WHERE slug = 'garri-white'`);
    await addToCart(u.cookie, offerId, 1);
    const cart = (await call(u.cookie, 'GET', '/api/cart')).body;
    const line = cart.stores.flatMap((s: any) => s.items).find((i: any) => i.slug === 'garri-white');
    expect(line.image_url).toBe('/uploads/test-garri.png');
    await pool.query(`DELETE FROM product_images WHERE url = '/uploads/test-garri.png'`);
  });
});
