import { describe, expect, it } from 'vitest';
import { bandErrors, commissionCents, deliveryFee, driverPay, DeliveryParams, DriverPayParams, CommissionParams, serviceFeeCents, ServiceFeeParams, simulate, validateParams, haversineKm } from '../src/services/financeRules.js';

const bands = DeliveryParams.parse({ model: 'distance_bands', max_distance_km: 15, bands: [{ up_to_km: 3, fee_cents: 499 }, { up_to_km: 5, fee_cents: 599 }, { up_to_km: 8, fee_cents: 799 }, { up_to_km: 12, fee_cents: 999 }, { up_to_km: 15, fee_cents: 1199 }] });
const pay = DriverPayParams.parse({ bands: [{ up_to_km: 3, base_cents: 500 }, { up_to_km: 5, base_cents: 575 }, { up_to_km: 8, base_cents: 700 }, { up_to_km: 12, base_cents: 850 }, { up_to_km: 15, base_cents: 1000 }], unknown_distance_cents: 500 });
const route = (km: number | null) => ({ routeKm: km, straightKm: null });
const fee = (km: number | null, p = bands, zone: number | null = 599, subtotal = 5000) => deliveryFee(p, { distance: route(km), zoneFeeCents: zone, subtotalCents: subtotal });

describe('delivery distance bands', () => {
  it('uses inclusive upper boundaries: 3.0 km is the first band, 3.1 km the second', () => {
    expect(fee(3)).toMatchObject({ ok: true, fee_cents: 499 });
    expect(fee(3.04)).toMatchObject({ fee_cents: 499 });   // rounds to 3.0
    expect(fee(3.1)).toMatchObject({ fee_cents: 599 });
    expect(fee(5)).toMatchObject({ fee_cents: 599 }); expect(fee(8)).toMatchObject({ fee_cents: 799 }); expect(fee(12)).toMatchObject({ fee_cents: 999 }); expect(fee(15)).toMatchObject({ fee_cents: 1199 });
  });
  it('refuses beyond the maximum, or asks for a quote when configured', () => {
    expect(fee(15.1)).toMatchObject({ ok: false, reason: 'too_far' });
    expect(fee(20, { ...bands, over_max: 'quote' })).toMatchObject({ ok: false, reason: 'quote_required' });
  });
  it('without a driving distance it follows the configured fallback and says what it used', () => {
    expect(fee(null)).toMatchObject({ ok: true, fee_cents: 599, model: 'zone_fee', distance_method: 'none' });          // zone_fee fallback
    expect(fee(null, { ...bands, fallback: 'block' })).toMatchObject({ ok: false, reason: 'distance_unavailable' });
    const est = deliveryFee({ ...bands, fallback: 'straight_line', straight_line_factor: 1.5 }, { distance: { routeKm: null, straightKm: 4 }, zoneFeeCents: 599, subtotalCents: 5000 });
    expect(est).toMatchObject({ ok: true, distance_km: 6, fee_cents: 799, distance_method: 'straight_line_estimate' });
    expect((est as any).notes.join(' ')).toMatch(/estimate/);                                                              // never presented as a route
  });
  it('free-over threshold, min and max apply', () => {
    expect(fee(4, { ...bands, free_over_cents: 5000 }, 599, 5000)).toMatchObject({ fee_cents: 0, free_applied: true });
    expect(fee(4, { ...bands, min_fee_cents: 700 })).toMatchObject({ fee_cents: 700 });
    expect(fee(14, { ...bands, max_fee_cents: 900 })).toMatchObject({ fee_cents: 900 });
  });
  it('base plus per kilometre, flat and zone models', () => {
    const bk = DeliveryParams.parse({ model: 'base_per_km', base_cents: 300, per_km_cents: 100 });
    expect(fee(5.5, bk)).toMatchObject({ fee_cents: 850 });
    expect(fee(null, DeliveryParams.parse({ model: 'flat', flat_cents: 450 }))).toMatchObject({ fee_cents: 450 });
    expect(fee(null, DeliveryParams.parse({ model: 'zone_fee' }), 650)).toMatchObject({ fee_cents: 650 });
    expect(fee(null, DeliveryParams.parse({ model: 'zone_fee' }), null)).toMatchObject({ ok: false });
  });
});

describe('band and rule validation', () => {
  it('rejects overlaps, repeats and an open-ended band in the middle; accepts a clean list', () => {
    expect(bandErrors([{ up_to_km: 3 }, { up_to_km: 3 }], 'X')).toHaveLength(1);
    expect(bandErrors([{ up_to_km: 5 }, { up_to_km: 3 }], 'X')).toHaveLength(1);
    expect(bandErrors([{ up_to_km: null }, { up_to_km: 3 }], 'X').length).toBeGreaterThan(0);
    expect(bandErrors([], 'X')).toHaveLength(1);
    expect(bandErrors([{ up_to_km: 3 }, { up_to_km: 5 }, { up_to_km: null }], 'X')).toEqual([]);
  });
  it('validates whole rules in plain language', () => {
    expect(validateParams('delivery', { model: 'distance_bands', bands: [{ up_to_km: 5, fee_cents: 500 }, { up_to_km: 3, fee_cents: 600 }] }).ok).toBe(false);
    expect(validateParams('delivery', { model: 'distance_bands', max_distance_km: 20, bands: [{ up_to_km: 5, fee_cents: 500 }] })).toMatchObject({ ok: false });
    expect(validateParams('delivery', { model: 'flat' })).toMatchObject({ ok: false });
    expect(validateParams('delivery', { model: 'flat', flat_cents: 4.99 }).ok).toBe(false);                    // money must be whole cents
    expect(validateParams('delivery', { model: 'flat', flat_cents: 499, min_fee_cents: 900, max_fee_cents: 500 }).ok).toBe(false);
    expect(validateParams('commission', { bps: 12000 }).ok).toBe(false);
    expect(validateParams('commission', { bps: 1200 }).ok).toBe(true);
    expect(validateParams('driver_pay', {}).ok).toBe(false);
    expect(validateParams('driver_pay', { flat_cents: 700 }).ok).toBe(true);
  });
});

describe('driver pay', () => {
  it('base by distance, tips never included, unknown distance uses the configured amount', () => {
    expect(driverPay(pay, { distanceKm: 2 }).total_cents).toBe(500);
    expect(driverPay(pay, { distanceKm: 6.5 }).total_cents).toBe(700);
    expect(driverPay(pay, { distanceKm: null })).toMatchObject({ total_cents: 500 });
    expect(driverPay(pay, { distanceKm: 4 })).not.toHaveProperty('tip');
  });
  it('waiting pay starts after the grace period and respects the cap; extras add up', () => {
    const p = DriverPayParams.parse({ flat_cents: 700, waiting: { grace_minutes: 5, per_minute_cents: 20, max_cents: 300 }, additional_pickup_cents: 150, handling_cents: 200 });
    expect(driverPay(p, { distanceKm: 3, waitingMinutes: 5 }).components.waiting).toBe(0);
    expect(driverPay(p, { distanceKm: 3, waitingMinutes: 15 }).components.waiting).toBe(200);
    expect(driverPay(p, { distanceKm: 3, waitingMinutes: 120 }).components.waiting).toBe(300);
    expect(driverPay(p, { distanceKm: 3, additionalPickups: 2, handling: true }).total_cents).toBe(700 + 300 + 200);
  });
  it('beyond the last band only with an explicit per-km rate', () => {
    const p = DriverPayParams.parse({ bands: [{ up_to_km: 10, base_cents: 900 }], beyond_per_km_cents: 80 });
    expect(driverPay(p, { distanceKm: 14 })).toMatchObject({ total_cents: 900 + 320 });
  });
});

describe('commission and service fee', () => {
  it('commission base is explicit: after or before discounts; never on tax or delivery', () => {
    expect(commissionCents(CommissionParams.parse({ bps: 1200 }), { merchandiseCents: 7000, discountCents: 1000 })).toBe(720);
    expect(commissionCents(CommissionParams.parse({ bps: 1200, base: 'before_discount' }), { merchandiseCents: 7000, discountCents: 1000 })).toBe(840);
    expect(commissionCents(CommissionParams.parse({ bps: 1200, min_cents: 100 }), { merchandiseCents: 200, discountCents: 0 })).toBe(100);
    expect(commissionCents(CommissionParams.parse({ bps: 1200 }), { merchandiseCents: 0, discountCents: 0 })).toBe(0);
  });
  it('service fee fixed or percent with min and max', () => {
    expect(serviceFeeCents(ServiceFeeParams.parse({ mode: 'fixed', fixed_cents: 99 }), 5000)).toBe(99);
    expect(serviceFeeCents(ServiceFeeParams.parse({ mode: 'percent', percent_bps: 500, min_cents: 150, max_cents: 400 }), 1000)).toBe(150);
    expect(serviceFeeCents(ServiceFeeParams.parse({ mode: 'percent', percent_bps: 500, min_cents: 150, max_cents: 400 }), 20000)).toBe(400);
  });
});

describe('simulator uses the same calculations', () => {
  const base = { delivery: DeliveryParams.parse({ model: 'flat', flat_cents: 799 }), driver_pay: DriverPayParams.parse({ flat_cents: 700 }), commission: CommissionParams.parse({ bps: 1200 }) };
  it('worked example: $70 basket, $7.99 delivery, 12% commission, $7.00 driver, assumed $2.65 processing', () => {
    const r = simulate({ ...base, merchandise_cents: 7000, distance_km: 6, processing_fixed_cents: 265 });
    expect(r.vendor).toEqual({ commission_cents: 840, net_cents: 6160 });
    expect(r.platform).toMatchObject({ revenue_cents: 840 + 799, driver_pay_cents: 700, processing_cents_assumed: 265, margin_cents: 840 + 799 - 700 - 265 });
    expect(r.customer.total_cents).toBe(7000 + 799);
    expect(r.assumptions.join(' ')).toMatch(/assumption/i);
  });
  it('tips and tax are pass-through; EAZyfoods-funded discounts cost margin, vendor-funded ones cost the vendor', () => {
    const a = simulate({ ...base, merchandise_cents: 7000, discount_cents: 500, distance_km: 6, tip_cents: 300, tax_bps_delivery: 500 });
    expect(a.platform.revenue_cents).toBe(a.vendor.commission_cents + 799);
    expect(a.platform.discount_funded_cents).toBe(500);
    const b = simulate({ ...base, merchandise_cents: 7000, discount_cents: 500, distance_km: 6, vendor_funded_discount: true });
    expect(b.platform.discount_funded_cents).toBe(0); expect(b.vendor.net_cents).toBe(7000 - b.vendor.commission_cents - 500);
  });
  it('warns when the fee does not cover the driver or the scenario loses money', () => {
    const r = simulate({ ...base, delivery: DeliveryParams.parse({ model: 'flat', flat_cents: 300 }), merchandise_cents: 1000, distance_km: 2, processing_fixed_cents: 300 });
    expect(r.warnings.join(' ')).toMatch(/does not cover the driver/); expect(r.warnings.join(' ')).toMatch(/loses money/);
  });
});

describe('distance helper', () => {
  it('straight-line distance between two Calgary points is plausible', () => {
    const km = haversineKm({ lat: 51.0447, lng: -114.0719 }, { lat: 51.1215, lng: -114.0098 });
    expect(km).toBeGreaterThan(9); expect(km).toBeLessThan(12);
  });
});
