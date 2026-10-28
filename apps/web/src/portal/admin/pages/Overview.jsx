import { useState } from 'react'
import { useApi } from '../../shared/hooks'
import { Alert, Badge, Button, Card, DataTable, Field, Input, PageHeader, Select, Spinner, Stat } from '../../shared/ui'
import { Need, cents } from '../common'
import { fmtDate } from '../../shared/client'

const ORDER_STATUS = ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'collected', 'rejected', 'cancelled']
const iso = (d) => d.toISOString().slice(0, 10)

/** One tile: the number, a plain-language definition, and what kind of money it is. */
function Metric({ label, value, def, tone, sub, note }) {
  return (
    <div className="space-y-1">
      <Stat label={label} value={value} sub={sub} />
      <details className="text-xs"><summary className="cursor-pointer text-primary-700">What is this?</summary><p className="text-gray-700 mt-1">{def}</p>{note && <p className="text-gray-600 mt-1">{note}</p>}</details>
      {tone && <Badge tone={tone[0]}>{tone[1]}</Badge>}
    </div>
  )
}
const REV = ['green', 'EAZyfoods revenue'], PASS = ['gray', 'Not revenue'], COST = ['amber', 'Cost'], SNAP = ['blue', 'Right now']
const na = (v, fmt = cents) => (v == null ? 'Not recorded' : fmt(v))

export function FinanceOverview() {
  const today = new Date()
  const [f, setF] = useState({ from: iso(new Date(today.getTime() - 29 * 864e5)), to: iso(today), store_id: '', vendor_id: '', driver_id: '', city: '', zone_id: '', order_status: '', payment_status: '', settlement_status: '' })
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
  const { data, error, loading } = useApi(`/admin/finance/overview?${qs}`)
  const payees = useApi('/admin/settlements/payees')
  const [open, setOpen] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const m = data?.metrics, d = data?.definitions
  const cities = [...new Set((payees.data?.stores ?? []).map((s) => s.city).filter(Boolean))]
  return (
    <Need perm={['ledger.view', 'reports.view', 'settlements.view']} what="the financial overview">
      <PageHeader title="Financial overview" sub="Every figure comes from the ledger and order records, with its definition. Tips, tax and vendor money are never counted as EAZyfoods revenue, and costs that are not recorded are shown as such, not guessed." />
      <Card title="Filters">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="From" htmlFor="ff"><Input id="ff" type="date" value={f.from} onChange={set('from')} /></Field>
          <Field label="To" htmlFor="ft"><Input id="ft" type="date" value={f.to} onChange={set('to')} /></Field>
          <Field label="City" htmlFor="fc"><Select id="fc" value={f.city} onChange={set('city')}><option value="">All</option>{cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Delivery zone" htmlFor="fz"><Select id="fz" value={f.zone_id} onChange={set('zone_id')}><option value="">All</option>{(payees.data?.zones ?? []).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</Select></Field>
          <Field label="Store" htmlFor="fs"><Select id="fs" value={f.store_id} onChange={set('store_id')}><option value="">All</option>{(payees.data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Vendor" htmlFor="fv"><Select id="fv" value={f.vendor_id} onChange={set('vendor_id')}><option value="">All</option>{(payees.data?.vendors ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
          <Field label="Driver" htmlFor="fd"><Select id="fd" value={f.driver_id} onChange={set('driver_id')}><option value="">All</option>{(payees.data?.drivers ?? []).map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}</Select></Field>
          <Field label="Order status" htmlFor="fo"><Select id="fo" value={f.order_status} onChange={set('order_status')}><option value="">All</option>{ORDER_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</Select></Field>
          <Field label="Payment status" htmlFor="fp"><Select id="fp" value={f.payment_status} onChange={set('payment_status')}><option value="">Paid orders</option><option value="paid">Paid</option><option value="partially_refunded">Partly refunded</option><option value="refunded">Refunded</option></Select></Field>
          <Field label="Settlement status" htmlFor="fst"><Select id="fst" value={f.settlement_status} onChange={set('settlement_status')}><option value="">All</option><option value="unpaid">Not in a payout yet</option><option value="in_payout">In a payout, not paid</option><option value="paid">Paid out</option></Select></Field>
        </div>
      </Card>
      {loading && !data && <Spinner className="h-40" />}
      <Alert>{error}</Alert>
      {m && (
        <div aria-live="polite" className="space-y-6">
          <section aria-labelledby="h-rev"><h2 id="h-rev" className="text-lg font-semibold mb-2">EAZyfoods revenue</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Metric label="Commission" value={cents(m.commission_cents)} def={d.commission_cents} tone={REV} />
              <Metric label="Delivery fees" value={cents(m.delivery_fees_cents)} def={d.delivery_fees_cents} tone={REV} />
              <Metric label="Service fees" value={cents(m.service_fees_cents)} def={d.service_fees_cents} tone={REV} />
              <Metric label="Revenue" value={cents(m.revenue_cents)} def="Commission + delivery fees + service fees." tone={REV} />
            </div></section>
          <section aria-labelledby="h-vol"><h2 id="h-vol" className="text-lg font-semibold mb-2">Sales volume and pass-through money</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Metric label="Orders" value={m.orders} def="Orders paid in this period that match the filters." />
              <Metric label="Merchandise sold (GMV)" value={cents(m.merchandise_cents)} def={d.merchandise_cents} tone={PASS} note="This is the vendors’ sales." />
              <Metric label="Tips for drivers" value={cents(m.tips_cents)} def={d.tips_cents} tone={PASS} />
              <Metric label="Tax collected" value={cents(m.tax_cents)} def={d.tax_cents} tone={PASS} />
            </div></section>
          <section aria-labelledby="h-cost"><h2 id="h-cost" className="text-lg font-semibold mb-2">Costs and refunds</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Metric label="Driver pay" value={cents(m.driver_cost_cents)} def={d.driver_cost_cents} tone={COST} />
              <Metric label="Discounts we funded" value={cents(m.discounts_cents)} def={d.discounts_cents} tone={COST} />
              <Metric label="Refunds paid out" value={cents(m.refunds_cents)} def={d.refunds_cents} />
              <Metric label="Refunds we absorbed" value={cents(m.refund_loss_cents)} def={d.refund_loss_cents} tone={COST} />
              <Metric label="Payment processing (actual)" value={na(m.processing_actual_cents)} def={d.processing_actual_cents} />
              <Metric label="Chargebacks" value={na(m.chargebacks_cents)} def={d.chargebacks_cents} />
            </div></section>
          <section aria-labelledby="h-margin"><h2 id="h-margin" className="text-lg font-semibold mb-2">Contribution margin</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Metric label="Margin from recorded figures" value={cents(m.margin_before_processing_cents)} def={d.margin_before_processing_cents} sub="before payment-processing fees" />
              <Metric label="Estimated margin" value={cents(m.margin_estimate_cents)} def={d.margin_estimate_cents} sub={`assumes ${(data.assumptions.processing_bps / 100).toFixed(2)}% + ${cents(data.assumptions.processing_fixed_cents)} per order for processing`} note="An estimate, not an actual result. The processing assumption can be changed in Settings." />
            </div></section>
          <section aria-labelledby="h-liab"><h2 id="h-liab" className="text-lg font-semibold mb-2">What we owe and what needs attention <span className="text-sm font-normal text-gray-600">(as of now, not limited to the dates)</span></h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Metric label="Owed to vendors" value={cents(m.vendor_liability_cents)} def={d.vendor_liability_cents} tone={SNAP} />
              <Metric label="Owed to drivers" value={cents(m.driver_liability_cents)} def={d.driver_liability_cents} tone={SNAP} />
              <Metric label="Settlements pending" value={cents(m.settlements_pending_cents)} def={d.settlements_pending_cents} sub={`${m.settlements_pending_count} payout(s)`} tone={SNAP} />
              <Metric label="Reconciliation differences" value={m.reconciliation_open} def="Open differences between the records and the ledger. See Reconciliation." tone={SNAP} />
            </div></section>
          <Card title="By day" sub="Merchandise and EAZyfoods revenue per day"><DataTable rows={data.by_day} rowKey={(r) => r.day} empty="No paid orders in this period." columns={[{ key: 'd', header: 'Day', render: (r) => r.day }, { key: 's', header: 'Suborders', render: (r) => r.suborders }, { key: 'm', header: 'Merchandise', render: (r) => cents(r.merchandise_cents) }, { key: 'r', header: 'Revenue', render: (r) => cents(r.revenue_cents) }]} /></Card>
          <div><Button variant="secondary" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide the records behind these numbers' : 'Show the records behind these numbers'}</Button></div>
          {open && <Records qs={qs} />}
        </div>
      )}
    </Need>
  )
}

function Records({ qs }) {
  const [page, setPage] = useState(0)
  const { data, loading, error } = useApi(`/admin/finance/overview/transactions?${qs}&limit=25&offset=${page * 25}`)
  return (
    <Card title="Records" sub="One row per store order. Each has ledger entries you can follow in Finance → Ledger.">
      {loading && !data && <Spinner className="h-24" />}
      <Alert>{error}</Alert>
      {data && (
        <>
          <DataTable rows={data.rows} empty="Nothing matches these filters." columns={[
            { key: 'o', header: 'Order', render: (r) => <div><strong>{r.order_number}</strong><div className="text-xs text-gray-500">{fmtDate(r.placed_at)} · {r.store_name}</div></div> },
            { key: 's', header: 'Status', render: (r) => r.status.replace(/_/g, ' ') }, { key: 'm', header: 'Merchandise', render: (r) => cents(r.merchandise_cents) },
            { key: 'c', header: 'Commission', render: (r) => cents(r.commission_cents) }, { key: 'd', header: 'Delivery fee', render: (r) => cents(r.delivery_fees_cents) }, { key: 'dc', header: 'Driver pay', render: (r) => cents(r.driver_cost_cents) },
            { key: 'v', header: 'Vendor net', render: (r) => cents(r.vendor_net_cents) }, { key: 'p', header: 'Payout', render: (r) => r.payout_status ?? 'Not in a payout' },
          ]} />
          <div className="flex items-center justify-between mt-3 text-sm"><span>{data.total} records</span>
            <span className="flex gap-2"><Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(page + 1)}>Next</Button></span></div>
        </>
      )}
    </Card>
  )
}
