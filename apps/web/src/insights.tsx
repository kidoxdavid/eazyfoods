import { useId, useState } from 'react';
import { money } from './api';
import { useApi } from './hooks';
import { Card, DataTable, ErrorBox, Loading, Notice, PageHeader } from './ui';

type K = { value: number | null; prev: number | null; delta_pct: number | null };
type D = {
  days: number; kpis: { orders: K; gross_cents: K; aov_cents: K; units: K; customers: K; new_customers: K; cancel_rate_pct: K };
  series: { day: string; orders: number; gross_cents: number }[]; by_hour: { hour: number; orders: number }[]; by_weekday: { dow: number; orders: number }[];
  status_mix: { status: string; n: number }[]; fulfilment_mix: { method: string; n: number }[]; top_products: { name: string; units: number; gross_cents: number }[];
  top_stores: { name: string; orders: number; gross_cents: number }[]; speed: { accept_minutes: number | null; prep_minutes: number | null }; note: string;
};
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Delta({ k, invert, fmt }: { k: K; invert?: boolean; fmt?: (n: number) => string }) {
  if (k.delta_pct == null) return <span className="delta flat">{k.prev ? '' : 'No earlier data'}</span>;
  const up = k.delta_pct > 0, good = invert ? !up : up;
  return <span className={`delta ${k.delta_pct === 0 ? 'flat' : good ? 'good' : 'bad'}`}>{k.delta_pct === 0 ? 'No change' : `${up ? '▲' : '▼'} ${Math.abs(k.delta_pct)}%`}<span className="muted"> vs previous {fmt ? '' : 'period'}</span></span>;
}
function Tile({ label, k, fmt, invert }: { label: string; k: K; fmt: (n: number) => string; invert?: boolean }) {
  return <div className="stat insight-tile"><span className="stat-label">{label}</span><strong className="stat-value">{k.value == null ? '—' : fmt(k.value)}</strong><Delta k={k} invert={invert} /></div>;
}

/** Area chart of one number per day, with a keyboard/hover read-out and a table alternative. */
function Trend({ series, pick, fmt, title }: { series: D['series']; pick: (r: D['series'][number]) => number; fmt: (n: number) => string; title: string }) {
  const [hi, setHi] = useState<number | null>(null);
  const id = useId();
  const W = 640, H = 180, P = 8;
  const max = Math.max(1, ...series.map(pick));
  const x = (i: number) => P + (series.length < 2 ? 0 : (i * (W - 2 * P)) / (series.length - 1));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P - 8);
  const line = series.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pick(r)).toFixed(1)}`).join(' ');
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const cur = hi != null ? series[hi] : null;
  return (
    <div className="trend">
      <div className="trend-read" aria-live="polite">{cur ? <><strong>{fmt(pick(cur))}</strong> <span className="muted">on {cur.day}</span></> : <span className="muted">Hover or use ← → on the chart to read a day</span>}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${series.length} days, highest ${fmt(max)}`} tabIndex={0} className="trend-svg"
        onKeyDown={(e) => { if (e.key === 'ArrowRight') setHi((h) => Math.min(series.length - 1, (h ?? -1) + 1)); else if (e.key === 'ArrowLeft') setHi((h) => Math.max(0, (h ?? series.length) - 1)); else if (e.key === 'Escape') setHi(null); }}
        onMouseLeave={() => setHi(null)} onBlur={() => setHi(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHi(Math.max(0, Math.min(series.length - 1, Math.round(((e.clientX - r.left) / r.width * W - P) / ((W - 2 * P) / Math.max(1, series.length - 1)))))); }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--green)" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill={`url(#${id})`} /><path d={line} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {hi != null && <><line x1={x(hi)} x2={x(hi)} y1={P} y2={H - P} stroke="var(--ink-2)" strokeDasharray="3 3" /><circle cx={x(hi)} cy={y(pick(series[hi]))} r="5" fill="var(--green)" stroke="var(--card)" strokeWidth="2" /></>}
      </svg>
      <div className="row between small muted"><span>{series[0]?.day}</span><span>{series[series.length - 1]?.day}</span></div>
      <details><summary className="small">Show as a table</summary>
        <DataTable rows={series} rowKey={(r) => r.day} columns={[{ key: 'd', header: 'Day', render: (r) => r.day }, { key: 'v', header: title, render: (r) => fmt(pick(r)) }]} /></details>
    </div>
  );
}

function Bars({ items, label, title }: { items: { label: string; n: number }[]; label: string; title: string }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <>
      <div className="bars" role="img" aria-label={`${title}: ${items.map((i) => `${i.label} ${i.n}`).join(', ')}`}>{items.map((i) => <div key={i.label} className="bar-col" title={`${i.label}: ${i.n} ${label}`}><div className={`bar-fill ${i.n ? '' : 'zero'}`} style={{ height: `${Math.max(2, (i.n / max) * 100)}%` }} /></div>)}</div>
      <div className="bars-labels" aria-hidden="true">{items.map((i, k) => <span key={i.label}>{items.length > 12 ? (k % 3 === 0 ? i.label : '') : i.label}</span>)}</div>
    </>
  );
}

function Share({ rows, title }: { rows: { name: string; n: number }[]; title: string }) {
  const total = rows.reduce((a, r) => a + r.n, 0);
  if (!total) return <p className="muted small">No orders in this period.</p>;
  return <ul className="share" role="list" aria-label={title}>{rows.map((r) => <li key={r.name}><span className="share-name">{r.name.replace(/_/g, ' ')}</span><span className="share-bar" aria-hidden="true"><i style={{ width: `${(r.n / total) * 100}%` }} /></span><span className="share-n">{r.n} · {Math.round((r.n / total) * 100)}%</span></li>)}</ul>;
}

export function InsightsView({ path, title, sub }: { path: string; title: string; sub: string }) {
  const [days, setDays] = useState(30);
  const d = useApi<D>(`${path}${path.includes('?') ? '&' : '?'}days=${days}`);
  const mins = (n: number | null) => (n == null ? '—' : n < 1 ? '<1 min' : `${n} min`);
  return (
    <>
      <PageHeader title={title} sub={sub} />
      <div className="seg" role="group" aria-label="Time period" style={{ marginBottom: 12 }}>{[7, 30, 90].map((n) => <button key={n} className={days === n ? 'on' : ''} aria-pressed={days === n} onClick={() => setDays(n)}>Last {n} days</button>)}</div>
      {d.loading && !d.data && <Loading />}
      {d.error && <ErrorBox message={d.error} retry={d.reload} />}
      {d.data && (<>
        <div className="grid cols-4">
          <Tile label="Orders" k={d.data.kpis.orders} fmt={(n) => String(n)} />
          <Tile label="Gross sales" k={d.data.kpis.gross_cents} fmt={money} />
          <Tile label="Average order" k={d.data.kpis.aov_cents} fmt={money} />
          <Tile label="Items sold" k={d.data.kpis.units} fmt={(n) => String(n)} />
          <Tile label="Customers" k={d.data.kpis.customers} fmt={(n) => String(n)} />
          <Tile label="New customers" k={d.data.kpis.new_customers} fmt={(n) => String(n)} />
          <Tile label="Cancelled or rejected" k={d.data.kpis.cancel_rate_pct} fmt={(n) => `${n}%`} invert />
          <div className="stat insight-tile"><span className="stat-label">Speed</span><strong className="stat-value">{mins(d.data.speed.accept_minutes)}</strong><span className="muted small">to accept · {mins(d.data.speed.prep_minutes)} to prepare</span></div>
        </div>
        <Card><h2>Gross sales per day</h2><Trend series={d.data.series} pick={(r) => r.gross_cents} fmt={money} title="Gross sales" /></Card>
        <Card><h2>Orders per day</h2><Trend series={d.data.series} pick={(r) => r.orders} fmt={(n) => `${n} order${n === 1 ? '' : 's'}`} title="Orders" /></Card>
        <div className="grid cols-2">
          <Card><h2>When people order</h2><p className="muted small">By hour of day (Calgary time)</p><Bars title="Orders by hour" label="orders" items={d.data.by_hour.map((h) => ({ label: String(h.hour), n: h.orders }))} /></Card>
          <Card><h2>Busiest days</h2><p className="muted small">By day of the week</p><Bars title="Orders by weekday" label="orders" items={d.data.by_weekday.map((w) => ({ label: DOW[w.dow], n: w.orders }))} /></Card>
          <Card><h2>Order outcomes</h2><Share title="Order outcomes" rows={d.data.status_mix.map((s) => ({ name: s.status, n: s.n }))} /></Card>
          <Card><h2>Delivery or pickup</h2><Share title="Delivery or pickup" rows={d.data.fulfilment_mix.map((s) => ({ name: s.method, n: s.n }))} /></Card>
          <Card><h2>Top products</h2><DataTable rows={d.data.top_products} rowKey={(r) => r.name} empty="No sales in this period." columns={[{ key: 'n', header: 'Product' }, { key: 'u', header: 'Units', render: (r) => r.units }, { key: 'g', header: 'Gross', render: (r) => money(r.gross_cents) }]} /></Card>
          {d.data.top_stores.length > 0 && <Card><h2>Top stores</h2><DataTable rows={d.data.top_stores} rowKey={(r) => r.name} columns={[{ key: 'n', header: 'Store' }, { key: 'o', header: 'Orders', render: (r) => r.orders }, { key: 'g', header: 'Gross', render: (r) => money(r.gross_cents) }]} /></Card>}
        </div>
        <Notice>{d.data.note}</Notice>
      </>)}
    </>
  );
}
