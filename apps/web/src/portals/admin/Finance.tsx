import { useState } from 'react';
import { fmtDate } from '../../api';
import { useAction } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, Confirm, Field, Input, Modal, Notice, PageHeader, Stat, StatusBadge, Tabs, Switch } from '../../ui';
import { DataTable, Fetch, Need, cents, post, put, useCan } from './common';

const ACCOUNT_LABELS: Record<string, string> = {
  cash_provider: 'Cash held at payment provider', vendor_payable: 'Owed to vendors', commission_revenue: 'Commission revenue', delivery_revenue: 'Delivery fee revenue', tax_payable: 'GST collected (owed)',
  discount_expense: 'Coupon discounts funded', driver_payable: 'Owed to drivers', delivery_cost: 'Driver pay (cost)', refund_loss: 'Refunds we absorbed',
};

export function Finance() {
  const [tab, setTab] = useState('balances');
  return (
    <Need perm={['ledger.view', 'payouts.manage']} what="finance">
      <PageHeader title="Finance" sub="The ledger is append-only: mistakes are corrected with reversing entries, never edits." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'balances', label: 'Balances & payouts' }, { id: 'ledger', label: 'Ledger' }]} />
      {tab === 'balances' ? <Balances /> : <Ledger />}
    </Need>
  );
}

function Balances() {
  const can = useCan();
  const toast = useToast();
  const [paying, setPaying] = useState<any | null>(null);
  const [ref, setRef] = useState('');
  const act = useAction(async (fn: () => Promise<any>, reload: () => void) => {
    const r = await fn();
    toast(r.status === 'paid' ? 'Payout sent' : r.status === 'failed' ? `Payout failed: ${r.error}` : 'Payout created. Pay by bank transfer, then mark it paid.', r.status === 'failed' ? 'error' : 'ok'); reload();
  });
  return (
    <Fetch path="/admin/finance/summary">{(s: any, reload) => (
      <>
        <Notice tone="info">Orders become payable to a vendor only after delivery <strong>and</strong> a hold ({s.hold_days} days for stores, {s.hold_days_kitchen} for home kitchens). Vendors with a connected payout account are paid through the payment provider; others are paid by bank transfer and marked paid here. Automatic payouts are {s.auto.enabled ? <strong>ON</strong> : <strong>off</strong>}.</Notice>
        <AutoCard auto={s.auto} reload={reload} />
        {act.error && <Notice tone="error">{act.error}</Notice>}
        <div className="grid cols-4">
          {s.accounts.map((a: any) => <Stat key={a.account} label={ACCOUNT_LABELS[a.account] ?? a.account} value={cents(Math.abs(a.balance_cents))} sub={a.balance_cents < 0 ? 'credit balance' : 'debit balance'} />)}
          {!s.accounts.length && <p className="muted">No ledger entries yet.</p>}
        </div>
        <h2>Vendors</h2>
        <DataTable rows={s.vendors} rowKey={(v: any) => v.id} empty="No vendor activity yet."
          columns={[
            { key: 'n', header: 'Vendor', render: (v: any) => <strong>{v.name}</strong> }, { key: 'o', header: 'Owed in total', render: (v: any) => cents(v.owed_cents) },
            { key: 'p', header: 'Payable now', render: (v: any) => <strong>{cents(v.payable_now_cents)}</strong> }, { key: 'a', header: 'Payout account', render: (v: any) => (v.payout_status === 'enabled' ? <Badge tone="ok">Connected</Badge> : v.payout_status === 'pending' ? <Badge tone="warn">Setup unfinished</Badge> : v.payout_status === 'restricted' ? <Badge tone="danger">Needs details</Badge> : <Badge tone="warn">Bank transfer</Badge>) },
            { key: 'x', header: '', render: (v: any) => (can('payouts.manage') ? <Confirm variant="primary" size="sm" message={`Create a payout of ${cents(v.payable_now_cents)} to ${v.name}? ${v.payout_status === 'enabled' ? 'It will be transferred through the payment provider.' : 'You will then need to pay it by bank transfer and mark it paid.'}`} onConfirm={() => act.run(() => post(`/admin/payouts/vendor/${v.id}`), reload) as any}>Create payout</Confirm> : null) },
          ]} />
        <h2>Drivers</h2>
        <DataTable rows={s.drivers} rowKey={(d: any) => d.id} empty="No driver earnings yet."
          columns={[{ key: 'n', header: 'Driver', render: (d: any) => <strong>{d.full_name}</strong> }, { key: 'u', header: 'Unpaid earnings', render: (d: any) => cents(d.unpaid_cents) },
            { key: 'x', header: '', render: (d: any) => (can('payouts.manage') && d.unpaid_cents > 0 ? <Confirm variant="primary" size="sm" message={`Create a payout of ${cents(d.unpaid_cents)} to ${d.full_name}? Pay by bank transfer, then mark it paid.`} onConfirm={() => act.run(() => post(`/admin/payouts/driver/${d.id}`), reload) as any}>Create payout</Confirm> : null) }]} />
        <h2>Payouts</h2>
        <DataTable rows={s.payouts} rowKey={(p: any) => p.id} empty="No payouts yet."
          columns={[{ key: 'w', header: 'Payee', render: (p: any) => p.vendor_name ?? `Driver` }, { key: 't', header: 'Type', render: (p: any) => p.payee_type }, { key: 'a', header: 'Amount', render: (p: any) => <strong>{cents(p.amount_cents)}</strong> },
            { key: 's', header: 'Status', render: (p: any) => <><StatusBadge status={p.status} />{p.trigger === 'auto' && <span className="small muted"> auto</span>}{p.status === 'failed' && p.note && <div className="small muted">{p.note}</div>}</> }, { key: 'c', header: 'Created', render: (p: any) => fmtDate(p.created_at) },
            { key: 'x', header: '', render: (p: any) => (['pending', 'failed'].includes(p.status) && can('payouts.manage') ? <span className="row"><Button size="sm" variant="secondary" onClick={() => act.run(() => post(`/admin/payouts/${p.id}/retry`), reload)}>Retry transfer</Button><Button size="sm" onClick={() => { setPaying(p); setRef(''); }}>Mark paid</Button></span> : null) }]} />
        <Modal open={!!paying} onClose={() => setPaying(null)} title="Mark payout as paid">
          <p>Confirm you sent <strong>{paying && cents(paying.amount_cents)}</strong> by bank transfer. This clears the amount owed in the ledger and cannot be undone.</p>
          <Field label="Bank transfer reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <div className="row end"><Button variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
            <Button disabled={ref.length < 2} onClick={async () => { await act.run(() => post(`/admin/payouts/${paying.id}/mark-paid`, { reference: ref }).then((r) => ({ ...r, status: 'paid' })), reload); setPaying(null); }}>Confirm paid</Button></div>
        </Modal>
      </>
    )}</Fetch>
  );
}

function AutoCard({ auto, reload }: { auto: { enabled: boolean; min_cents: number }; reload: () => void }) {
  const can = useCan(); const toast = useToast();
  const [min, setMin] = useState((auto.min_cents / 100).toFixed(2));
  const save = useAction(async (patch: () => Promise<any>) => { await patch(); toast('Saved'); reload(); });
  const run = useAction(async () => { const r = await post('/admin/payouts/run-auto'); toast(r.skipped ? 'Automatic payouts are switched off.' : `Paid ${r.created} vendor(s); ${r.retried} failed transfer(s) retried.`); reload(); });
  if (!can('payouts.manage')) return null;
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Automatic payouts</h3>
      {(save.error || run.error) && <Notice tone="error">{save.error || run.error}</Notice>}
      <p className="small muted">When on, every hour each vendor with a connected, enabled account is paid whatever is payable once it reaches the minimum. Failed transfers are retried up to 5 times. Always test with the payment provider’s test mode first.</p>
      <div className="row wrap top">
        <Switch checked={auto.enabled} label="Pay connected vendors automatically" onChange={(v) => save.run(() => put('/admin/settings/payout.auto_enabled', { value: v }))} />
        <Field label="Minimum payout (CAD)"><Input type="number" min="1" step="0.01" value={min} onChange={(e) => setMin(e.target.value)} inputMode="decimal" style={{ maxWidth: 140 }} /></Field>
        <Button size="sm" variant="secondary" style={{ marginTop: 24 }} busy={save.busy} onClick={() => save.run(() => put('/admin/settings/payout.auto_min_cents', { value: Math.round(Number(min) * 100) }))}>Save minimum</Button>
        <Button size="sm" variant="secondary" style={{ marginTop: 24 }} busy={run.busy} onClick={() => run.run()}>Run now</Button>
      </div>
    </Card>
  );
}

function Ledger() {
  const [n, setN] = useState('');
  const [applied, setApplied] = useState('');
  return (
    <Need perm={['ledger.view']} what="the ledger">
      <form className="filters-row" onSubmit={(e) => { e.preventDefault(); setApplied(n.trim()); }}>
        <Field label="Order number"><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="EZ-…" /></Field><Button type="submit">Filter</Button>
      </form>
      <Fetch path={`/admin/ledger${applied ? `?order_number=${encodeURIComponent(applied)}` : ''}`}>{(rows: any[]) => (
        <>
          <p className="small muted">Debits are positive, credits negative. Every transaction sums to zero. Showing the latest 300 entries.</p>
          <DataTable rows={rows} rowKey={(r) => String(r.id)} empty="No entries."
            columns={[{ key: 'at', header: 'When', render: (r) => fmtDate(r.created_at) }, { key: 'o', header: 'Order', render: (r) => r.order_number ?? '' }, { key: 'k', header: 'Kind', render: (r) => r.kind.replace(/_/g, ' ') },
              { key: 'a', header: 'Account', render: (r) => ACCOUNT_LABELS[r.account] ?? r.account }, { key: 'v', header: 'Vendor', render: (r) => r.vendor_name ?? '' },
              { key: 'amt', header: 'Amount', className: 'right nowrap', render: (r) => <span className={r.amount_cents < 0 ? 'warnc' : ''}>{cents(r.amount_cents)}</span> }, { key: 't', header: 'Txn', render: (r) => <code className="small">{String(r.txn_id).slice(0, 8)}</code> }]} />
        </>
      )}</Fetch>
    </Need>
  );
}
