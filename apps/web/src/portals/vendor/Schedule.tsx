import { useEffect, useState } from 'react';
import { put } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Button, Card, Field, Input, Loading, Notice, Select } from '../../ui';
import { useVendor } from './Shared';

type S = { preorders_enabled: boolean; preorder_lead_minutes: number; preorder_max_days: number; slot_minutes: number; slot_capacity: number; closures: { on_date: string; reason: string | null }[] };

/** Pre-orders (time slots) and days off. Slots come from the opening hours above. */
export default function Schedule() {
  const { storeId } = useVendor(); const toast = useToast();
  const d = useApi<S>(`/vendor/stores/${storeId}/schedule`);
  const [f, setF] = useState<S | null>(null);
  const [date, setDate] = useState(''); const [why, setWhy] = useState('');
  useEffect(() => { if (d.data) setF(d.data); }, [d.data]);
  const save = useAction(async () => { await put(`/vendor/stores/${storeId}/schedule`, f); toast('Pre-order settings saved.'); d.reload(); });
  if (d.loading && !f) return <Card><Loading /></Card>;
  if (!f) return null;
  const set = <K extends keyof S>(k: K, v: S[K]) => setF({ ...f, [k]: v });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card>
      <h2>Pre-orders and days off</h2>
      <p className="muted small">Let customers book a time slot for later. Slots follow your opening hours. A slot fills up after the number of orders you allow.</p>
      {save.error && <Notice tone="error">{save.error}</Notice>}
      <form onSubmit={(e) => { e.preventDefault(); save.run(); }}>
        <label className="check"><input type="checkbox" checked={f.preorders_enabled} onChange={(e) => set('preorders_enabled', e.target.checked)} /><span><strong>Accept pre-orders</strong><br /><span className="muted small">Portions you set are shared between pre-orders and orders for now, so only list what you can make.</span></span></label>
        {f.preorders_enabled && <div className="form-grid">
          <Field label="Slot length"><Select value={f.slot_minutes} onChange={(e) => set('slot_minutes', Number(e.target.value))}>{[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}</Select></Field>
          <Field label="Orders per slot"><Input type="number" min={1} max={50} value={f.slot_capacity} onChange={(e) => set('slot_capacity', Number(e.target.value))} inputMode="numeric" /></Field>
          <Field label="Notice needed" hint="Earliest a customer can book"><Select value={f.preorder_lead_minutes} onChange={(e) => set('preorder_lead_minutes', Number(e.target.value))}>{[[30, '30 minutes'], [60, '1 hour'], [120, '2 hours'], [240, '4 hours'], [720, '12 hours'], [1440, '1 day'], [2880, '2 days']].map(([m, l]) => <option key={m} value={m}>{l}</option>)}</Select></Field>
          <Field label="Book up to"><Select value={f.preorder_max_days} onChange={(e) => set('preorder_max_days', Number(e.target.value))}>{[1, 2, 3, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''} ahead</option>)}</Select></Field>
        </div>}
        <h3>Days off</h3>
        <p className="muted small">No pre-order slots are offered on these days.</p>
        <ul className="pill-list" role="list" style={{ listStyle: 'none', padding: 0 }}>{f.closures.map((c) => (
          <li key={c.on_date}><span className="badge">{c.on_date}{c.reason ? ` · ${c.reason}` : ''}</span> <Button type="button" size="sm" variant="ghost" aria-label={`Remove day off ${c.on_date}`} onClick={() => set('closures', f.closures.filter((x) => x.on_date !== c.on_date))}>Remove</Button></li>))}</ul>
        <div className="row wrap top">
          <Field label="Date"><Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Reason (optional)"><Input value={why} maxLength={80} onChange={(e) => setWhy(e.target.value)} /></Field>
          <Button type="button" variant="secondary" style={{ marginTop: 24 }} disabled={!date || f.closures.some((c) => c.on_date === date)} onClick={() => { set('closures', [...f.closures, { on_date: date, reason: why || null }].sort((a, b) => a.on_date.localeCompare(b.on_date))); setDate(''); setWhy(''); }}>Add day off</Button>
        </div>
        <div className="row end"><Button type="submit" busy={save.busy}>Save</Button></div>
      </form>
    </Card>
  );
}
