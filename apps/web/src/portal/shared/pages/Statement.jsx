import { useState } from 'react'
import { useApi } from '../hooks'
import { money, fmtDate } from '../client'
import { Alert, Badge, DataTable, Field, Input, PageHeader, Spinner, Stat } from '../ui'

const PAY = { awaiting_approval: ['amber', 'Being approved'], pending: ['amber', 'On its way'], failed: ['red', 'Failed, being retried'], paid: ['green', 'Paid'], cancelled: ['gray', 'Cancelled'] }
const PayBadge = ({ s }) => (s ? <Badge tone={(PAY[s] ?? ['gray'])[0]}>{(PAY[s] ?? [0, s])[1]}</Badge> : <span className="text-gray-600">Not yet paid</span>)

/** A vendor's or driver's own statement, straight from the server: what was earned, what was kept or deducted, and what has been paid. */
export default function Statement({ kind }) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()
  const { data: s, error, loading } = useApi(`/${kind}/statement${qs ? `?${qs}` : ''}`)
  return (
    <>
      <PageHeader title="Statement" sub={kind === 'driver' ? 'Every delivery you earned from, with tips shown separately, and when you were paid.' : 'Your sales, our commission, refunds, what you earn and when you were paid.'} />
      <div className="flex flex-wrap gap-3">
        <Field label="From" htmlFor="stf"><Input id="stf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To" htmlFor="stt"><Input id="stt" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {loading && !s && <Spinner className="h-32" />}
      <Alert>{error}</Alert>
      {s && kind === 'vendor' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat label="Sales" value={money(s.totals.merchandise_cents)} /><Stat label="Commission" value={money(s.totals.commission_cents)} /><Stat label="Refund adjustments" value={money(s.totals.refund_adjustment_cents)} /><Stat label="You earn" value={money(s.totals.net_cents)} sub={`${money(s.paid_cents)} paid in this period`} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat label="Owed to you" value={money(s.balance.owed_cents)} /><Stat label="Payable now" value={money(s.balance.payable_now_cents)} /><Stat label="In the hold period" value={money(s.balance.in_hold_cents)} sub={`${s.balance.hold_days} days after delivery`} /><Stat label="Orders in progress" value={money(s.balance.in_progress_cents)} />
          </div>
          <DataTable rows={s.lines} empty="No orders in this period." columns={[
            { key: 'o', header: 'Order', render: (l) => <strong>{l.order_number}</strong> }, { key: 'd', header: 'Date', render: (l) => fmtDate(l.at) }, { key: 'm', header: 'Sales', render: (l) => money(l.merchandise_cents) },
            { key: 'k', header: 'Commission', render: (l) => money(l.commission_cents) }, { key: 'r', header: 'Refunds', render: (l) => money(l.refund_adjustment_cents) }, { key: 'n', header: 'You earn', render: (l) => <strong>{money(l.net_cents)}</strong> }, { key: 'p', header: 'Payout', render: (l) => <PayBadge s={l.payout_status} /> },
          ]} />
          {s.payouts.length > 0 && <><h2 className="text-lg font-semibold">Payouts</h2><DataTable rows={s.payouts} columns={[{ key: 'a', header: 'Amount', render: (p) => money(p.amount_cents) }, { key: 's', header: 'Status', render: (p) => <PayBadge s={p.status} /> }, { key: 'd', header: 'Date', render: (p) => fmtDate(p.paid_at ?? p.created_at) }, { key: 'r', header: 'Reference', render: (p) => p.reference ?? '—' }]} /></>}
          <ul className="text-xs text-gray-600 list-disc ml-5">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </>
      )}
      {s && kind === 'driver' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat label="Base pay" value={money(s.totals.base_cents)} /><Stat label="Tips" value={money(s.totals.tips_cents)} sub="all yours" /><Stat label="Total earned" value={money(s.totals.total_cents)} /><Stat label="Not yet paid" value={money(s.unpaid_cents)} sub={`${money(s.paid_cents)} paid in this period`} />
          </div>
          <DataTable rows={s.lines} empty="No deliveries in this period." columns={[
            { key: 'o', header: 'Order', render: (l) => <strong>{l.order_number}</strong> }, { key: 'd', header: 'Date', render: (l) => fmtDate(l.at) }, { key: 'b', header: 'Base pay', render: (l) => money(l.base_cents) },
            { key: 't', header: 'Tip', render: (l) => money(l.tip_cents) }, { key: 'n', header: 'Total', render: (l) => <strong>{money(l.total_cents)}</strong> }, { key: 'p', header: 'Payout', render: (l) => <PayBadge s={l.payout_status} /> },
          ]} />
          {s.payouts.length > 0 && <><h2 className="text-lg font-semibold">Payouts</h2><DataTable rows={s.payouts} columns={[{ key: 'a', header: 'Amount', render: (p) => money(p.amount_cents) }, { key: 's', header: 'Status', render: (p) => <PayBadge s={p.status} /> }, { key: 'd', header: 'Date', render: (p) => fmtDate(p.paid_at ?? p.created_at) }, { key: 'r', header: 'Reference', render: (p) => p.reference ?? '—' }]} /></>}
          <ul className="text-xs text-gray-600 list-disc ml-5">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </>
      )}
    </>
  )
}
