import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast, useAction } from '../../shared/hooks'
import { patch, fmtDate, fmtDateTime } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge } from '../../shared/ui'
import { Fetch, Kv, Need, cents } from '../common'

/* -------------------------------------------------------------- Customers */

export function Customers() {
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  return (
    <Need perm={['users.view']} what="customers">
      <PageHeader title="Customers" sub="Look up a shopper to help them. Personal details: open only what you need." />
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(q.trim()) }}>
        <Field label="Name or email" htmlFor="cq"><Input id="cq" value={q} onChange={(e) => setQ(e.target.value)} /></Field><Button type="submit">Search</Button>
      </form>
      <Fetch path={`/admin/customers${applied ? `?q=${encodeURIComponent(applied)}` : ''}`}>{(rows) => (
        <DataTable rows={rows} empty="No customers match." columns={[
          { key: 'n', header: 'Customer', render: (c) => <div><Link className="font-semibold text-primary-700 hover:underline" to={`/customers/${c.id}`}>{c.full_name}</Link>{c.disabled && <> <Badge tone="red">Disabled</Badge></>}<div className="text-xs text-gray-500">{c.email}</div></div> },
          { key: 'o', header: 'Orders', render: (c) => c.orders }, { key: 's', header: 'Spent', render: (c) => cents(c.spent_cents) }, { key: 'j', header: 'Joined', render: (c) => fmtDate(c.created_at) },
        ]} />
      )}</Fetch>
    </Need>
  )
}

export function CustomerDetail() {
  const { id } = useParams()
  return (
    <Need perm={['users.view']} what="customers">
      <Fetch path={`/admin/customers/${id}`}>{(c) => (
        <>
          <PageHeader title={c.full_name} sub={<Link className="text-primary-700 underline" to="/customers">All customers</Link>} />
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Account"><Kv rows={[['Email', c.email], ['Joined', fmtDate(c.created_at)], ['Store credit', cents(c.credit_cents)], ['Reviews', c.reviews.n ? `${c.reviews.n} (average ${c.reviews.avg})` : 'None'], ['Sign-in', c.disabled ? 'Disabled' : 'Allowed']]} /></Card>
            <Card title="Support tickets">{c.tickets.length ? <ul className="divide-y divide-gray-100 text-sm">{c.tickets.map((t) => <li key={t.id} className="py-1.5 flex justify-between gap-2"><Link className="text-primary-700 hover:underline" to={`/support/${t.id}`}>{t.subject}</Link><StatusBadge status={t.status} /></li>)}</ul> : <p className="text-sm text-gray-500">None.</p>}</Card>
          </div>
          <Card title="Recent orders">
            <DataTable rows={c.orders} empty="No orders yet." columns={[
              { key: 'o', header: 'Order', render: (o) => <Link className="font-semibold text-primary-700 hover:underline" to={`/orders/${o.id}`}>{o.order_number}</Link> }, { key: 's', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
              { key: 'p', header: 'Payment', render: (o) => <StatusBadge status={o.payment_status} /> }, { key: 't', header: 'Total', render: (o) => cents(o.total_cents) }, { key: 'd', header: 'Placed', render: (o) => fmtDateTime(o.placed_at) },
            ]} />
          </Card>
        </>
      )}</Fetch>
    </Need>
  )
}

/* --------------------------------------------------------------- Reviews */

export function ReviewsAdmin() {
  const [filter, setFilter] = useState('reported')
  const act = useAction(async (id, body, ok, reload) => { await patch(`/admin/reviews/${id}`, body); toast(ok); reload() })
  return (
    <Need perm={['support.manage']} what="review moderation">
      <PageHeader title="Reviews" sub="Stores can report a review they believe breaks the rules. Hide only reviews that do; a low rating alone is not a reason." />
      <Field label="Show" htmlFor="rvf" className="max-w-xs"><Select id="rvf" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="reported">Reported by a store</option><option value="hidden">Hidden</option><option value="all">All, newest first</option></Select></Field>
      <Alert>{act.error}</Alert>
      <Fetch path={`/admin/reviews?filter=${filter}`}>{(rows, reload) => (
        <DataTable rows={rows} empty="Nothing to moderate here." columns={[
          { key: 'r', header: 'Review', nowrap: false, render: (r) => <div><strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong> <span className="text-xs text-gray-500">{r.customer} · {r.store_name}{r.product_name ? ` · ${r.product_name}` : ''} · {fmtDate(r.created_at)}</span><p className="text-sm">{r.body || <em className="text-gray-500">No text</em>}</p>{r.vendor_response && <p className="text-xs text-gray-600 mt-1">Store replied: {r.vendor_response}</p>}</div> },
          { key: 'w', header: 'Store’s report', nowrap: false, render: (r) => (r.vendor_report_reason ? <span className="text-sm">{r.vendor_report_reason}</span> : <span className="text-gray-500">—</span>) },
          { key: 's', header: 'State', render: (r) => (r.is_hidden ? <Badge tone="red">Hidden</Badge> : <Badge tone="green">Shown</Badge>) },
          { key: 'a', header: '', nowrap: false, render: (r) => (
            <div className="flex flex-wrap gap-1.5">
              {r.is_hidden ? <Button size="sm" variant="secondary" onClick={() => act.run(r.id, { is_hidden: false }, 'Review shown again', reload)}>Show again</Button>
                : <Button size="sm" variant="danger" onClick={() => act.run(r.id, { is_hidden: true, dismiss_report: true }, 'Review hidden', reload)}>Hide</Button>}
              {r.vendor_reported_at && !r.is_hidden && <Button size="sm" variant="ghost" onClick={() => act.run(r.id, { dismiss_report: true }, 'Report dismissed', reload)}>Dismiss report</Button>}
            </div>) },
        ]} />
      )}</Fetch>
    </Need>
  )
}

/* ------------------------------------------------------------ Gift cards */

export function GiftCards() {
  return (
    <Need perm={['ledger.view']} what="gift cards">
      <PageHeader title="Gift cards" sub="Cards bought in the shop. The code is shown only to the buyer and recipient." />
      <Fetch path="/admin/gift-cards">{(rows) => (
        <DataTable rows={rows} empty="No gift cards bought yet." columns={[
          { key: 'a', header: 'Amount', render: (g) => <strong>{cents(g.amount_cents)}</strong> }, { key: 's', header: 'Status', render: (g) => <StatusBadge status={g.status} /> },
          { key: 'b', header: 'Bought by', render: (g) => <div>{g.buyer}<div className="text-xs text-gray-500">{g.buyer_email}</div></div> },
          { key: 'r', header: 'For', render: (g) => g.recipient_name || g.recipient_email || '—' }, { key: 'd', header: 'Bought', render: (g) => fmtDateTime(g.created_at) },
        ]} />
      )}</Fetch>
    </Need>
  )
}
