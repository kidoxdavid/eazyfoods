import { z } from 'zod';
import type { Queryable } from '../lib/db-types.js';
import { bps } from '../lib/money.js';

/**
 * The one place delivery fees, driver pay, vendor commission and customer service fees are calculated.
 * Checkout, the delivery job, the admin simulator and the statements all call these functions, so a rule changed in the admin console changes all of them together.
 * Money is integer cents. Distances are kilometres; a band's upper limit is inclusive ("over 3 up to 5 km" is 3 < d <= 5).
 */

const Cents = z.number().int().min(0).max(1_000_000);
const Km = z.number().positive().max(1000);
const DeliveryBand = z.object({ up_to_km: Km.nullable(), fee_cents: Cents });
const PayBand = z.object({ up_to_km: Km.nullable(), base_cents: Cents });

export const DeliveryParams = z.object({
  model: z.enum(['zone_fee', 'flat', 'distance_bands', 'base_per_km']),
  flat_cents: Cents.optional(),
  bands: z.array(DeliveryBand).max(20).optional(),
  base_cents: Cents.optional(), per_km_cents: Cents.optional(),
  min_fee_cents: Cents.optional(), max_fee_cents: Cents.optional(),
  free_over_cents: Cents.nullable().optional(),
  max_distance_km: Km.nullable().optional(),
  over_max: z.enum(['block', 'quote']).default('block'),
  /** What to do when no driving route is available. straight_line is an estimate (km x factor) and is recorded as such. */
  fallback: z.enum(['zone_fee', 'straight_line', 'block']).default('zone_fee'),
  straight_line_factor: z.number().min(1).max(3).default(1.3),
});
export type DeliveryParams = z.infer<typeof DeliveryParams>;

export const DriverPayParams = z.object({
  bands: z.array(PayBand).max(20).optional(),
  flat_cents: Cents.optional(),
  /** Beyond the last finite band: extra per km (0 = not allowed, individually calculated). */
  beyond_per_km_cents: Cents.default(0),
  unknown_distance_cents: Cents.default(0),
  waiting: z.object({ grace_minutes: z.number().min(0).max(120), per_minute_cents: Cents, max_cents: Cents }).default({ grace_minutes: 5, per_minute_cents: 0, max_cents: 0 }),
  additional_pickup_cents: Cents.default(0),
  handling_cents: Cents.default(0),
});
export type DriverPayParams = z.infer<typeof DriverPayParams>;

export const CommissionParams = z.object({
  bps: z.number().int().min(0).max(5000),
  /** The base is explicit: merchandise after qualifying discounts, or before. Tax and delivery are never in the base. */
  base: z.enum(['after_discount', 'before_discount']).default('after_discount'),
  min_cents: Cents.default(0),
});
export type CommissionParams = z.infer<typeof CommissionParams>;

export const ServiceFeeParams = z.object({
  mode: z.enum(['fixed', 'percent']),
  fixed_cents: Cents.default(0), percent_bps: z.number().int().min(0).max(3000).default(0),
  min_cents: Cents.default(0), max_cents: Cents.default(0),
});
export type ServiceFeeParams = z.infer<typeof ServiceFeeParams>;

export const KINDS = ['delivery', 'driver_pay', 'commission', 'service_fee'] as const;
export type Kind = (typeof KINDS)[number];
export const SCHEMAS = { delivery: DeliveryParams, driver_pay: DriverPayParams, commission: CommissionParams, service_fee: ServiceFeeParams } as const;

/** Bands must be ascending, unambiguous at the boundaries, and only the last one may be open-ended. */
export function bandErrors(bands: { up_to_km: number | null }[] | undefined, what: string): string[] {
  const e: string[] = [];
  if (!bands?.length) return [`${what}: add at least one distance band.`];
  let prev = 0;
  bands.forEach((b, i) => {
    const last = i === bands.length - 1;
    if (b.up_to_km === null) { if (!last) e.push(`${what}: only the last band can be open-ended ("and over").`); return; }
    if (b.up_to_km <= prev) e.push(`${what}: band ${i + 1} must end after ${prev} km (it ends at ${b.up_to_km} km); bands cannot overlap or repeat.`);
    prev = b.up_to_km;
  });
  return e;
}

/** Full validation of a rule's parameters, including the cross-field rules zod cannot express. Returns the parsed params or a list of plain-language problems. */
export function validateParams(kind: Kind, raw: unknown): { ok: true; params: any } | { ok: false; errors: string[] } {
  const r = SCHEMAS[kind].safeParse(raw);
  if (!r.success) return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.') || 'rule'}: ${i.message}`) };
  const p: any = r.data; const e: string[] = [];
  if (kind === 'delivery') {
    if (p.model === 'distance_bands') {
      e.push(...bandErrors(p.bands, 'Delivery fee'));
      const last = p.bands?.[p.bands.length - 1];
      if (last && last.up_to_km !== null && p.max_distance_km && p.max_distance_km > last.up_to_km) e.push(`The maximum distance (${p.max_distance_km} km) is beyond the last band (${last.up_to_km} km): add a band or lower the maximum.`);
    }
    if (p.model === 'flat' && p.flat_cents === undefined) e.push('Flat delivery needs a fee.');
    if (p.model === 'base_per_km' && (p.base_cents === undefined || p.per_km_cents === undefined)) e.push('Base plus per-kilometre needs both a base fee and a per-kilometre fee.');
    if (p.min_fee_cents !== undefined && p.max_fee_cents !== undefined && p.min_fee_cents > p.max_fee_cents) e.push('The minimum delivery fee is above the maximum.');
  }
  if (kind === 'driver_pay') {
    if (p.bands?.length) e.push(...bandErrors(p.bands, 'Driver pay'));
    else if (p.flat_cents === undefined) e.push('Driver pay needs distance bands or a flat amount.');
  }
  if (kind === 'service_fee' && p.max_cents && p.min_cents > p.max_cents) e.push('The minimum service fee is above the maximum.');
  return e.length ? { ok: false, errors: e } : { ok: true, params: p };
}

const bandValue = <T extends { up_to_km: number | null }>(bands: T[], km: number): { band: T; index: number } | null => {
  for (let i = 0; i < bands.length; i++) if (bands[i].up_to_km === null || km <= (bands[i].up_to_km as number)) return { band: bands[i], index: i };
  return null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export type DistanceInput = { routeKm: number | null; straightKm: number | null };
export type DeliveryResult =
  | { ok: true; fee_cents: number; model: string; distance_km: number | null; distance_method: 'route' | 'straight_line_estimate' | 'none'; free_applied: boolean; notes: string[] }
  | { ok: false; reason: 'distance_unavailable' | 'too_far' | 'quote_required' | 'no_zone_fee'; message: string; distance_km: number | null; distance_method: string };

/** Customer delivery fee for one store's delivery. */
export function deliveryFee(p: DeliveryParams, ctx: { distance: DistanceInput; zoneFeeCents: number | null; subtotalCents: number }): DeliveryResult {
  const notes: string[] = [];
  const free = p.free_over_cents != null && ctx.subtotalCents >= p.free_over_cents;
  let km: number | null = null; let method: 'route' | 'straight_line_estimate' | 'none' = 'none';
  const needsKm = p.model === 'distance_bands' || p.model === 'base_per_km';
  if (needsKm) {
    if (ctx.distance.routeKm != null) { km = round1(ctx.distance.routeKm); method = 'route'; }
    else if (p.fallback === 'straight_line' && ctx.distance.straightKm != null) { km = round1(ctx.distance.straightKm * p.straight_line_factor); method = 'straight_line_estimate'; notes.push(`Distance is an estimate (straight line x ${p.straight_line_factor}), not a driving route.`); }
    else if (p.fallback === 'zone_fee' && ctx.zoneFeeCents != null) {
      notes.push('No driving distance available: the zone fee was used.');
      return { ok: true, fee_cents: free ? 0 : ctx.zoneFeeCents, model: 'zone_fee', distance_km: null, distance_method: 'none', free_applied: free, notes };
    } else return { ok: false, reason: 'distance_unavailable', message: 'We cannot work out the delivery distance for this address yet.', distance_km: null, distance_method: 'none' };
    if (p.max_distance_km && km > p.max_distance_km)
      return p.over_max === 'quote'
        ? { ok: false, reason: 'quote_required', message: 'This address is beyond our standard delivery distance. Contact us for a delivery quote.', distance_km: km, distance_method: method }
        : { ok: false, reason: 'too_far', message: 'This address is too far for delivery from this store.', distance_km: km, distance_method: method };
  }
  let fee: number;
  switch (p.model) {
    case 'zone_fee':
      if (ctx.zoneFeeCents == null) return { ok: false, reason: 'no_zone_fee', message: 'No delivery fee is set for this area.', distance_km: null, distance_method: 'none' };
      fee = ctx.zoneFeeCents; break;
    case 'flat': fee = p.flat_cents ?? 0; break;
    case 'distance_bands': {
      const hit = bandValue(p.bands ?? [], km as number);
      if (!hit) return { ok: false, reason: 'too_far', message: 'This address is beyond our delivery distance.', distance_km: km, distance_method: method };
      fee = hit.band.fee_cents; break;
    }
    default: fee = Math.round((p.base_cents ?? 0) + (p.per_km_cents ?? 0) * (km as number));
  }
  if (p.min_fee_cents !== undefined) fee = Math.max(fee, p.min_fee_cents);
  if (p.max_fee_cents !== undefined) fee = Math.min(fee, p.max_fee_cents);
  if (free) { notes.push('Free delivery threshold reached.'); fee = 0; }
  return { ok: true, fee_cents: fee, model: p.model, distance_km: km, distance_method: method, free_applied: free, notes };
}

export type DriverPayResult = { total_cents: number; components: { base: number; distance_supplement: number; waiting: number; additional_pickup: number; handling: number }; distance_km: number | null; notes: string[] };

/** Driver earnings for one delivery, excluding tips (tips are recorded separately and belong entirely to the driver). */
export function driverPay(p: DriverPayParams, ctx: { distanceKm: number | null; waitingMinutes?: number; additionalPickups?: number; handling?: boolean }): DriverPayResult {
  const notes: string[] = []; let base = 0; let supplement = 0;
  if (p.bands?.length) {
    if (ctx.distanceKm == null) { base = p.unknown_distance_cents; notes.push('Distance unknown: the configured fallback amount was used.'); }
    else {
      const hit = bandValue(p.bands, ctx.distanceKm);
      if (hit) base = hit.band.base_cents;
      else {
        const last = p.bands[p.bands.length - 1]; base = last.base_cents;
        supplement = Math.round(p.beyond_per_km_cents * (ctx.distanceKm - (last.up_to_km as number)));
        notes.push('Beyond the last band: per-kilometre supplement applied.');
      }
    }
  } else base = p.flat_cents ?? 0;
  const over = Math.max(0, (ctx.waitingMinutes ?? 0) - p.waiting.grace_minutes);
  const waiting = p.waiting.per_minute_cents ? Math.min(p.waiting.max_cents || Infinity, Math.round(over * p.waiting.per_minute_cents)) : 0;
  const extra = (ctx.additionalPickups ?? 0) * p.additional_pickup_cents;
  const handling = ctx.handling ? p.handling_cents : 0;
  return { total_cents: base + supplement + waiting + extra + handling, components: { base, distance_supplement: supplement, waiting, additional_pickup: extra, handling }, distance_km: ctx.distanceKm, notes };
}

/** Marketplace commission on merchandise. Tax and delivery are never in the base. */
export function commissionCents(p: CommissionParams, ctx: { merchandiseCents: number; discountCents: number }): number {
  const base = p.base === 'after_discount' ? Math.max(0, ctx.merchandiseCents - ctx.discountCents) : ctx.merchandiseCents;
  const c = bps(base, p.bps);
  return ctx.merchandiseCents > 0 ? Math.min(Math.max(c, p.min_cents), base || ctx.merchandiseCents) : 0;
}

export function serviceFeeCents(p: ServiceFeeParams, subtotalCents: number): number {
  let f = p.mode === 'fixed' ? p.fixed_cents : bps(subtotalCents, p.percent_bps);
  f = Math.max(f, p.min_cents);
  if (p.max_cents) f = Math.min(f, p.max_cents);
  return f;
}

/* ------------------------------------------------------------------ resolver */

export type Resolved<T> = { id: string; version: number; name: string; scope_type: string; params: T } | null;
export type RuleScope = { zoneId?: string | null; storeId?: string | null; vendorId?: string | null };

/**
 * Which rule applies. Precedence: store agreement, then vendor agreement, then zone, then global; within a scope the newest rule whose effective date has passed.
 * `at` is the moment pricing was locked (the order's creation time), so later changes never touch an order already placed.
 */
export async function resolveRule<K extends Kind>(c: Queryable, kind: K, scope: RuleScope, at: Date = new Date()): Promise<Resolved<z.infer<(typeof SCHEMAS)[K]>>> {
  const r = (await c.query(
    `SELECT id, version, name, scope_type, params FROM pricing_rules
      WHERE kind = $1 AND status IN ('active','retired') AND effective_from IS NOT NULL AND effective_from <= $5 AND (effective_to IS NULL OR effective_to > $5)
        AND (scope_type = 'global' OR (scope_type = 'zone' AND scope_id = $2) OR (scope_type = 'store' AND scope_id = $3) OR (scope_type = 'vendor' AND scope_id = $4))
      ORDER BY CASE scope_type WHEN 'store' THEN 0 WHEN 'vendor' THEN 1 WHEN 'zone' THEN 2 ELSE 3 END, effective_from DESC, version DESC LIMIT 1`,
    [kind, scope.zoneId ?? null, scope.storeId ?? null, scope.vendorId ?? null, at])).rows[0];
  if (!r) return null;
  const parsed = SCHEMAS[kind].safeParse(r.params);
  if (!parsed.success) return null;   // a rule that no longer validates is ignored rather than guessed at; the admin screen flags it
  return { id: r.id, version: r.version, name: r.name, scope_type: r.scope_type, params: parsed.data as any };
}

/* ------------------------------------------------------------------ simulator */

export type SimInput = {
  merchandise_cents: number; discount_cents?: number; distance_km: number | null; zone_fee_cents?: number | null; tip_cents?: number;
  delivery: DeliveryParams; driver_pay: DriverPayParams; commission: CommissionParams; service_fee?: ServiceFeeParams | null;
  tax_bps_merchandise?: number; tax_bps_delivery?: number; waiting_minutes?: number;
  /** An ASSUMPTION about what the payment provider charges, never an actual charge. */
  processing_bps?: number; processing_fixed_cents?: number; vendor_funded_discount?: boolean;
};

/** The same calculation production uses, on made-up numbers. Creates nothing, charges nothing. */
export function simulate(i: SimInput) {
  const discount = i.discount_cents ?? 0;
  const dist: DistanceInput = { routeKm: i.distance_km, straightKm: null };
  const del = deliveryFee(i.delivery, { distance: dist, zoneFeeCents: i.zone_fee_cents ?? null, subtotalCents: i.merchandise_cents });
  const delivery = del.ok ? del.fee_cents : 0;
  const service = i.service_fee ? serviceFeeCents(i.service_fee, i.merchandise_cents) : 0;
  const commission = commissionCents(i.commission, { merchandiseCents: i.merchandise_cents, discountCents: discount });
  const pay = driverPay(i.driver_pay, { distanceKm: i.distance_km, waitingMinutes: i.waiting_minutes });
  const taxMerch = bps(i.merchandise_cents - discount, i.tax_bps_merchandise ?? 0);
  const taxDelivery = bps(delivery + service, i.tax_bps_delivery ?? 0);
  const tip = i.tip_cents ?? 0;
  const customerTotal = i.merchandise_cents - discount + delivery + service + taxMerch + taxDelivery + tip;
  const processing = bps(customerTotal, i.processing_bps ?? 0) + (i.processing_fixed_cents ?? 0);
  // Who pays for a discount: the vendor (their proceeds fall) or EAZyfoods (its margin falls).
  const vendorNet = i.merchandise_cents - commission - (i.vendor_funded_discount ? discount : 0);
  const platformDiscount = i.vendor_funded_discount ? 0 : discount;
  const revenue = commission + delivery + service;          // tax and tips are pass-through, never revenue
  const margin = revenue - pay.total_cents - processing - platformDiscount;
  const warnings: string[] = [];
  if (!del.ok) warnings.push(del.message);
  if (margin < 0) warnings.push('This scenario loses money for EAZyfoods.');
  if (delivery < pay.total_cents) warnings.push('The delivery fee does not cover the driver pay on its own.');
  return {
    delivery: del, driver: pay,
    customer: { merchandise_cents: i.merchandise_cents, discount_cents: discount, delivery_cents: delivery, service_fee_cents: service, tax_cents: taxMerch + taxDelivery, tip_cents: tip, total_cents: customerTotal },
    vendor: { commission_cents: commission, net_cents: vendorNet },
    platform: { commission_cents: commission, delivery_revenue_cents: delivery, service_fee_cents: service, revenue_cents: revenue, driver_pay_cents: pay.total_cents, processing_cents_assumed: processing, discount_funded_cents: platformDiscount, margin_cents: margin, margin_pct: revenue ? Math.round((margin / revenue) * 1000) / 10 : null },
    delivery_recovery_pct: pay.total_cents ? Math.round((delivery / pay.total_cents) * 100) : null,
    assumptions: ['Processing cost is an assumption, not an actual provider charge.', 'Tax and tips are not EAZyfoods revenue.'],
    warnings,
  };
}
