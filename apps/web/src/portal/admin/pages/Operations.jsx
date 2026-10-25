import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAction, useApi, toast } from '../../shared/hooks'
import { post, patch, fmtDate } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Stat, StatusBadge, Switch, Textarea, confirmThen } from '../../shared/ui'
import { DeleteButton, Fetch, Need, cents, useCan, Kv, Why } from '../common'

function Queue({ title, count, to, children }) {
  return (
    <Card>
      <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">{title}</h3><Badge tone={count ? 'yellow' : 'green'}>{count}</Badge></div>
      {count === 0 ? <p className="text-xs text-gray-500 mt-2">Nothing waiting.</p> : <div className="mt-2 space-y-1 text-sm">{children}</div>}
      {to && count > 0 && <p className="mt-2"><Link className="text-primary-700 hover:underline text-sm" to={to}>Open</Link></p>}
    </Card>
  )
}

export function Dashboard() {
  const can = useCan()
  return (
    <>
      <PageHeader title="Operations" sub="What needs attention right now." />
      {can('orders.view', 'dispatch.manage', 'support.manage') && (
        <Fetch path="/admin/exceptions">{(e) => (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <Queue title="Orders the store has not accepted" count={e.unaccepted_orders.length} to="/orders">{e.unaccepted_orders.slice(0, 5).map((o) => <div key={o.id}><strong>{o.order_number}</strong> · {o.store_name} · {fmtDate(o.placed_at)}</div>)}</Queue>
            <Queue title="Deliveries without a driver" count={e.unassigned_deliveries.length} to="/dispatch">{e.unassigned_deliveries.slice(0, 5).map((d) => <div key={d.id}><strong>{d.order_number}</strong> · waiting since {fmtDate(d.created_at)}</div>)}</Queue>
            <Queue title="Failed deliveries" count={e.failed_deliveries.length} to="/dispatch">{e.failed_deliveries.slice(0, 5).map((d) => <div key={d.id}><strong>{d.order_number}</strong> · {d.completion_note}</div>)}</Queue>
            <Queue title="Open support tickets" count={e.open_tickets.length} to="/support">{e.open_tickets.slice(0, 5).map((t) => <div key={t.id}><Link className="text-primary-700 hover:underline" to={`/support/${t.id}`}>{t.subject}</Link></div>)}</Queue>
            <Queue title="Refunds waiting or failed" count={e.refunds_waiting.length} to="/refunds">{e.refunds_waiting.slice(0, 5).map((r) => <div key={r.id}><strong>{r.order_number}</strong> · {cents(r.amount_cents)} · {r.reason}</div>)}</Queue>
            <Queue title="Payment anomalies" count={e.payment_anomalies.length} to="/system">{e.payment_anomalies.slice(0, 5).map((p, i) => <div key={i}>{p.outcome.replace(/_/g, ' ')} · {fmtDate(p.received_at)}</div>)}</Queue>
          </div>
        )}</Fetch>
      )}
      {can('reports.view') && (
        <>
          <h2 className="text-lg font-semibold text-gray-900">Last 30 days</h2>
          <Fetch path="/admin/reports/kpis">{(k) => (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <Stat label="Paid orders" value={k.marketplace.orders} /><Stat label="GMV" value={cents(k.marketplace.gmv_cents)} sub="merchandise, before refunds" />
                <Stat label="Avg order value" value={k.marketplace.aov_cents != null ? cents(k.marketplace.aov_cents) : '—'} /><Stat label="Gross marketplace revenue" value={cents(k.marketplace.gross_marketplace_revenue_cents)} sub="before costs" />
              </div>
              <Alert tone="warn">{k.data_caveat} <Link className="underline" to="/reports">Definitions and more</Link></Alert>
              <Why>{k.definitions.gross_marketplace_revenue}</Why>
            </>
          )}</Fetch>
        </>
      )}
      {!can('orders.view', 'dispatch.manage', 'support.manage', 'reports.view') && <Card><p>Use the menu to open the areas your role can manage.</p></Card>}
    </>
  )
}

export function Orders() {
  const nav = useNavigate()
  const [q, setQ] = useState(''); const [status, setStatus] = useState('')
  const [applied, setApplied] = useState({ q: '', status: '' })
  const path = `/admin/orders?${new URLSearchParams({ ...(applied.q ? { q: applied.q } : {}), ...(applied.status ? { status: applied.status } : {}) })}`
  return (
    <Need perm={['orders.view']} what="viewing orders">
      <PageHeader title="Orders" sub="Search by order number or customer email." />
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setApplied({ q, status }) }}>
        <Field label="Order number or email" htmlFor="oq" className="flex-1 min-w-[12rem]"><Input id="oq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="EZ-… or name@email" /></Field>
        <Field label="Status" htmlFor="os"><Select id="os" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{['pending_payment', 'placed', 'completed', 'cancelled', 'payment_failed', 'expired'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</Select></Field>
        <Button type="submit">Search</Button>
      </form>
      <Fetch path={path}>{(rows) => (
        <DataTable rows={rows} onRow={(r) => nav(`/orders/${r.id}`)} empty="No orders match." columns={[
          { key: 'n', header: 'Order', render: (r) => <strong>{r.order_number}</strong> }, { key: 'at', header: 'Created', render: (r) => fmtDate(r.created_at) }, { key: 'c', header: 'Customer', render: (r) => r.customer_email },
          { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { key: 'p', header: 'Payment', render: (r) => <StatusBadge status={r.payment_status} /> }, { key: 't', header: 'Total', render: (r) => cents(r.total_cents) }, { key: 'st', header: 'Stores', nowrap: false, render: (r) => <span className="text-xs">{r.stores}</span> }]} />
      )}</Fetch>
    </Need>
  )
}

export function OrderDetail() {
  const { id } = useParams()
  const can = useCan()
  const [cancelSub, setCancelSub] = useState(null); const [reason, setReason] = useState('')
  const [refundSub, setRefundSub] = useState(null); const [qtys, setQtys] = useState({}); const [withDelivery, setWithDelivery] = useState(false); const [vendorFunded, setVendorFunded] = useState(true); const [rReason, setRReason] = useState('')
  const [result, setResult] = useState('')
  const cancel = useAction(async (reload) => { await post(`/admin/suborders/${cancelSub.id}/cancel`, { reason }); toast('Suborder cancelled. A full refund is on its way.'); setCancelSub(null); reload() })
  const refund = useAction(async (reload) => {
    const ls = Object.entries(qtys).filter(([, q]) => q > 0).map(([line_id, quantity]) => ({ line_id, quantity }))
    const r = await post(`/admin/suborders/${refundSub.id}/refunds`, { lines: ls, include_delivery: withDelivery, reason: rReason, vendor_funded: vendorFunded })
    setResult(`Refund of $${(r.amount_cents / 100).toFixed(2)} requested. ${can('refunds.approve') ? 'Approve it in Refunds.' : 'A finance user must approve it.'}`); setRefundSub(null); reload()
  })
  const Timeline = ({ items }) => <ul className="space-y-1 text-sm">{items.map((t, i) => <li key={i}><strong>{t.status.replace(/_/g, ' ')}</strong> <span className="text-xs text-gray-500">{fmtDate(t.at)}{t.note ? ` · ${t.note}` : ''}</span></li>)}</ul>
  return (
    <Need perm={['orders.view']} what="viewing orders">
      <Fetch path={`/admin/orders/${id}`}>{(o, reload) => (
        <>
          <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700">← All orders</Link>
          <PageHeader title={o.order_number} sub={<><StatusBadge status={o.status} /> <StatusBadge status={o.payment_status} /></>} />
          <Alert tone="ok">{result}</Alert>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <Card title="Customer"><Kv rows={[['Name', o.customer_name], ['Email', o.customer_email?.customer_email], ['Phone', o.customer_email?.customer_phone], ['Method', o.fulfilment_method], ['Address', o.address ? `${o.address.line1}${o.address.line2 ? ', ' + o.address.line2 : ''}, ${o.address.city} ${o.address.postal_code}` : null], ['Instructions', o.delivery_instructions]]} /></Card>
            <Card title="Money">
              <Kv rows={[['Subtotal', cents(o.subtotal_cents)], ['Discount', cents(o.discount_cents)], ['Delivery', cents(o.delivery_cents)], ['Tax', cents(o.tax_cents)], ['Total', <strong key="t">{cents(o.total_cents)}</strong>]]} />
              <h3 className="font-semibold text-gray-900 mt-4 mb-1">Payments</h3>
              {o.payments.map((p, i) => <div key={i} className="text-xs"><StatusBadge status={p.status} /> {cents(p.amount_cents)} · {p.provider} · <code>{p.provider_payment_id}</code>{p.failure_message ? ` · ${p.failure_message}` : ''}</div>)}
              {!o.payments.length && <p className="text-xs text-gray-500">No payment recorded.</p>}
            </Card>
          </div>
          {o.suborders.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">{s.store_name} <StatusBadge status={s.status} /></h3><span className="text-xs text-gray-500">{s.fulfilment_method}{s.delivery_status ? ` · delivery ${s.delivery_status.replace(/_/g, ' ')}` : ''}{s.promised_at ? ` · promised ${fmtDate(s.promised_at)}` : ''}</span></div>
              {s.reject_reason && <div className="mt-2"><Alert tone="warn">Reason: {s.reject_reason}</Alert></div>}
              <div className="mt-3"><DataTable rows={s.lines} columns={[
                { key: 'n', header: 'Item', nowrap: false, render: (l) => <>{l.name}{l.brand ? ` · ${l.brand}` : ''}{l.substitution_status !== 'none' && <> <Badge tone="blue">sub {l.substitution_status}{l.substitute_name ? `: ${l.substitute_name}` : ''}</Badge></>}</> },
                { key: 'q', header: 'Qty', render: (l) => `${l.quantity}${l.refunded_quantity ? ` (${l.refunded_quantity} refunded)` : ''}` }, { key: 'u', header: 'Unit', render: (l) => cents(l.unit_price_cents) }, { key: 't', header: 'Line', render: (l) => cents(l.line_total_cents) }]} /></div>
              <p className="text-sm mt-2">Subtotal {cents(s.subtotal_cents)} · discount {cents(s.discount_cents)} · delivery {cents(s.delivery_cents)} · tax {cents(s.tax_cents)} · <strong>total {cents(s.total_cents)}</strong></p>
              <h4 className="font-medium text-gray-900 mt-3 mb-1">Timeline</h4><Timeline items={s.timeline} />
              {s.refunds.length > 0 && <><h4 className="font-medium text-gray-900 mt-3 mb-1">Refunds</h4>{s.refunds.map((r, i) => <div key={i} className="text-sm"><StatusBadge status={r.status} /> {cents(r.amount_cents)} · {r.reason}</div>)}</>}
              <div className="flex flex-wrap gap-2 mt-3">
                {can('refunds.request') && ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'collected'].includes(s.status) && <Button variant="secondary" size="sm" onClick={() => { setRefundSub(s); setQtys({}); setWithDelivery(false); setVendorFunded(true); setRReason(''); setResult('') }}>Raise a refund</Button>}
                {can('orders.manage') && ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery'].includes(s.status) && <Button variant="danger" size="sm" onClick={() => { setCancelSub(s); setReason('') }}>Cancel with full refund</Button>}
              </div>
            </Card>
          ))}
          <Card title="Order history"><Timeline items={o.timeline} /></Card>
          {cancelSub && (
            <Modal title={`Cancel ${cancelSub.store_name}`} onClose={() => setCancelSub(null)}>
              <div className="space-y-3"><Alert tone="warn">This cancels the store’s part of the order and refunds everything the customer paid for it, including delivery. It cannot be undone.</Alert><Alert>{cancel.error}</Alert>
                <Field label="Reason (recorded and shown to the customer)" htmlFor="cr"><Textarea id="cr" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCancelSub(null)}>Keep order</Button><Button variant="danger" busy={cancel.busy} disabled={reason.length < 3} onClick={() => cancel.run(reload)}>Cancel and refund</Button></div></div>
            </Modal>
          )}
          {refundSub && (
            <Modal title={`Refund: ${refundSub.store_name}`} onClose={() => setRefundSub(null)}>
              <div className="space-y-3"><Alert>{refund.error}</Alert>
                <p className="text-xs text-gray-600">Pick what to refund. The system works out the exact amount (including tax and any discount share) and returns it for finance to approve.</p>
                {refundSub.lines.map((l) => { const max = l.quantity - l.refunded_quantity; return (
                  <div key={l.id} className="flex items-center justify-between gap-2"><span className="text-sm">{l.name} <span className="text-xs text-gray-500">({max} refundable)</span></span>
                    <Input className="!w-20" type="number" min={0} max={max} disabled={max <= 0} value={qtys[l.id] ?? 0} onChange={(e) => setQtys((s) => ({ ...s, [l.id]: Math.max(0, Math.min(max, Number(e.target.value))) }))} aria-label={`Quantity of ${l.name} to refund`} /></div>) })}
                {refundSub.delivery_cents > 0 && <Switch checked={withDelivery} label="Also refund the delivery fee" onChange={setWithDelivery} />}
                <Switch checked={vendorFunded} label="The store pays for this" hint="Untick if it was our fault, e.g. a late delivery: the store keeps its earnings." onChange={setVendorFunded} />
                <Field label="Reason" htmlFor="rr"><Textarea id="rr" value={rReason} onChange={(e) => setRReason(e.target.value)} /></Field>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRefundSub(null)}>Close</Button><Button busy={refund.busy} disabled={rReason.length < 3 || (!withDelivery && !Object.values(qtys).some((q) => q > 0))} onClick={() => refund.run(reload)}>Request refund</Button></div></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}

export function Dispatch() {
  const [pick, setPick] = useState({})
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Need perm={['dispatch.manage']} what="dispatching deliveries">
      <PageHeader title="Deliveries" sub="Assign a driver to each ready delivery. Late jobs are flagged." />
      <Alert>{act.error}</Alert>
      <Fetch path="/admin/dispatch">{(d, reload) => (
        <>
          <Card title="Drivers">
            {d.drivers.length ? <div className="flex flex-wrap gap-2">{d.drivers.map((x) => <Badge key={x.id} tone={x.is_available ? 'green' : 'gray'}>{x.full_name} · {x.active_jobs} active · {x.is_available ? 'available' : 'off'}</Badge>)}</div>
              : <p className="text-sm text-gray-500">No approved drivers yet. Approve applicants in <Link className="text-primary-700 underline" to="/drivers">Drivers</Link>.</p>}
          </Card>
          <DataTable rows={d.jobs} empty="No deliveries to manage right now." columns={[
            { key: 'o', header: 'Order', render: (j) => <><strong>{j.order_number}</strong>{j.late && <> <Badge tone="red">Late</Badge></>}</> }, { key: 's', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
            { key: 'p', header: 'Pick up', nowrap: false, render: (j) => <>{j.store_name}<div className="text-xs text-gray-500">{j.pickup_address}</div></> }, { key: 'd', header: 'Drop off', render: (j) => `${j.dropoff_city ?? ''} ${j.dropoff_postal ?? ''}` },
            { key: 'w', header: 'Promised', render: (j) => fmtDate(j.promised_at) }, { key: 'e', header: 'Driver pay', render: (j) => cents(j.earning_cents) }, { key: 'dr', header: 'Driver', render: (j) => j.driver_name ?? <span className="text-gray-500">none</span> },
            { key: 'a', header: '', nowrap: false, render: (j) => (['unassigned', 'assigned', 'failed'].includes(j.status) ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label="Driver" className="!w-44" value={pick[j.id] ?? j.driver_id ?? ''} onChange={(e) => setPick((s) => ({ ...s, [j.id]: e.target.value }))}><option value="">Choose driver…</option>{d.drivers.map((x) => <option key={x.id} value={x.id}>{x.full_name}{x.is_available ? '' : ' (off)'} · {x.active_jobs} active</option>)}</Select>
                <Button size="sm" disabled={!(pick[j.id] ?? j.driver_id)} onClick={() => act.run(() => post(`/admin/deliveries/${j.id}/assign`, { driver_id: pick[j.id] ?? j.driver_id }), 'Driver assigned', reload)}>{j.status === 'assigned' ? 'Reassign' : 'Assign'}</Button>
                {j.status === 'assigned' && <Button size="sm" variant="ghost" onClick={() => act.run(() => post(`/admin/deliveries/${j.id}/unassign`), 'Unassigned', reload)}>Unassign</Button>}
              </div>) : <span className="text-xs text-gray-500">In progress</span>) }]} />
        </>
      )}</Fetch>
    </Need>
  )
}

export function Drivers() {
  const [open, setOpen] = useState(null)
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Need perm={['drivers.manage']} what="managing drivers">
      <PageHeader title="Drivers" sub="Verify the licence and background check first; the system will not approve a driver until both are verified." />
      <Alert>{act.error}</Alert>
      <Fetch path="/admin/drivers">{(rows, reload) => (
        <DataTable rows={rows} empty="No drivers have applied." columns={[
          { key: 'n', header: 'Driver', nowrap: false, render: (r) => <><button type="button" className="font-semibold text-primary-700 hover:underline text-left" onClick={() => setOpen(r.id)}>{r.full_name}</button>{r.unread_messages > 0 && <> <Badge tone="red">{r.unread_messages} new</Badge></>}<div className="text-xs text-gray-500">{r.email} · {r.phone}{r.vehicle ? ` · ${r.vehicle}` : ''}</div></> },
          { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'l', header: 'Licence verified', render: (r) => <Switch checked={r.licence_verified} label="Licence verified" onChange={(v) => act.run(() => patch(`/admin/drivers/${r.id}`, { licence_verified: v }), 'Updated', reload)} /> },
          { key: 'b', header: 'Background check', render: (r) => <Switch checked={r.background_check_verified} label="Background check" onChange={(v) => act.run(() => patch(`/admin/drivers/${r.id}`, { background_check_verified: v }), 'Updated', reload)} /> },
          { key: 'j', header: 'Active jobs', render: (r) => r.active_jobs },
          { key: 'a', header: '', nowrap: false, render: (r) => (
            <div className="flex flex-wrap gap-2">
              {r.status !== 'approved' && <Button size="sm" disabled={!(r.licence_verified && r.background_check_verified)} title={!(r.licence_verified && r.background_check_verified) ? 'Verify licence and background check first' : ''} onClick={() => act.run(() => patch(`/admin/drivers/${r.id}`, { status: 'approved' }), 'Driver approved', reload)}>Approve</Button>}
              {r.status === 'approved' && <Button size="sm" variant="secondary" onClick={confirmThen(`Suspend ${r.full_name}? They lose access to driver jobs immediately.`, () => act.run(() => patch(`/admin/drivers/${r.id}`, { status: 'suspended' }), 'Driver suspended', reload))}>Suspend</Button>}
              <DeleteButton what="driver" name={r.full_name} path={`/admin/drivers/${r.id}`} onDone={(x) => { toast(x.note); reload() }} />
              {r.status === 'applied' && <Button size="sm" variant="ghost" onClick={() => act.run(() => patch(`/admin/drivers/${r.id}`, { status: 'rejected' }), 'Application rejected', reload)}>Reject</Button>}
            </div>) }]} />
      )}</Fetch>
      {open && <DriverDetail id={open} onClose={() => setOpen(null)} />}
    </Need>
  )
}

const DOC_LABEL = { driver_license: 'Driver’s licence', vehicle_registration: 'Vehicle registration', insurance: 'Insurance' }

/** What the driver told us on the application, their documents (opened with the admin sign-in, never public) and the conversation with our team. */
function DriverDetail({ id, onClose }) {
  const { data: d, error, reload } = useApi(`/admin/drivers/${id}`)
  const [text, setText] = useState('')
  const send = useAction(async () => { await post(`/admin/drivers/${id}/messages`, { body: text }); setText(''); toast('Message sent'); reload() })
  return (
    <Modal wide title={d ? d.full_name : 'Driver'} onClose={onClose}>
      <Alert>{error}</Alert>
      {d && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card title="Contact"><Kv rows={[['Email', d.email], ['Phone', d.phone], ['Address', [d.street_address, d.city, d.state, d.postal_code, d.country].filter(Boolean).join(', ') || null], ['Payout email', d.payout_email], ['Applied', fmtDate(d.created_at)]]} /></Card>
            <Card title="Vehicle"><Kv rows={[['Type', d.vehicle_type], ['Vehicle', [d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || d.vehicle], ['Colour', d.vehicle_color], ['Plate', d.license_plate], ['Licence no.', d.driver_license_number], ['Zones', (d.preferred_delivery_zones ?? []).join(', ') || null], ['Radius', d.delivery_radius_km ? `${d.delivery_radius_km} km` : null]]} /></Card>
          </div>
          <Card title="Documents" sub="Check they are genuine and current, then tick the verifications in the Drivers list.">
            <ul className="divide-y divide-gray-100">{Object.keys(DOC_LABEL).map((k) => {
              const x = d.documents[k]
              return <li key={k} className="py-2 flex items-center justify-between gap-3 text-sm"><span>{DOC_LABEL[k]}{x?.validity ? <span className="text-xs text-gray-500"> · valid until {x.validity}</span> : null}</span>
                {x?.on_file ? <a className="text-primary-700 underline" href={`/api/admin/drivers/${id}/file/${k}`} target="_blank" rel="noreferrer">Open</a> : <Badge tone="amber">Not on file</Badge>}</li>
            })}</ul>
          </Card>
          <Card title="Conversation">
            <div role="log" aria-label="Messages" className="space-y-2 max-h-64 overflow-y-auto">
              {d.messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
              {d.messages.map((m) => <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from_staff ? 'ml-auto bg-primary-50 text-primary-900' : 'bg-gray-100'}`}><div className="text-xs text-gray-500">{m.from_staff ? 'EAZyfoods team' : d.full_name} · {fmtDate(m.created_at)}</div><p className="whitespace-pre-wrap">{m.body}</p></div>)}
            </div>
            <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.run() }}>
              <Alert>{send.error}</Alert>
              <Field label="Reply" htmlFor="drep"><Textarea id="drep" rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} /></Field>
              <div className="flex justify-end"><Button type="submit" busy={send.busy} disabled={!text.trim()}>Send</Button></div>
            </form>
          </Card>
        </div>
      )}
    </Modal>
  )
}

export function Support() {
  const nav = useNavigate()
  const [status, setStatus] = useState('open')
  return (
    <Need perm={['support.manage']} what="handling support tickets">
      <PageHeader title="Support" sub="Customer problems, vendor questions and driver issues." />
      <Field label="Show" htmlFor="ss" className="max-w-xs"><Select id="ss" value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="pending">Waiting on customer</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="">All</option></Select></Field>
      <Fetch path={`/admin/tickets${status ? `?status=${status}` : ''}`}>{(rows) => (
        <DataTable rows={rows} onRow={(r) => nav(`/support/${r.id}`)} empty="No tickets in this view." columns={[
          { key: 's', header: 'Subject', nowrap: false, render: (r) => <strong>{r.subject}</strong> }, { key: 'k', header: 'From', render: (r) => <Badge tone="blue">{r.kind}</Badge> }, { key: 'c', header: 'Category', render: (r) => r.category.replace(/_/g, ' ') },
          { key: 'o', header: 'Order', render: (r) => r.order_number ?? '' }, { key: 'e', header: 'Who', render: (r) => r.email ?? '' }, { key: 'st', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { key: 'u', header: 'Updated', render: (r) => fmtDate(r.updated_at) }]} />
      )}</Fetch>
    </Need>
  )
}

export function TicketDetail() {
  const { id } = useParams()
  const can = useCan()
  const [body, setBody] = useState(''); const [internal, setInternal] = useState(false)
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Need perm={['support.manage']} what="handling support tickets">
      <Fetch path={`/admin/tickets/${id}`}>{(t, reload) => (
        <>
          <Link to="/support" className="text-sm text-primary-600 hover:text-primary-700">← All tickets</Link>
          <PageHeader title={t.subject} sub={<><StatusBadge status={t.status} /> · {t.kind} · {t.category.replace(/_/g, ' ')}</>}
            actions={<>
              <Select aria-label="Status" value={t.status} onChange={(e) => act.run(() => patch(`/admin/tickets/${id}`, { status: e.target.value }), 'Status updated', reload)}><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select>
              <Button variant="secondary" onClick={() => act.run(() => patch(`/admin/tickets/${id}`, { assign_to_me: true }), 'Assigned to you', reload)}>Assign to me</Button></>} />
          <Alert>{act.error}</Alert>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <Card title="Context">
              <Kv rows={[['Customer', t.email], ['Order', t.order_id ? <Link key="o" className="text-primary-700 hover:underline" to={`/orders/${t.order_id}`}>{t.order_number}</Link> : null], ['Opened', fmtDate(t.created_at)]]} />
              {t.affected_lines?.length > 0 && <><h4 className="font-medium mt-3 mb-1">Items reported</h4>{t.affected_lines.map((l) => <div key={l.id} className="text-sm">{l.quantity} × {l.product_name}</div>)}</>}
              {t.order_id && can('refunds.request') && <p className="mt-3"><Link className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" to={`/orders/${t.order_id}`}>Open order to raise a refund</Link></p>}
            </Card>
            <Card title="Reply">
              <div className="space-y-3">
                <Field label={internal ? 'Internal note (the customer never sees this)' : 'Message to the customer'} htmlFor="rb"><Textarea id="rb" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
                <Switch checked={internal} label="Internal note only" onChange={setInternal} />
                <Button disabled={!body.trim()} onClick={async () => { await act.run(() => post(`/admin/tickets/${id}/messages`, { body, internal }), internal ? 'Note saved' : 'Reply sent', reload); setBody('') }}>{internal ? 'Save note' : 'Send reply'}</Button>
              </div>
            </Card>
          </div>
          <Card title="Conversation">
            <div className="space-y-3">{t.messages.map((m) => <div key={m.id} className={`rounded-lg p-3 text-sm ${m.is_internal ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}><div className="text-xs text-gray-500 mb-1">{m.author ?? 'System'} · {fmtDate(m.created_at)}{m.is_internal && ' · INTERNAL NOTE'}</div>{m.body}</div>)}{!t.messages.length && <p className="text-gray-500 text-sm">No messages.</p>}</div>
          </Card>
        </>
      )}</Fetch>
    </Need>
  )
}

export function Refunds() {
  const can = useCan()
  const [status, setStatus] = useState('requested'); const [rejecting, setRejecting] = useState(null); const [note, setNote] = useState('')
  const act = useAction(async (fn, ok, reload) => { const r = await fn(); if (r?.status === 'failed') toast(`Provider refused: ${r.error}`, 'error'); else toast(ok); reload() })
  return (
    <Need perm={['refunds.approve', 'refunds.request', 'orders.view']} what="viewing refunds">
      <PageHeader title="Refunds" sub="Support raises refunds; only finance approves and sends them. Approved refunds go to the original payment method." />
      <Alert>{act.error}</Alert>
      <Field label="Show" htmlFor="rs" className="max-w-xs"><Select id="rs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="requested">Waiting for approval</option><option value="failed">Failed</option><option value="succeeded">Completed</option><option value="rejected">Rejected</option><option value="">All</option></Select></Field>
      <Fetch path={`/admin/refunds${status ? `?status=${status}` : ''}`}>{(rows, reload) => (
        <>
          <DataTable rows={rows} empty="No refunds in this view." columns={[
            { key: 'o', header: 'Order', render: (r) => <strong>{r.order_number}</strong> }, { key: 's', header: 'Store', render: (r) => r.store_name }, { key: 'a', header: 'Amount', render: (r) => <strong>{cents(r.amount_cents)}</strong> },
            { key: 'r', header: 'Reason', nowrap: false, render: (r) => r.reason }, { key: 'f', header: 'Who pays', render: (r) => (r.vendor_funded ? 'Store' : <Badge tone="yellow">EAZyfoods</Badge>) },
            { key: 'by', header: 'Requested by', render: (r) => r.requested_by ?? 'System' }, { key: 'at', header: 'When', render: (r) => fmtDate(r.created_at) }, { key: 'st', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'act', header: '', nowrap: false, render: (r) => (['requested', 'failed'].includes(r.status) ? (can('refunds.approve') ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={confirmThen(`Send a refund of ${cents(r.amount_cents)} for ${r.order_number} to the customer’s card? This cannot be undone.`, () => act.run(() => post(`/admin/refunds/${r.id}/approve`), 'Refund sent', reload))}>{r.status === 'failed' ? 'Retry' : 'Approve'}</Button>
                {r.status === 'requested' && <Button size="sm" variant="ghost" onClick={() => { setRejecting(r.id); setNote('') }}>Reject</Button>}
              </div>) : <span className="text-xs text-gray-500">Finance approves</span>) : null) }]} />
          {rejecting && (
            <Modal title="Reject refund request" onClose={() => setRejecting(null)}>
              <div className="space-y-3"><Field label="Reason (recorded)" htmlFor="rj"><Textarea id="rj" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" disabled={note.length < 3} onClick={async () => { await act.run(() => post(`/admin/refunds/${rejecting}/reject`, { note }), 'Refund rejected', reload); setRejecting(null) }}>Reject</Button></div></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}
