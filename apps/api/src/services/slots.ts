import type { Queryable } from '../lib/db-types.js';

export type Slot = { start: string; end: string; remaining: number };

/**
 * Bookable pre-order slots for a store, computed in the store's own time zone from its opening hours:
 * past the lead time, within the booking horizon, not on a closure day, and with room left in the slot.
 * A slot counts every live order booked into it, including orders still waiting for payment.
 */
export async function listSlots(c: Queryable, storeId: string): Promise<Slot[]> {
  const r = await c.query(
    `WITH s AS (SELECT id, timezone AS tz, preorder_lead_minutes AS lead, preorder_max_days AS horizon, slot_minutes AS len, slot_capacity AS cap FROM stores WHERE id = $1 AND preorders_enabled),
          days AS (SELECT d::date AS day FROM s, generate_series((now() AT TIME ZONE s.tz)::date, (now() AT TIME ZONE s.tz)::date + s.horizon, '1 day') d),
          win AS (SELECT days.day, h.opens, h.closes FROM days JOIN store_hours h ON h.store_id = $1 AND h.dow = EXTRACT(DOW FROM days.day)
                   WHERE NOT EXISTS (SELECT 1 FROM store_closures x WHERE x.store_id = $1 AND x.on_date = days.day)),
          cand AS (SELECT ((w.day + w.opens) + make_interval(mins => off)) AT TIME ZONE s.tz AS start, s.len, s.cap, s.lead
                     FROM win w CROSS JOIN s, LATERAL generate_series(0, GREATEST(-1, (EXTRACT(EPOCH FROM (w.closes - w.opens)) / 60)::int - s.len), s.len) off)
     SELECT c.start, c.start + make_interval(mins => c.len) AS "end",
            c.cap - (SELECT count(*) FROM suborders so WHERE so.store_id = $1 AND so.scheduled_for = c.start AND so.status NOT IN ('rejected','cancelled','expired'))::int AS remaining
       FROM cand c WHERE c.start >= now() + make_interval(mins => c.lead) ORDER BY c.start LIMIT 400`, [storeId]);
  return r.rows.filter((x) => x.remaining > 0).map((x) => ({ start: new Date(x.start).toISOString(), end: new Date(x.end).toISOString(), remaining: x.remaining }));
}

export async function findSlot(c: Queryable, storeId: string, startIso: string): Promise<Slot | null> {
  const want = new Date(startIso).getTime();
  return (await listSlots(c, storeId)).find((s) => new Date(s.start).getTime() === want) ?? null;
}
