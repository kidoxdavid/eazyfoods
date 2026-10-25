import { useState } from 'react'
import { toast, useAction } from '../../shared/hooks'
import { post, put, fmtDateTime } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Stat, StatusBadge, Switch, Tabs } from '../../shared/ui'
import { Fetch, Need, Why, cents, useCan } from '../common'

const ACCOUNT_LABELS = {
  cash_provider: 'Cash held at payment provider', vendor_payable: 'Owed to vendors', commission_revenue: 'Commission revenue', delivery_revenue: 'Delivery fee revenue', tax_payable: 'GST collected (owed)',
  discount_expense: 'Coupon discounts funded', driver_payable: 'Owed to drivers', delivery_cost: 'Driver pay (cost)', refund_loss: 'Refunds we absorbed',
}
const H2 = ({ children }) => <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{children}</h2>
const Grid = ({ n = 4, children }) => <div className={`grid grid-cols-2 ${n === 3 ? 'lg:grid-cols-3' : n === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>{children}</div>
const ask = (m, fn) => () => { if (window.confirm(m)) fn() }

/* -------------------------------------------------------------- Finance */

export function Finance() {
  const [tab, setTab] = useState('balances')
  return (
    <Need perm={['ledger.view', 'payouts.manage']} what="finance">
      <PageHeader title="Finance" sub="The ledger is append-only: mistakes are corrected with reversing entries, never edits." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'balances', label: 'Balances & payouts' }, { id: 'ledger', label: 'Ledger' }]} />
      <div className="mt-4 space-y-4">{tab === 'balances' ? <Balances /> : <Ledger />}</div>
    </Need>
  )
}

function Balances() {
  const can = useCan()
  const [paying, setPaying] = useState(null)
  const [ref, setRef] = useState('')
  const act = useAction(async (fn, reload) => {
    const r = await fn()
    toast(r.status === 'paid' ? 'Payout sent' : r.status === 'failed' ? `Payout failed: ${r.error}` : 'Payout created. Pay by bank transfer, then mark it paid.', r.status === 'failed' ? 'error' : 'ok'); reload()
  })
  return (
    <Fetch path="/admin/finance/summary">{(s, reload) => (
      <>
        <Alert tone="info">Orders become payable to a vendor only after delivery <strong>and</strong> a hold ({s.hold_days} days for stores, {s.hold_days_kitchen} for home kitchens). Vendors with a connected payout account are paid through the payment provider; others are paid by bank transfer and marked paid here. Automatic payouts are {s.auto.enabled ? <strong>ON</strong> : <strong>off</strong>}.</Alert>
        <AutoCard auto={s.auto} reload={reload} />
        <Alert>{act.error}</Alert>
        <Grid>
          {s.accounts.map((a) => <Stat key={a.account} label={ACCOUNT_LABELS[a.account] ?? a.account} value={cents(Math.abs(a.balance_cents))} sub={a.balance_cents < 0 ? 'credit balance' : 'debit balance'} />)}
          {!s.accounts.length && <p className="text-sm text-gray-500">No ledger entries yet.</p>}
        </Grid>
        <H2>Vendors</H2>
        <DataTable rows={s.vendors} empty="No vendor activity yet." columns={[
          { key: 'n', header: 'Vendor', render: (v) => <strong>{v.name}</strong> }, { key: 'o', header: 'Owed in total', render: (v) => cents(v.owed_cents) },
          { key: 'p', header: 'Payable now', render: (v) => <strong>{cents(v.payable_now_cents)}</strong> },
          { key: 'a', header: 'Payout account', render: (v) => (v.payout_status === 'enabled' ? <Badge tone="green">Connected</Badge> : v.payout_status === 'pending' ? <Badge tone="amber">Setup unfinished</Badge> : v.payout_status === 'restricted' ? <Badge tone="red">Needs details</Badge> : <Badge tone="amber">Bank transfer</Badge>) },
          { key: 'x', header: '', render: (v) => (can('payouts.manage') ? <Button size="sm" onClick={ask(`Create a payout of ${cents(v.payable_now_cents)} to ${v.name}? ${v.payout_status === 'enabled' ? 'It will be transferred through the payment provider.' : 'You will then need to pay it by bank transfer and mark it paid.'}`, () => act.run(() => post(`/admin/payouts/vendor/${v.id}`), reload))}>Create payout</Button> : null) },
        ]} />
        <H2>Drivers</H2>
        <DataTable rows={s.drivers} empty="No driver earnings yet." columns={[
          { key: 'n', header: 'Driver', render: (d) => <strong>{d.full_name}</strong> }, { key: 'u', header: 'Unpaid earnings', render: (d) => cents(d.unpaid_cents) },
          { key: 'x', header: '', render: (d) => (can('payouts.manage') && d.unpaid_cents > 0 ? <Button size="sm" onClick={ask(`Create a payout of ${cents(d.unpaid_cents)} to ${d.full_name}? Pay by bank transfer, then mark it paid.`, () => act.run(() => post(`/admin/payouts/driver/${d.id}`), reload))}>Create payout</Button> : null) },
        ]} />
        <H2>Payouts</H2>
        <DataTable rows={s.payouts} empty="No payouts yet." columns={[
          { key: 'w', header: 'Payee', render: (p) => p.vendor_name ?? 'Driver' }, { key: 't', header: 'Type', render: (p) => p.payee_type }, { key: 'a', header: 'Amount', render: (p) => <strong>{cents(p.amount_cents)}</strong> },
          { key: 's', header: 'Status', render: (p) => <span><StatusBadge status={p.status} />{p.trigger === 'auto' && <span className="text-xs text-gray-500"> auto</span>}{p.status === 'failed' && p.note && <div className="text-xs text-gray-500">{p.note}</div>}</span> },
          { key: 'c', header: 'Created', render: (p) => fmtDateTime(p.created_at) },
          { key: 'x', header: '', render: (p) => (['pending', 'failed'].includes(p.status) && can('payouts.manage') ? <span className="flex gap-1.5"><Button size="sm" variant="secondary" onClick={() => act.run(() => post(`/admin/payouts/${p.id}/retry`), reload)}>Retry transfer</Button><Button size="sm" onClick={() => { setPaying(p); setRef('') }}>Mark paid</Button></span> : null) },
        ]} />
        {paying && (
          <Modal title="Mark payout as paid" onClose={() => setPaying(null)}>
            <div className="space-y-3 text-sm">
              <p>Confirm you sent <strong>{cents(paying.amount_cents)}</strong> by bank transfer. This clears the amount owed in the ledger and cannot be undone.</p>
              <Field label="Bank transfer reference" htmlFor="pref"><Input id="pref" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
                <Button disabled={ref.length < 2} onClick={async () => { await act.run(() => post(`/admin/payouts/${paying.id}/mark-paid`, { reference: ref }).then((r) => ({ ...r, status: 'paid' })), reload); setPaying(null) }}>Confirm paid</Button></div>
            </div>
          </Modal>
        )}
      </>
    )}</Fetch>
  )
}

function AutoCard({ auto, reload }) {
  const can = useCan()
  const [min, setMin] = useState((auto.min_cents / 100).toFixed(2))
  const save = useAction(async (fn) => { await fn(); toast('Saved'); reload() })
  const run = useAction(async () => { const r = await post('/admin/payouts/run-auto'); toast(r.skipped ? 'Automatic payouts are switched off.' : `Paid ${r.created} vendor(s); ${r.retried} failed transfer(s) retried.`); reload() })
  if (!can('payouts.manage')) return null
  return (
    <Card title="Automatic payouts" sub="When on, every hour each vendor with a connected, enabled account is paid whatever is payable once it reaches the minimum. Failed transfers are retried up to 5 times. Always test with the payment provider’s test mode first.">
      <Alert>{save.error || run.error}</Alert>
      <div className="flex flex-wrap items-end gap-4 mt-2">
        <Switch checked={auto.enabled} label="Pay connected vendors automatically" onChange={(v) => save.run(() => put('/admin/settings/payout.auto_enabled', { value: v }))} />
        <Field label="Minimum payout (CAD)" htmlFor="pmin"><Input id="pmin" type="number" min="1" step="0.01" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} className="max-w-[9rem]" /></Field>
        <Button size="sm" variant="secondary" busy={save.busy} onClick={() => save.run(() => put('/admin/settings/payout.auto_min_cents', { value: Math.round(Number(min) * 100) }))}>Save minimum</Button>
        <Button size="sm" variant="secondary" busy={run.busy} onClick={() => run.run()}>Run now</Button>
      </div>
    </Card>
  )
}

function Ledger() {
  const [n, setN] = useState('')
  const [applied, setApplied] = useState('')
  return (
    <Need perm={['ledger.view']} what="the ledger">
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(n.trim()) }}>
        <Field label="Order number" htmlFor="lon"><Input id="lon" value={n} onChange={(e) => setN(e.target.value)} placeholder="EZ-…" /></Field><Button type="submit">Filter</Button>
      </form>
      <Fetch path={`/admin/ledger${applied ? `?order_number=${encodeURIComponent(applied)}` : ''}`}>{(rows) => (
        <>
          <p className="text-xs text-gray-500">Debits are positive, credits negative. Every transaction sums to zero. Showing the latest 300 entries.</p>
          <DataTable rows={rows} rowKey={(r) => String(r.id)} empty="No entries." columns={[
            { key: 'at', header: 'When', render: (r) => fmtDateTime(r.created_at) }, { key: 'o', header: 'Order', render: (r) => r.order_number ?? '' }, { key: 'k', header: 'Kind', render: (r) => r.kind.replace(/_/g, ' ') },
            { key: 'a', header: 'Account', render: (r) => ACCOUNT_LABELS[r.account] ?? r.account }, { key: 'v', header: 'Vendor', render: (r) => r.vendor_name ?? '' },
            { key: 'amt', header: 'Amount', right: true, render: (r) => <span className={r.amount_cents < 0 ? 'text-amber-700' : ''}>{cents(r.amount_cents)}</span> }, { key: 't', header: 'Txn', render: (r) => <code className="text-xs">{String(r.txn_id).slice(0, 8)}</code> },
          ]} />
        </>
      )}</Fetch>
    </Need>
  )
}

/* -------------------------------------------------------------- Reports */

const pct = (v) => (v == null ? '—' : `${v}%`)

export function Reports() {
  const [tab, setTab] = useState('kpis')
  const [r, setR] = useState({ from: '', to: '' })
  const qs = new URLSearchParams({ ...(r.from ? { from: r.from } : {}), ...(r.to ? { to: r.to } : {}) }).toString()
  return (
    <Need perm={['reports.view']} what="reports">
      <PageHeader title="Reports" sub="Every number comes from real orders and events in this database. Definitions are shown next to each figure." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'kpis', label: 'Marketplace KPIs' }, { id: 'sales', label: 'Sales breakdown' }, { id: 'search', label: 'Search demand' }]} />
      <div className="mt-4 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Field label="From" htmlFor="rf"><Input id="rf" type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} /></Field>
          <Field label="To" htmlFor="rto"><Input id="rto" type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} /></Field>
        </div>
        {tab === 'kpis' && <Kpis qs={qs} />}
        {tab === 'sales' && <Sales qs={qs} />}
        {tab === 'search' && <SearchDemand qs={qs} />}
      </div>
    </Need>
  )
}

const K = ({ label, value, def, sub }) => <div className="space-y-1"><Stat label={label} value={value} sub={sub} /><Why>{def}</Why></div>

function Kpis({ qs }) {
  return (
    <Fetch path={`/admin/reports/kpis?${qs}`}>{(k) => {
      const d = k.definitions; const m = k.marketplace
      return (
        <>
          <Alert tone="warn">{k.data_caveat} Period: {k.period.from} to {k.period.to}.</Alert>
          <H2>Marketplace</H2>
          <Grid>
            <K label="Paid orders" value={m.orders} def={d.orders} /><K label="GMV" value={cents(m.gmv_cents)} def={d.gmv} /><K label="Net GMV" value={cents(m.net_gmv_cents)} def={d.net_gmv} />
            <K label="Average order value" value={m.aov_cents == null ? '—' : cents(m.aov_cents)} def={d.aov} />
            <K label="Gross marketplace revenue" value={cents(m.gross_marketplace_revenue_cents)} def={d.gross_marketplace_revenue} />
            <K label="Net marketplace revenue" value={cents(m.net_marketplace_revenue_cents)} def={d.net_marketplace_revenue} sub="before payment-processing fees" />
            <K label="Refund rate" value={pct(m.refund_rate_pct)} def={d.refund_rate} /><K label="Cancellation rate" value={pct(m.cancellation_rate_pct)} def={d.cancellation_rate} />
            <K label="Avg fulfilment time" value={m.avg_fulfilment_minutes == null ? '—' : `${m.avg_fulfilment_minutes} min`} def={d.avg_fulfilment_minutes} />
            <K label="On-time delivery" value={pct(m.on_time_delivery_rate_pct)} def={d.on_time_delivery_rate} /><K label="Out-of-stock rate" value={pct(m.out_of_stock_rate_pct)} def={d.out_of_stock_rate} />
          </Grid>
          <H2>Customers and vendors</H2>
          <Grid>
            <K label="Repeat purchase rate" value={pct(k.customers.repeat_purchase_rate_pct)} def={d.repeat_purchase_rate} sub={`${k.customers.customers_in_period} customers in period`} />
            <K label="30-day customer retention" value={pct(k.customers.retention_30d_pct)} def={d.retention_30d} />
            <K label="Vendor activation" value={pct(k.vendors.activation_rate_pct)} def={d.vendor_activation_rate} sub={`${k.vendors.approved} approved vendors`} /><K label="30-day vendor retention" value={pct(k.vendors.retention_30d_pct)} def={d.vendor_retention_30d} />
          </Grid>
          <H2>Funnel</H2>
          <p className="text-xs text-gray-500 mb-2">{d.funnel}</p>
          <Grid>
            <Stat label="Viewed a product" value={k.funnel.viewed} /><Stat label="Added to basket" value={k.funnel.added} sub={`${pct(k.funnel.view_to_cart_pct)} of viewers`} />
            <Stat label="Started checkout" value={k.funnel.checkout} sub={`${pct(k.funnel.cart_to_checkout_pct)} of adders`} /><Stat label="Paid" value={k.funnel.paid} sub={`${pct(k.funnel.checkout_to_paid_pct)} of checkouts`} />
            <Stat label="Overall conversion" value={pct(k.funnel.overall_conversion_pct)} sub="paid ÷ viewers" />
          </Grid>
        </>
      )
    }}</Fetch>
  )
}

function Sales({ qs }) {
  return (
    <Fetch path={`/admin/reports/sales?${qs}`}>{(s) => (
      <>
        <Grid n={3}><Stat label="Orders per active store" value={s.orders_per_active_store ?? '—'} />
          <Stat label="Pipeline → launched" value={pct(s.vendor_pipeline.prospect_to_launch_pct)} sub={`${s.vendor_pipeline.total} prospects`} /><Stat label="Avg days first contact → launch" value={s.vendor_pipeline.avg_days_first_contact_to_launch ?? '—'} /></Grid>
        <Grid n={2}>
          <Card title="By region (culinary tradition)"><DataTable rows={s.by_region} rowKey={(r) => r.region} empty="No sales in this period." columns={[{ key: 'region', header: 'Region' }, { key: 'g', header: 'GMV', render: (r) => cents(r.gmv_cents) }]} /></Card>
          <Card title="By category"><DataTable rows={s.by_category} rowKey={(r) => r.category} empty="No sales in this period." columns={[{ key: 'category', header: 'Category' }, { key: 'g', header: 'GMV', render: (r) => cents(r.gmv_cents) }]} /></Card>
        </Grid>
        <Card title="By store"><DataTable rows={s.by_store} rowKey={(r) => r.store} empty="No sales in this period." columns={[{ key: 'store', header: 'Store' }, { key: 'orders', header: 'Orders' }, { key: 'g', header: 'GMV', render: (r) => cents(r.gmv_cents) }]} /></Card>
        <Card title="Coupons"><DataTable rows={s.promotions} rowKey={(r) => r.code} empty="No coupons." columns={[{ key: 'code', header: 'Code' }, { key: 'orders', header: 'Orders' }, { key: 'd', header: 'Discount cost', render: (r) => cents(r.discount_cost_cents) }, { key: 'm', header: 'Merchandise on those orders', render: (r) => cents(r.merchandise_cents) }]} /></Card>
        <Card title="Sponsored placements (measured)"><p className="text-sm">{s.sponsored.impressions} impressions · {s.sponsored.clicks} clicks · click-through {pct(s.sponsored.ctr_pct)}</p><p className="text-xs text-gray-500">We only report what we counted. We do not attribute sales to advertising.</p></Card>
        <Card title="Vendor pipeline by stage"><div className="flex flex-wrap gap-2">{Object.entries(s.vendor_pipeline.by_stage).map(([k, v]) => <Badge key={k} tone="blue">{k}: {String(v)}</Badge>)}</div></Card>
      </>
    )}</Fetch>
  )
}

function SearchDemand({ qs }) {
  return (
    <Fetch path={`/admin/reports/search-demand?${qs}`}>{(s) => (
      <>
        <Grid n={3}><Stat label="Searches" value={s.searches} /><Stat label="With no results" value={s.zero_result_searches} /><Stat label="No-result rate" value={pct(s.zero_result_rate_pct)} /></Grid>
        <H2>What shoppers wanted but could not find</H2>
        <p className="text-xs text-gray-500 mb-2">Top queries with zero results. Use them to add products, spellings and verified aliases.</p>
        <DataTable rows={s.unmet_queries} rowKey={(q) => q.query} empty="No unmet searches in this period." columns={[{ key: 'query', header: 'Search', render: (q) => <strong>{q.query}</strong> }, { key: 'searches', header: 'Times searched' }]} />
      </>
    )}</Fetch>
  )
}

/* --------------------------------------------------------------- System */

export function System() {
  const [tab, setTab] = useState('health')
  return (
    <>
      <PageHeader title="System" sub="Health checks, integrations, errors and the audit trail." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'health', label: 'Health & integrations' }, { id: 'audit', label: 'Audit log' }]} />
      <div className="mt-4 space-y-4">{tab === 'health' ? <Health /> : <Audit />}</div>
    </>
  )
}

function Health() {
  return (
    <Need perm={['settings.view', 'orders.view']} what="system health">
      <Fetch path="/admin/system">{(s) => {
        const mock = s.integrations.find((i) => i.name === 'Payments' && /MOCK/i.test(i.note))
        return (
          <>
            {mock && <div role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 text-red-900 px-4 py-3 text-sm font-medium">TEST MODE ONLY. Payments are using the development mock provider: no real money can be taken and no real refunds are sent. Do not launch like this.</div>}
            <Card title="Health checks">
              <div className="space-y-1.5">{s.checks.map((c) => <div key={c.name} className="flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${c.ok ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" /><strong>{c.name}</strong><span className="text-gray-500 text-xs">{c.ok ? 'OK' : 'Needs attention'} · {c.detail}</span></div>)}</div>
              <p className="text-xs text-gray-500 mt-2">Database time: {fmtDateTime(s.database.time)}{s.last_payment_event_at ? ` · last payment event ${fmtDateTime(s.last_payment_event_at)}` : ''}</p>
            </Card>
            <Card title="Integrations">
              <DataTable rows={s.integrations} rowKey={(i) => i.name} columns={[{ key: 'n', header: 'Integration', render: (i) => <strong>{i.name}</strong> }, { key: 'c', header: 'State', render: (i) => (i.configured ? <Badge tone="green">Configured</Badge> : <Badge tone="amber">Not configured</Badge>) }, { key: 'note', header: 'Note', nowrap: false }]} />
            </Card>
            <Card title={`Recent server errors (${s.errors_24h} in the last 24 hours)`}>
              <DataTable rows={s.recent_errors} rowKey={(e) => String(e.id)} empty="No errors logged." columns={[{ key: 'at', header: 'When', render: (e) => fmtDateTime(e.created_at) }, { key: 'm', header: 'Request', render: (e) => `${e.method} ${e.url}` }, { key: 'msg', header: 'Message', nowrap: false, render: (e) => <span className="text-xs">{e.message}</span> }]} />
            </Card>
          </>
        )
      }}</Fetch>
    </Need>
  )
}

const ENTITIES = ['vendor', 'store', 'product', 'refund', 'payout', 'setting', 'user', 'coupon', 'ad_campaign', 'driver', 'delivery', 'zone', 'region', 'collection', 'page', 'template', 'recipe', 'ticket', 'content']

function Audit() {
  const [type, setType] = useState('')
  const [action, setAction] = useState('')
  const qs = new URLSearchParams({ ...(type ? { entity_type: type } : {}), ...(action ? { action } : {}) }).toString()
  return (
    <Need perm={['audit.view']} what="the audit log">
      <div className="flex gap-3 flex-wrap">
        <Field label="Entity" htmlFor="aen"><Select id="aen" value={type} onChange={(e) => setType(e.target.value)}><option value="">All</option>{ENTITIES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
        <Field label="Action starts with" htmlFor="aac"><Input id="aac" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. setting" /></Field>
      </div>
      <Alert tone="info">The audit log is append-only. It records who did what and when for every consequential action.</Alert>
      <Fetch path={`/admin/audit${qs ? `?${qs}` : ''}`}>{(rows) => (
        <DataTable rows={rows} rowKey={(r) => String(r.id)} empty="Nothing recorded for this filter." columns={[
          { key: 'at', header: 'When', render: (r) => fmtDateTime(r.created_at) }, { key: 'who', header: 'Who', render: (r) => r.actor ?? 'System' }, { key: 'a', header: 'Action', render: (r) => <strong>{r.action}</strong> },
          { key: 'e', header: 'Entity', render: (r) => <span className="text-xs">{r.entity_type} {String(r.entity_id).slice(0, 8)}</span> },
          { key: 'd', header: 'Detail', nowrap: false, render: (r) => (Object.keys(r.detail ?? {}).length ? <code className="text-xs break-all">{JSON.stringify(r.detail)}</code> : '') },
        ]} />
      )}</Fetch>
    </Need>
  )
}
