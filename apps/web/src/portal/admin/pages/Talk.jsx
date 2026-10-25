import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast, useAction, useApi } from '../../shared/hooks'
import { post, money, fmtDateTime } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '../../shared/ui'
import { Need } from '../common'

/* ------------------------------------------------------------- Messages */

/** Staff side of the vendor conversations: every vendor's threads, close and reopen, start a new one. */
export function Messages() {
  const base = '/admin/messages'
  const list = useApi(base)
  const [sel, setSel] = useState(null)
  const [composing, setComposing] = useState(false)
  useEffect(() => { const t = setInterval(list.reload, 20000); return () => clearInterval(t) }, [list.reload])
  return (
    <Need perm={['vendors.manage']} what="vendor messages">
      <PageHeader title="Vendor messages" sub="Conversations with vendors: onboarding, catalogue and payout questions." actions={<Button onClick={() => setComposing(true)}><Plus className="h-4 w-4" /> New conversation</Button>} />
      {list.loading && !list.data && <Spinner className="h-40" />}
      <Alert>{list.error}</Alert>
      {list.data && !list.data.length && <Empty title="No conversations yet" />}
      {list.data?.length > 0 && (
        <div className="grid lg:grid-cols-[22rem_1fr] gap-4 items-start">
          <ul className={`bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 ${sel ? 'hidden lg:block' : ''}`} aria-label="Conversations">
            {list.data.map((t) => (
              <li key={t.id}><button type="button" onClick={() => setSel(t.id)} aria-current={sel === t.id} className={`w-full text-left px-4 py-3 space-y-0.5 hover:bg-gray-50 ${sel === t.id ? 'bg-primary-50' : ''}`}>
                <span className="flex justify-between gap-2"><strong className="text-sm truncate">{t.subject}</strong>{t.unread > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full" aria-label={`${t.unread} unread`}>{t.unread}</span>}</span>
                <span className="block text-xs text-gray-500">{t.vendor_name} · {fmtDateTime(t.last_message_at)}{t.status === 'closed' ? ' · closed' : ''}</span>
                {t.preview && <span className="block text-xs text-gray-700 truncate">{t.preview}</span>}
              </button></li>
            ))}
          </ul>
          {sel ? <Thread key={sel} base={base} id={sel} onChanged={list.reload} onBack={() => setSel(null)} /> : <div className="hidden lg:block"><Empty title="Choose a conversation" /></div>}
        </div>
      )}
      {composing && <Compose base={base} onClose={() => setComposing(false)} onSent={(id) => { setComposing(false); list.reload(); setSel(id) }} />}
    </Need>
  )
}

function Thread({ base, id, onChanged, onBack }) {
  const d = useApi(`${base}/${id}`)
  const [text, setText] = useState('')
  const end = useRef(null)
  useEffect(() => { const t = setInterval(d.reload, 15000); return () => clearInterval(t) }, [d.reload])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [d.data?.messages.length])
  const send = useAction(async () => { await post(`${base}/${id}/reply`, { body: text }); setText(''); d.reload(); onChanged() })
  const setStatus = useAction(async (status) => { await post(`${base}/${id}/status`, { status }); d.reload(); onChanged() })
  if (d.loading && !d.data) return <Card><Spinner className="h-40" /></Card>
  if (d.error) return <Alert>{d.error}</Alert>
  if (!d.data) return null
  const { thread, messages } = d.data
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><button type="button" className="lg:hidden text-sm text-primary-700 underline mb-1" onClick={onBack}>← All conversations</button><h2 className="text-lg font-bold">{thread.subject}</h2>{thread.vendor_name && <span className="text-xs text-gray-500">{thread.vendor_name}</span>}</div>
        <div className="flex items-center gap-2">{thread.status === 'closed' && <Badge>Closed</Badge>}<Button size="sm" variant="secondary" busy={setStatus.busy} onClick={() => setStatus.run(thread.status === 'open' ? 'closed' : 'open')}>{thread.status === 'open' ? 'Close' : 'Reopen'}</Button></div>
      </div>
      <div role="log" aria-label="Messages" className="my-3 space-y-2 max-h-[50vh] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from_staff ? 'ml-auto bg-primary-50 text-primary-900' : 'bg-gray-100'}`}>
            <div className="text-xs text-gray-500">{m.from_staff ? 'EAZyfoods team' : m.author} · {fmtDateTime(m.created_at)}</div>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <Alert>{send.error}</Alert>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.run() }} className="space-y-2">
        <Field label="Reply" htmlFor="mrep"><Textarea id="mrep" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} /></Field>
        <div className="flex justify-end"><Button type="submit" busy={send.busy} disabled={!text.trim()}>Send</Button></div>
      </form>
    </Card>
  )
}

function Compose({ base, onClose, onSent }) {
  const vendors = useApi('/admin/vendors')
  const [vendor, setVendor] = useState(''); const [subject, setSubject] = useState(''); const [text, setText] = useState('')
  const send = useAction(async () => { const r = await post(base, { vendor_id: vendor, subject, body: text }); toast('Message sent'); onSent(r.id) })
  return (
    <Modal title="New conversation" onClose={onClose}>
      <div className="space-y-3">
        <Alert>{send.error}</Alert>
        <Field label="Vendor" htmlFor="mcv"><Select id="mcv" value={vendor} onChange={(e) => setVendor(e.target.value)}><option value="">Choose a vendor…</option>{vendors.data?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
        <Field label="Subject" htmlFor="mcs"><Input id="mcs" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} /></Field>
        <Field label="Message" htmlFor="mcm"><Textarea id="mcm" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} /></Field>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button busy={send.busy} disabled={subject.trim().length < 2 || !text.trim() || !vendor} onClick={() => send.run()}>Send</Button></div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------- Insights */

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Tile({ label, k, fmt, invert }) {
  const d = k.delta_pct
  const good = d != null && (invert ? d < 0 : d > 0)
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-xs sm:text-sm text-gray-600">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">{k.value == null ? '—' : fmt(k.value)}</p>
      <p className={`text-xs ${d == null || d === 0 ? 'text-gray-500' : good ? 'text-green-700' : 'text-red-700'}`}>{d == null ? (k.prev ? '' : 'No earlier data') : d === 0 ? 'No change' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}% vs previous period`}</p>
    </div>
  )
}

function Trend({ series, pick, fmt, title }) {
  const [hi, setHi] = useState(null)
  const W = 640, H = 180, P = 8
  const max = Math.max(1, ...series.map(pick))
  const x = (i) => P + (series.length < 2 ? 0 : (i * (W - 2 * P)) / (series.length - 1))
  const y = (v) => H - P - (v / max) * (H - 2 * P - 8)
  const line = series.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pick(r)).toFixed(1)}`).join(' ')
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`
  const cur = hi != null ? series[hi] : null
  return (
    <div>
      <p className="text-sm h-5" aria-live="polite">{cur ? <><strong>{fmt(pick(cur))}</strong> <span className="text-gray-500">on {cur.day}</span></> : <span className="text-gray-500">Hover or use ← → on the chart to read a day</span>}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${series.length} days, highest ${fmt(max)}`} tabIndex={0} className="w-full h-auto text-primary-600"
        onKeyDown={(e) => { if (e.key === 'ArrowRight') setHi((h) => Math.min(series.length - 1, (h ?? -1) + 1)); else if (e.key === 'ArrowLeft') setHi((h) => Math.max(0, (h ?? series.length) - 1)); else if (e.key === 'Escape') setHi(null) }}
        onMouseLeave={() => setHi(null)} onBlur={() => setHi(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHi(Math.max(0, Math.min(series.length - 1, Math.round(((e.clientX - r.left) / r.width * W - P) / ((W - 2 * P) / Math.max(1, series.length - 1)))))) }}>
        <path d={area} fill="currentColor" fillOpacity=".15" /><path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {hi != null && <><line x1={x(hi)} x2={x(hi)} y1={P} y2={H - P} stroke="#6b7280" strokeDasharray="3 3" /><circle cx={x(hi)} cy={y(pick(series[hi]))} r="5" fill="currentColor" stroke="#fff" strokeWidth="2" /></>}
      </svg>
      <div className="flex justify-between text-xs text-gray-500"><span>{series[0]?.day}</span><span>{series[series.length - 1]?.day}</span></div>
      <details className="mt-2"><summary className="text-xs cursor-pointer text-primary-700">Show as a table</summary>
        <DataTable rows={series} rowKey={(r) => r.day} columns={[{ key: 'd', header: 'Day', render: (r) => r.day }, { key: 'v', header: title, render: (r) => fmt(pick(r)) }]} /></details>
    </div>
  )
}

function Bars({ items, title }) {
  const max = Math.max(1, ...items.map((i) => i.n))
  return (
    <>
      <div className="flex items-end gap-0.5 h-32" role="img" aria-label={`${title}: ${items.map((i) => `${i.label} ${i.n}`).join(', ')}`}>
        {items.map((i) => <div key={i.label} className="flex-1 h-full flex items-end" title={`${i.label}: ${i.n}`}><div className="w-full bg-primary-500 rounded-t" style={{ height: `${Math.max(2, (i.n / max) * 100)}%`, opacity: i.n ? 1 : 0.25 }} /></div>)}
      </div>
      <div className="flex gap-0.5 text-[10px] text-gray-500" aria-hidden="true">{items.map((i, k) => <span key={i.label} className="flex-1 text-center">{items.length > 12 ? (k % 3 === 0 ? i.label : '') : i.label}</span>)}</div>
    </>
  )
}

function Share({ rows, title }) {
  const total = rows.reduce((a, r) => a + r.n, 0)
  if (!total) return <p className="text-sm text-gray-500">No orders in this period.</p>
  return (
    <ul className="space-y-1.5" aria-label={title}>{rows.map((r) => (
      <li key={r.name} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-2 text-sm"><span className="capitalize truncate">{r.name.replace(/_/g, ' ')}</span>
        <span className="h-2 rounded bg-gray-100" aria-hidden="true"><i className="block h-2 rounded bg-primary-500" style={{ width: `${(r.n / total) * 100}%` }} /></span><span className="text-xs text-gray-600 text-right">{r.n} · {Math.round((r.n / total) * 100)}%</span></li>))}</ul>
  )
}

export function Insights() {
  const [days, setDays] = useState(30)
  const d = useApi(`/admin/reports/insights?days=${days}`)
  const mins = (n) => (n == null ? '—' : n < 1 ? '<1 min' : `${n} min`)
  const x = d.data
  return (
    <Need perm={['reports.view']} what="insights">
      <PageHeader title="Insights" sub="Sales, customers and speed across the whole marketplace." />
      <div className="flex gap-2" role="group" aria-label="Time period">{[7, 30, 90].map((n) => <Button key={n} size="sm" variant={days === n ? 'primary' : 'secondary'} aria-pressed={days === n} onClick={() => setDays(n)}>Last {n} days</Button>)}</div>
      {d.loading && !x && <Spinner className="h-40" />}
      <Alert>{d.error}</Alert>
      {x && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Tile label="Orders" k={x.kpis.orders} fmt={String} /><Tile label="Gross sales" k={x.kpis.gross_cents} fmt={money} /><Tile label="Average order" k={x.kpis.aov_cents} fmt={money} /><Tile label="Items sold" k={x.kpis.units} fmt={String} />
            <Tile label="Customers" k={x.kpis.customers} fmt={String} /><Tile label="New customers" k={x.kpis.new_customers} fmt={String} /><Tile label="Cancelled or rejected" k={x.kpis.cancel_rate_pct} fmt={(n) => `${n}%`} invert />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><p className="text-xs sm:text-sm text-gray-600">Speed</p><p className="text-xl sm:text-2xl font-bold">{mins(x.speed.accept_minutes)}</p><p className="text-xs text-gray-500">to accept · {mins(x.speed.prep_minutes)} to prepare</p></div>
          </div>
          <Card title="Gross sales per day"><Trend series={x.series} pick={(r) => r.gross_cents} fmt={money} title="Gross sales" /></Card>
          <Card title="Orders per day"><Trend series={x.series} pick={(r) => r.orders} fmt={(n) => `${n} order${n === 1 ? '' : 's'}`} title="Orders" /></Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="When people order" sub="By hour of day (Calgary time)"><Bars title="Orders by hour" items={x.by_hour.map((h) => ({ label: String(h.hour), n: h.orders }))} /></Card>
            <Card title="Busiest days" sub="By day of the week"><Bars title="Orders by weekday" items={x.by_weekday.map((w) => ({ label: DOW[w.dow], n: w.orders }))} /></Card>
            <Card title="Order outcomes"><Share title="Order outcomes" rows={x.status_mix.map((s) => ({ name: s.status, n: s.n }))} /></Card>
            <Card title="Delivery or pickup"><Share title="Delivery or pickup" rows={x.fulfilment_mix.map((s) => ({ name: s.method, n: s.n }))} /></Card>
            <Card title="Top products"><DataTable rows={x.top_products} rowKey={(r) => r.name} empty="No sales in this period." columns={[{ key: 'name', header: 'Product' }, { key: 'u', header: 'Units', render: (r) => r.units }, { key: 'g', header: 'Gross', render: (r) => money(r.gross_cents) }]} /></Card>
            {x.top_stores.length > 0 && <Card title="Top stores"><DataTable rows={x.top_stores} rowKey={(r) => r.name} columns={[{ key: 'name', header: 'Store' }, { key: 'o', header: 'Orders', render: (r) => r.orders }, { key: 'g', header: 'Gross', render: (r) => money(r.gross_cents) }]} /></Card>}
          </div>
          <Alert tone="info">{x.note}</Alert>
        </>
      )}
    </Need>
  )
}
