import { beforeAll, describe, expect, it } from 'vitest';
import { addToCart, call, checkout, login, newCustomer, openAllStores, setOffer, simulate, storeId } from './helpers.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);

async function paidOrder() {
  const u = await newCustomer();
  await addToCart(u.cookie, await setOffer(S1, 'garri-white', 2000, 50), 2);
  const o = (await checkout(u.cookie, u.addressId)).body.order;
  await simulate(u.cookie, o.id, 'succeeded');
  return o;
}
const day = new Date().toISOString().slice(0, 10);

describe('financial overview', () => {
  it('every figure reconciles to the records behind it; revenue excludes tips and tax; unrecorded costs are not invented', async () => {
    const fin = (await login('finance@example.test')).cookie;
    const sid = await storeId(S1);
    const before = (await call(fin, 'GET', `/api/admin/finance/overview?from=${day}&to=${day}&store_id=${sid}`)).body;
    await paidOrder(); await paidOrder();
    const ov = (await call(fin, 'GET', `/api/admin/finance/overview?from=${day}&to=${day}&store_id=${sid}`)).body;
    const m = ov.metrics;
    expect(m.orders - before.metrics.orders).toBe(2);
    expect(m.merchandise_cents - before.metrics.merchandise_cents).toBe(2 * 4000);                       // 2 orders x 2 x $20.00
    expect(m.commission_cents - before.metrics.commission_cents).toBe(2 * 480);                           // 12% of $40.00 each
    expect(m.delivery_fees_cents - before.metrics.delivery_fees_cents).toBe(2 * 599);
    expect(m.revenue_cents).toBe(m.commission_cents + m.delivery_fees_cents);                             // tips and tax are not revenue
    expect(m.chargebacks_cents).toBeNull(); expect(m.processing_actual_cents).toBeNull();                 // not recorded: not shown as a number
    expect(m.margin_estimate_cents).toBeLessThan(m.margin_before_processing_cents);                       // the estimate subtracts assumed processing
    expect(Object.keys(ov.definitions)).toEqual(expect.arrayContaining(['merchandise_cents', 'margin_estimate_cents', 'tips_cents']));

    // the drill-down: the rows add up to the totals
    const tx = (await call(fin, 'GET', `/api/admin/finance/overview/transactions?from=${day}&to=${day}&store_id=${sid}&limit=200`)).body;
    expect(tx.total).toBe(m.orders === 0 ? 0 : tx.rows.length);
    const sum = (k: string) => tx.rows.reduce((a: number, r: any) => a + r[k], 0);
    expect(sum('commission_cents')).toBe(m.commission_cents);
    expect(sum('delivery_fees_cents')).toBe(m.delivery_fees_cents);
    expect(tx.rows.filter((r: any) => !['rejected', 'cancelled'].includes(r.status)).reduce((a: number, r: any) => a + r.merchandise_cents, 0)).toBe(m.merchandise_cents);
    expect(tx.rows.every((r: any) => r.ledger_entries > 0)).toBe(true);                                   // every row can be traced to ledger entries
  });

  it('filters narrow the figures, and only people with finance permissions can see them', async () => {
    const fin = (await login('finance@example.test')).cookie, support = (await login('support@example.test')).cookie;
    const all = (await call(fin, 'GET', `/api/admin/finance/overview?from=${day}&to=${day}`)).body.metrics;
    const none = (await call(fin, 'GET', `/api/admin/finance/overview?from=${day}&to=${day}&store_id=${await storeId('demo-horn-spice-grocer')}&order_status=cancelled`)).body.metrics;
    expect(none.merchandise_cents).toBeLessThanOrEqual(all.merchandise_cents);
    const future = (await call(fin, 'GET', '/api/admin/finance/overview?from=2099-01-01&to=2099-01-31')).body.metrics;
    expect(future.orders).toBe(0); expect(future.merchandise_cents).toBe(0);
    expect((await call(fin, 'GET', '/api/admin/finance/overview?from=not-a-date')).status).toBe(400);
    expect([401, 403]).toContain((await call(support, 'GET', '/api/admin/finance/overview')).status);
    expect([401, 403]).toContain((await call((await newCustomer()).cookie, 'GET', '/api/admin/finance/overview/transactions')).status);
  });
});
