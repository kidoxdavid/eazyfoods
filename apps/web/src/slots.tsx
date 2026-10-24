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
      <div className="catchips" role="group" aria-label="Day">{days.map(([k, s]) => <button type="button" key={k} className={k === active ? 'on' : ''} aria-pressed={k === active} onClick={() => setDay(k)}>{dayLabel(s[0].start)}</button>)}</div>
      <div className="slot-grid" role="group" aria-label="Time">
        {list.map((s) => (
          <button type="button" key={s.start} className={`slot ${value === s.start ? 'on' : ''}`} aria-pressed={value === s.start} onClick={() => onChange(value === s.start ? undefined : s.start)}>
            {time(s.start)}<span className="small"> – {time(s.end)}</span>{s.remaining <= 1 && <span className="small slot-left"> · last place</span>}
          </button>
        ))}
      </div>
      <p className="small muted">Times are Calgary time. Your order is confirmed by the store, and ready within the window you pick.</p>
    </div>
  );
}
