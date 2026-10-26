import { useState } from 'react'
import { toast, useAction, useApi } from '../../shared/hooks'
import { get, post, fmtDateTime, fmtDate } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, Stat, StatusBadge, Tabs, Textarea } from '../../shared/ui'
import { Fetch, Need, cents, useCan } from '../common'

const STATUS = { awaiting_approval: ['amber', 'Waiting for approval'], pending: ['amber', 'To be paid'], failed: ['red', 'Failed'], paid: ['green', 'Paid'], cancelled: ['gray', 'Cancelled'] }
const PayStatus = ({ s }) => { const [t, l] = STATUS[s] ?? ['gray', s]; return <Badge tone={t}>{l}</Badge> }
const H2 = ({ children }) => <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h2>

/** Settlements: what is waiting for a person, a preview before paying a vendor, holds, and statements. All amounts come from the ledger and order records on the server. */
export function Settlements() {
  const [tab, setTab] = useState('queue')
  return (
    <Need perm={['settlements.view', 'ledger.view', 'payouts.manage']} what="settlements">
      <PageHeader title="Settlements" sub="Payouts to vendors and drivers. Preview before paying, hold a payee if something needs checking, and approve large payouts with a second person." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'queue', label: 'Needs attention' }, { id: 'preview', label: 'Preview a vendor' }, { id: 'holds', label: 'Holds' }, { id: 'statements', label: 'Statements' }]} />
      <div className="mt-4 space-y-4">{tab === 'queue' ? <Queue /> : tab === 'preview' ? <Preview /> : tab === 'holds' ? <Holds /> : <Statements />}</div>
    </Need>
  )
}

function Queue() {
  const can = useCan()
  const [cancelling, setCancelling] = useState(null); const [note, setNote] = useState('')
  const [paying, setPaying] = useState(null); const [ref, setRef] = useState('')
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Fetch path="/admin/settlements/queue">{(rows, reload) => (
      <>
        <Alert>{act.error}</Alert>
        <DataTable rows={rows} empty="Nothing is waiting. No payout needs approval, a retry or a bank transfer." columns={[
          { key: 'p', header: 'Payee', render: (r) => <div><strong>{r.payee}</strong><div className="text-xs text-gray-500">{r.payee_type} · created by {r.created_by_name ?? 'automatic run'} · {fmtDateTime(r.created_at)}</div></div> },
          { key: 'a', header: 'Amount', render: (r) => <strong>{cents(r.amount_cents)}</strong> },
          { key: 's', header: 'Status', nowrap: false, render: (r) => <div><PayStatus s={r.status} />{r.note && <div className="text-xs text-gray-500">{r.note}</div>}</div> },
          { key: 'x', header: '', nowrap: false, render: (r) => (
            <div className="flex flex-wrap gap-1.5">
              {r.status === 'awaiting_approval' && can('payouts.approve') && <><Button size="sm" onClick={() => { if (window.confirm(`Approve and send ${cents(r.amount_cents)} to ${r.payee}?`)) act.run(() => post(`/admin/payouts/${r.id}/approve`), 'Payout approved', reload) }}>Approve</Button><Button size="sm" variant="ghost" onClick={() => { setCancelling(r); setNote('') }}>Cancel</Button></>}
              {r.status === 'awaiting_approval' && !can('payouts.approve') && <span className="text-xs text-gray-600">An approver must review this.</span>}
              {['pending', 'failed'].includes(r.status) && can('payouts.manage') && <><Button size="sm" variant="secondary" onClick={() => act.run(() => post(`/admin/payouts/${r.id}/retry`), 'Retried', reload)}>Retry transfer</Button><Button size="sm" onClick={() => { setPaying(r); setRef('') }}>Mark paid</Button></>}
            </div>) },
        ]} />
        {cancelling && (
          <Modal title="Cancel this payout" onClose={() => setCancelling(null)}>
            <div className="space-y-3 text-sm"><p>Nothing has been sent. The orders go back to unpaid and can be paid out again.</p>
              <Field label="Why (recorded)" htmlFor="cn"><Textarea id="cn" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCancelling(null)}>Back</Button><Button variant="danger" disabled={note.trim().length < 3} onClick={async () => { await act.run(() => post(`/admin/payouts/${cancelling.id}/cancel`, { note: note.trim() }), 'Payout cancelled', reload); setCancelling(null) }}>Cancel payout</Button></div></div>
          </Modal>
        )}
        {paying && (
          <Modal title="Mark payout as paid" onClose={() => setPaying(null)}>
            <div className="space-y-3 text-sm"><p>Confirm you sent <strong>{cents(paying.amount_cents)}</strong> to {paying.payee} by bank transfer. This clears what is owed in the ledger and cannot be undone.</p>
              <Field label="Bank transfer reference" htmlFor="pr"><Input id="pr" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setPaying(null)}>Back</Button><Button disabled={ref.length < 2} onClick={async () => { await act.run(() => post(`/admin/payouts/${paying.id}/mark-paid`, { reference: ref }), 'Marked as paid', reload); setPaying(null) }}>Confirm paid</Button></div></div>
          </Modal>
        )}
      </>
    )}</Fetch>
  )
}

function Preview() {
  const can = useCan()
  const payees = useApi('/admin/settlements/payees')
  const [vid, setVid] = useState('')
  const pv = useApi(vid ? `/admin/settlements/vendors/${vid}/preview` : '', { skip: !vid })
  const [reason, setReason] = useState('')
  const make = useAction(async () => { const r = await post(`/admin/payouts/vendor/${vid}`); toast(r.status === 'awaiting_approval' ? 'Created. A second person must approve it.' : r.status === 'paid' ? 'Payout sent' : 'Payout created: pay by bank transfer, then mark it paid'); pv.reload() })
  const hold = useAction(async () => { await post('/admin/holds', { payee_type: 'vendor', vendor_id: vid, reason }); setReason(''); toast('Hold placed'); pv.reload() })
  const d = pv.data
  return (
    <>
      <Field label="Vendor" htmlFor="pvv" className="max-w-sm"><Select id="pvv" value={vid} onChange={(e) => setVid(e.target.value)}><option value="">Choose a vendor…</option>{(payees.data?.vendors ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
      {vid && pv.loading && !d && <Spinner className="h-32" />}
      <Alert>{pv.error}</Alert>
      {d && (
        <>
          {d.discrepancy_cents !== 0 && <Alert tone="warn">The ledger and this vendor’s orders differ by {cents(Math.abs(d.discrepancy_cents))}. Check Reconciliation before paying.</Alert>}
          {d.active_hold && <Alert tone="warn">Payouts to this vendor are on hold: {d.active_hold.reason}. Release the hold (an approver can do this under Holds) to pay.</Alert>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Stat label="Merchandise in this payout" value={cents(d.gross_cents)} /><Stat label="Commission kept" value={cents(d.commission_cents)} /><Stat label="Net payable now" value={cents(d.net_payable_cents)} sub={d.method === 'provider_transfer' ? 'sent through the payment provider' : 'by bank transfer'} /><Stat label="Still in hold" value={cents(d.held_back_cents)} sub={`${d.hold_days} day hold after delivery`} />
          </div>
          {d.needs_approval && <Alert tone="info">This is above {cents(d.approval_threshold_cents)}, so a second person must approve it before it is sent.</Alert>}
          <Card title="Orders included"><DataTable rows={d.eligible_lines} empty="Nothing is payable yet." columns={[{ key: 'o', header: 'Order', render: (l) => <strong>{l.order_number}</strong> }, { key: 'c', header: 'Delivered', render: (l) => fmtDate(l.completed_at) }, { key: 'm', header: 'Merchandise', render: (l) => cents(l.merchandise_cents) }, { key: 'k', header: 'Commission', render: (l) => cents(l.commission_cents) }, { key: 'n', header: 'Net to vendor', render: (l) => <strong>{cents(l.net_cents)}</strong> }]} /></Card>
          {d.held_lines.length > 0 && <Card title="Not yet payable (inside the hold period)"><DataTable rows={d.held_lines} columns={[{ key: 'o', header: 'Order', render: (l) => l.order_number }, { key: 'e', header: 'Payable from', render: (l) => fmtDate(l.eligible_at) }, { key: 'n', header: 'Net', render: (l) => cents(l.net_cents) }]} /></Card>}
          <Card title="Earlier payouts"><DataTable rows={d.previous_payouts} empty="No payouts yet." columns={[{ key: 'a', header: 'Amount', render: (p) => cents(p.amount_cents) }, { key: 's', header: 'Status', render: (p) => <PayStatus s={p.status} /> }, { key: 'd', header: 'Created', render: (p) => fmtDateTime(p.created_at) }, { key: 'r', header: 'Reference', render: (p) => p.reference ?? '—' }]} /></Card>
          <Alert>{make.error || hold.error}</Alert>
          {can('payouts.manage') && (
            <div className="flex flex-wrap items-end gap-3">
              <Button busy={make.busy} disabled={d.net_payable_cents <= 0 || !!d.active_hold} onClick={() => { if (window.confirm(`Create a payout of ${cents(d.net_payable_cents)} to ${d.vendor.name}?`)) make.run() }}>Create payout</Button>
              {!d.active_hold && <><Field label="Hold payouts because…" htmlFor="hr" className="min-w-[16rem]"><Input id="hr" value={reason} onChange={(e) => setReason(e.target.value)} /></Field><Button variant="secondary" busy={hold.busy} disabled={reason.trim().length < 3} onClick={() => hold.run()}>Place a hold</Button></>}
            </div>
          )}
        </>
      )}
    </>
  )
}

function Holds() {
  const can = useCan()
  const act = useAction(async (id, reload) => { await post(`/admin/holds/${id}/release`); toast('Hold released'); reload() })
  return (
    <Fetch path="/admin/holds">{(rows, reload) => (
      <>
        <Alert>{act.error}</Alert>
        <DataTable rows={rows} empty="No payouts are on hold." columns={[{ key: 'p', header: 'Payee', render: (h) => <div><strong>{h.payee}</strong><div className="text-xs text-gray-500">{h.payee_type}</div></div> }, { key: 'r', header: 'Reason', nowrap: false, render: (h) => h.reason }, { key: 'c', header: 'Placed', render: (h) => `${fmtDateTime(h.created_at)} by ${h.created_by_name ?? '—'}` },
          { key: 'x', header: '', render: (h) => (can('payouts.approve') ? <Button size="sm" onClick={() => act.run(h.id, reload)}>Release</Button> : <span className="text-xs text-gray-600">An approver releases holds</span>) }]} />
      </>
    )}</Fetch>
  )
}

function Statements() {
  const payees = useApi('/admin/settlements/payees')
  const [who, setWho] = useState('')   // 'vendor:ID' or 'driver:ID'
  const [kind, id] = who.split(':')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()
  const st = useApi(who ? `/admin/statements/${kind}/${id}?${qs}` : '', { skip: !who })
  const s = st.data
  return (
    <>
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Statement for" htmlFor="sw"><Select id="sw" value={who} onChange={(e) => setWho(e.target.value)}><option value="">Choose…</option><optgroup label="Vendors">{(payees.data?.vendors ?? []).map((v) => <option key={v.id} value={`vendor:${v.id}`}>{v.name}</option>)}</optgroup><optgroup label="Drivers">{(payees.data?.drivers ?? []).map((v) => <option key={v.id} value={`driver:${v.id}`}>{v.full_name}</option>)}</optgroup></Select></Field>
        <Field label="From" htmlFor="sf"><Input id="sf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To" htmlFor="st"><Input id="st" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <Alert>{st.error}</Alert>
      {s && kind === 'vendor' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Stat label="Merchandise" value={cents(s.totals.merchandise_cents)} /><Stat label="Commission" value={cents(s.totals.commission_cents)} /><Stat label="Refund adjustments" value={cents(s.totals.refund_adjustment_cents)} /><Stat label="Net to vendor" value={cents(s.totals.net_cents)} sub={`${cents(s.paid_cents)} paid in this period`} /></div>
          <DataTable rows={s.lines} empty="No orders in this period." columns={[{ key: 'o', header: 'Order', render: (l) => <strong>{l.order_number}</strong> }, { key: 'd', header: 'Date', render: (l) => fmtDate(l.at) }, { key: 'm', header: 'Merchandise', render: (l) => cents(l.merchandise_cents) }, { key: 'k', header: 'Commission', render: (l) => cents(l.commission_cents) }, { key: 'r', header: 'Refunds', render: (l) => cents(l.refund_adjustment_cents) }, { key: 'n', header: 'Net', render: (l) => <strong>{cents(l.net_cents)}</strong> }, { key: 'p', header: 'Payout', render: (l) => (l.payout_status ? <PayStatus s={l.payout_status} /> : <span className="text-gray-600">Unpaid</span>) }]} />
        </>
      )}
      {s && kind === 'driver' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Stat label="Base pay" value={cents(s.totals.base_cents)} /><Stat label="Tips" value={cents(s.totals.tips_cents)} sub="all to the driver" /><Stat label="Total earned" value={cents(s.totals.total_cents)} /><Stat label="Unpaid now" value={cents(s.unpaid_cents)} sub={`${cents(s.paid_cents)} paid in this period`} /></div>
          <DataTable rows={s.lines} empty="No deliveries in this period." columns={[{ key: 'o', header: 'Order', render: (l) => <strong>{l.order_number}</strong> }, { key: 'd', header: 'Date', render: (l) => fmtDate(l.at) }, { key: 'b', header: 'Base', render: (l) => cents(l.base_cents) }, { key: 't', header: 'Tip', render: (l) => cents(l.tip_cents) }, { key: 'n', header: 'Total', render: (l) => <strong>{cents(l.total_cents)}</strong> }, { key: 'p', header: 'Payout', render: (l) => (l.payout_status ? <PayStatus s={l.payout_status} /> : <span className="text-gray-600">Unpaid</span>) }]} />
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------ Reconciliation */

const SEV = { high: ['red', 'High'], medium: ['amber', 'Medium'], info: ['blue', 'Info'] }
const EST = { open: ['red', 'Open'], acknowledged: ['amber', 'Acknowledged'], resolved: ['green', 'Resolved'] }

export function Reconciliation() {
  const can = useCan()
  const { data, error, loading, reload } = useApi('/admin/reconciliation')
  const [sel, setSel] = useState(null); const [action, setAction] = useState('acknowledged'); const [note, setNote] = useState('')
  const save = useAction(async () => { await post('/admin/reconciliation/notes', { key: sel.key, action, note: note.trim() }); toast('Recorded'); setSel(null); setNote(''); reload() })
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const csv = `/api/admin/reconciliation/movements.csv?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`
  return (
    <Need perm={['settlements.view', 'ledger.view', 'payouts.manage']} what="reconciliation">
      <PageHeader title="Reconciliation" sub="Cross-checks between payments, refunds, payouts, earnings and the ledger. It only reports differences: it never creates a balancing entry. A person decides what to do." actions={<Button variant="secondary" onClick={reload}>Check again</Button>} />
      {loading && !data && <Spinner className="h-32" />}
      <Alert>{error}</Alert>
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Stat label="Open differences" value={data.open_count} sub={data.open_count ? 'need a person' : 'nothing to review'} /><Stat label="Cash held at the provider (ledger)" value={cents(data.ledger_cash_held_cents)} /><Stat label="Checked" value={fmtDateTime(data.checked_at)} />
          </div>
          <Alert tone={data.open_count ? 'warn' : 'info'}>{data.open_count ? `${data.open_count} difference(s) need review below.` : 'The ledger agrees with the payment, refund, payout and earning records.'} Not checked here: {data.not_checked}</Alert>
          <DataTable rows={data.exceptions} rowKey={(e) => e.key} empty="No differences found." onRow={can('payouts.manage') ? setSel : undefined} columns={[
            { key: 's', header: 'Severity', render: (e) => <Badge tone={SEV[e.severity][0]}>{SEV[e.severity][1]}</Badge> },
            { key: 't', header: 'What', nowrap: false, render: (e) => <div><strong>{e.title}</strong><div className="text-xs text-gray-600">{e.detail}</div>{e.last_note && <div className="text-xs text-gray-500 mt-1">Note: {e.last_note}</div>}</div> },
            { key: 'a', header: 'Amount', render: (e) => (e.amount_cents != null ? cents(Math.abs(e.amount_cents)) : '—') },
            { key: 'st', header: 'Status', render: (e) => <Badge tone={EST[e.status][0]}>{EST[e.status][1]}</Badge> },
          ]} />
          <Card title="Match against the payment provider" sub="Download every payment, refund and payout with its provider reference, and compare it with the provider's own report. Rows marked false are not in the ledger.">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="From" htmlFor="rf"><Input id="rf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To" htmlFor="rt"><Input id="rt" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
              <a className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700" href={csv}>Download movements (CSV)</a>
            </div>
          </Card>
          <details className="text-sm"><summary className="cursor-pointer text-primary-700">What is checked</summary><ul className="list-disc ml-5 mt-2 text-gray-700">{data.checks.map((c) => <li key={c}>{c}</li>)}</ul></details>
        </>
      )}
      {sel && (
        <Modal title={sel.title} onClose={() => setSel(null)}>
          <div className="space-y-3 text-sm"><p>{sel.detail}</p><p className="text-xs text-gray-600">Recording a note does not change any money. The difference stays listed until the underlying records are corrected.</p>
            <Alert>{save.error}</Alert>
            <Field label="What you did or found" htmlFor="rn"><Textarea id="rn" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Field label="Mark as" htmlFor="ra"><Select id="ra" value={action} onChange={(e) => setAction(e.target.value)}><option value="acknowledged">Acknowledged (being looked at)</option><option value="resolved">Resolved (records corrected)</option><option value="note">Note only</option></Select></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setSel(null)}>Cancel</Button><Button busy={save.busy} disabled={note.trim().length < 3} onClick={() => save.run()}>Save</Button></div></div>
        </Modal>
      )}
    </Need>
  )
}
