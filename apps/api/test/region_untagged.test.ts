import { beforeAll, describe, expect, it } from 'vitest';
import { app, call, openAllStores } from './helpers.js';
import { pool } from '../src/db/pool.js';

beforeAll(openAllStores);

describe('products with no country tag still show under the regions their store serves', () => {
  it('an untagged product appears in its store’s region (search, filter counts, home) and not in regions the store does not serve; tagged products are unchanged', async () => {
    const p = (await pool.query(`SELECT p.id FROM products p JOIN offers_live o ON o.product_id = p.id AND o.is_active JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE p.slug = 'garri-white' LIMIT 1`)).rows[0];
    const saved = (await pool.query(`SELECT country_id, kind FROM product_countries WHERE product_id = $1`, [p.id])).rows;
    const regs = (await pool.query(`SELECT DISTINCT r.slug FROM offers_live o JOIN store_regions sr ON sr.store_id = o.store_id JOIN regions r ON r.id = sr.region_id WHERE o.product_id = $1 AND o.is_active`, [p.id])).rows.map((r) => r.slug);
    expect(regs.length).toBeGreaterThan(0);
    const other = (await pool.query(`SELECT slug FROM regions WHERE is_active AND slug <> ALL($1::text[]) LIMIT 1`, [regs])).rows[0]?.slug;
    try {
      await pool.query(`DELETE FROM product_countries WHERE product_id = $1`, [p.id]);
      const inRegion = await call(null, 'GET', `/api/search?region=${regs[0]}&page_size=100`);
      expect(inRegion.body.results.some((r: any) => r.slug === 'garri-white')).toBe(true);
      expect(inRegion.body.facets?.regions?.some((r: any) => r.slug === regs[0])).toBe(true);
      if (other) {
        const outside = await call(null, 'GET', `/api/search?region=${other}&page_size=100`);
        expect(outside.body.results.some((r: any) => r.slug === 'garri-white')).toBe(false);
      }
      const home = await call(null, 'GET', '/api/home/shape');
      expect(home.status).toBe(200);
      expect(home.body.regions.some((r: any) => r.slug === regs[0])).toBe(true);
    } finally {
      for (const s of saved) await pool.query(`INSERT INTO product_countries VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [p.id, s.country_id, s.kind]);
    }
    expect((await pool.query(`SELECT count(*)::int n FROM product_countries WHERE product_id = $1`, [p.id])).rows[0].n).toBe(saved.length);   // the test put the tags back
  });
});
