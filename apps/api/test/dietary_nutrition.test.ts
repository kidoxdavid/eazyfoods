import { describe, expect, it } from 'vitest';
import { call, login } from './helpers.js';
import { pool } from '../src/db/pool.js';

describe('dietary labels and nutrition', () => {
  it('the catalogue team sets labels and a nutrition panel; shoppers see the panel and can filter on the labels', async () => {
    const cat = (await login('admin@example.test')).cookie;
    const id = (await pool.query(`SELECT id FROM products WHERE slug = 'plantain-chips-salted'`)).rows[0].id;
    const ok = await call(cat, 'PATCH', `/api/admin/products/${id}`, { dietary: { halal: true, nut_free: true, organic: false }, nutrition: { serving: '30 g', calories: 150, fat_g: 9, sodium_mg: 120 } });
    expect(ok.status).toBe(200);
    const p = (await call(null, 'GET', '/api/products/plantain-chips-salted')).body;
    expect(p.dietary).toEqual({ halal: true, nut_free: true }); expect(p.nutrition).toEqual({ serving: '30 g', calories: 150, fat_g: 9, sodium_mg: 120 });
    const halal = (await call(null, 'GET', '/api/search?q=plantain&diet=halal')).body;
    expect(halal.results.map((r: any) => r.slug)).toContain('plantain-chips-salted');
    expect((await call(null, 'GET', '/api/search?q=plantain&diet=halal,kosher')).body.results.length).toBe(0);      // all labels must match
    expect((halal.facets.dietary as any[]).map((f) => f.key)).toContain('halal');
    // nothing is guessed: bad numbers and unknown labels are refused
    expect((await call(cat, 'PATCH', `/api/admin/products/${id}`, { nutrition: { calories: -5 } })).status).toBe(400);
    expect((await call(cat, 'PATCH', `/api/admin/products/${id}`, { dietary: { keto: true } })).status).toBe(400);
    // clearing the panel
    expect((await call(cat, 'PATCH', `/api/admin/products/${id}`, { nutrition: null })).status).toBe(200);
    expect((await call(null, 'GET', '/api/products/plantain-chips-salted')).body.nutrition).toBeNull();
    await pool.query(`UPDATE products SET dietary = '{}', nutrition = NULL WHERE id = $1`, [id]);
  });
  it('only catalogue staff can change them', async () => {
    const id = (await pool.query(`SELECT id FROM products WHERE slug = 'plantain-chips-salted'`)).rows[0].id;
    expect((await call(null, 'PATCH', `/api/admin/products/${id}`, { dietary: { halal: true } })).status).toBe(401);
    const cust = (await login('customer@example.test')).cookie;
    expect([401, 403]).toContain((await call(cust, 'PATCH', `/api/admin/products/${id}`, { dietary: { halal: true } })).status);
  });
});
