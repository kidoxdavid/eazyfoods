import { useMemo, useState } from 'react';
import { useApi } from './hooks';
import { Loading, Notice } from './ui';

type Slot = { start: string; end: string; remaining: number };
type Resp = { enabled: boolean; slots: Slot[]; lead_minutes?: number; slot_minutes?: number };
const TZ = 'America/Edmonton';
const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
const time = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const slotText = (start: string, end?: string | null) => `${dayLabel(start)}, ${time(start)}${end ? `–${time(end)}` : ''}`;

/** Day chips, then time buttons, for a store that takes pre-orders. */
export function SlotPicker({ slug, value, onChange }: { slug: string; value?: string; onChange: (start: string | undefined) => void }) {
  const { data, loading, error } = useApi<Resp>(`/slots/${slug}`);
  const days = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of data?.slots ?? []) { const k = dayKey(s.start); (m.get(k) ?? m.set(k, []).get(k)!).push(s); }
    return [...m.entries()];
  }, [data]);
  const [day, setDay] = useState<string>();
  const active = day ?? (value ? dayKey(value) : days[0]?.[0]);
  if (loading) return <Loading label="Loading times" />;
  if (error || !data) return <Notice tone="error">Could not load available times.</Notice>;
  if (!days.length) return <Notice tone="warn">No times are available right now.</Notice>;
  const list = days.find(([k]) => k === active)?.[1] ?? [];
  return (
    <div className="slotpick">
      <div className="slot-selects">
        <label><span className="sr-only">Day</span>
          <select className="input" aria-label="Day" value={active} onChange={(e) => { setDay(e.target.value); onChange(undefined); }}>
            {days.map(([k, s]) => <option key={k} value={k}>{dayLabel(s[0].start)}</option>)}
          </select></label>
        <label><span className="sr-only">Time</span>
          <select className="input" aria-label="Time" value={value && list.some((s) => s.start === value) ? value : ''} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">Choose a time</option>
            {list.map((s) => <option key={s.start} value={s.start}>{time(s.start)} – {time(s.end)}{s.remaining <= 1 ? ' · last place' : ''}</option>)}
          </select></label>
      </div>
      <p className="small muted">Times are Calgary time. Your order is confirmed by the store, and ready within the window you pick.</p>
    </div>
  );
}

/** The time a customer picked in the basket for each store, remembered until checkout (so they do not pick twice). */
const KEY = 'ez_basket_slots_v1';
export function savedSlots(): Record<string, string> {
  try { const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>; return Object.fromEntries(Object.entries(o).filter(([, v]) => new Date(v).getTime() > Date.now())); } catch { return {}; }
}
export function saveSlot(store: string, start: string | undefined) {
  try { const o = savedSlots(); if (start) o[store] = start; else delete o[store]; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* storage unavailable */ }
}
export const clearSlots = () => { try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ } };

/** In the basket: "When do you want it?" for every store that takes time slots. */
export function BasketTimes({ stores }: { stores: { slug: string; name: string }[] }) {
  return <>{stores.map((s) => <StoreTimes key={s.slug} slug={s.slug} name={s.name} many={stores.length > 1} />)}</>;
}
function StoreTimes({ slug, name, many }: { slug: string; name: string; many: boolean }) {
  const { data } = useApi<Resp>(`/slots/${slug}`);
  const [val, setVal] = useState<string | undefined>(() => savedSlots()[slug]);
  if (!data?.enabled) return null;
  return (
    <section className="basket-times" aria-label={`When do you want your order from ${name}?`}>
      <h2>When do you want it?{many && <span className="muted small"> · {name}</span>}</h2>
      <SlotPicker slug={slug} value={val} onChange={(v) => { setVal(v); saveSlot(slug, v); }} />
      {val ? <p className="small"><b>{slotText(val, new Date(new Date(val).getTime() + (data.slot_minutes ?? 60) * 60000).toISOString())}</b> is saved. You confirm it at checkout.</p> : <p className="small muted">Or leave it as soon as possible.</p>}
    </section>
  );
}
