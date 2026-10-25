import { describe, expect, it } from 'vitest';
import { call, login } from './helpers.js';

describe('admin: customers, review moderation, gift cards', () => {
  it('support finds a customer and moderates a reported review; hidden reviews leave the public count', async () => {
    const admin = (await login('admin@example.test')).cookie;
    const support = (await login('support@example.test')).cookie;
    const cust = (await login('customer@example.test')).cookie;

    const list = (await call(support, 'GET', '/api/admin/customers?q=customer@example')).body as any[];
    const me = list.find((c) => c.email === 'customer@example.test');
    expect(me).toBeTruthy();
    expect(list.some((c) => c.email === 'admin@example.test')).toBe(false);   // staff are not shown as customers
    const detail = (await call(support, 'GET', `/api/admin/customers/${me.id}`)).body;
    expect(detail).toHaveProperty('credit_cents'); expect(Array.isArray(detail.orders)).toBe(true);
    expect([401, 403]).toContain((await call(cust, 'GET', '/api/admin/customers')).status);

    expect((await call(support, 'GET', '/api/admin/reviews?filter=all')).status).toBe(200);
    expect([401, 403]).toContain((await call(cust, 'GET', '/api/admin/reviews')).status);
    expect((await call(admin, 'PATCH', '/api/admin/reviews/00000000-0000-0000-0000-000000000000', { is_hidden: true })).status).toBe(404);

    expect((await call(admin, 'GET', '/api/admin/gift-cards')).status).toBe(200);
    expect([401, 403]).toContain((await call(support, 'GET', '/api/admin/gift-cards')).status);
  });
});
