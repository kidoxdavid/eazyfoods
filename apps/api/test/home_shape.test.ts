import { describe, expect, it } from 'vitest';
import { call, openAllStores } from './helpers.js';

describe('home page shape', () => {
  it('lists only regions and departments that have something in stock, and counts what the page can show', async () => {
    await openAllStores();
    const s = (await call(null, 'GET', '/api/home/shape')).body;
    expect(s.regions.length).toBeGreaterThan(0); expect(s.departments.length).toBeGreaterThan(0);
    expect(s.regions.every((r: any) => r.n > 0)).toBe(true); expect(s.departments.every((d: any) => d.n > 0)).toBe(true);
    expect(s.stores).toBeGreaterThan(0); expect(s.fresh).toBeGreaterThan(0);
    for (const k of ['deals', 'kitchens', 'recipes']) expect(typeof s[k]).toBe('number');
    expect(Array.isArray(s.collections)).toBe(true);
  });
});
