import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAction, useApi, toast } from '../../shared/hooks'
import { post, put, patch, fmtDate } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, StatusBadge, Switch, Textarea, confirmThen } from '../../shared/ui'
import { CheckList, DeleteButton, Fetch, Need, cents, lines, useCan, Kv } from '../common'

export function Vendors() {
  const [status, setStatus] = useState('')
  const nav = useNavigate()
  return (
    <Need perm={['vendors.manage']} what="managing vendors">
      <PageHeader title="Vendors" sub="Review applications, verify business documents, approve stores." />
      <Field label="Status" htmlFor="vs" className="max-w-xs"><Select id="vs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="submitted">Submitted (needs review)</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="suspended">Suspended</option></Select></Field>
      <Fetch path={`/admin/vendors${status ? `?status=${status}` : ''}`}>{(rows) => (
        <DataTable rows={rows} onRow={(r) => nav(`/vendors/${r.id}`)} empty="No vendors match." columns={[
          { key: 'name', header: 'Vendor', nowrap: false, render: (r) => <><strong>{r.name}</strong> {r.kind === 'chef' && <Badge tone="blue">Home chef</Badge>} {r.is_test_data && <Badge tone="purple">Demo</Badge>}</> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { key: 'stores', header: 'Stores' },
          { key: 'docs', header: 'Documents', render: (r) => <>{r.verified_docs} verified{r.pending_docs ? <> · <Badge tone="yellow">{r.pending_docs} to review</Badge></> : null}</> },
          { key: 'commission', header: 'Commission', render: (r) => (r.commission_bps == null ? 'Default' : `${r.commission_bps / 100}%`) }, { key: 'submitted', header: 'Submitted', render: (r) => fmtDate(r.submitted_at) }]} />
      )}</Fetch>
    </Need>
  )
}

export function VendorDetail() {
  const { id } = useParams()
  const can = useCan(); const nav = useNavigate()
  const [rejecting, setRejecting] = useState(null); const [note, setNote] = useState(''); const [comm, setComm] = useState(null); const [acct, setAcct] = useState(null)
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  const openPortal = useAction(async () => { await post(`/admin/control/act-as/${id}`); window.location.href = '/vendor/' })
  return (
    <Need perm={['vendors.manage']} what="managing vendors">
      <Fetch path={`/admin/vendors/${id}`}>{(v, reload) => {
        const verified = v.documents.some((d) => d.status === 'verified')
        return (
          <>
            <Link to="/vendors" className="text-sm text-primary-600 hover:text-primary-700">← All vendors</Link>
            <PageHeader title={v.name} sub={<><StatusBadge status={v.status} /> {v.legal_name && <>· {v.legal_name}</>}</>} actions={can('control.manage') ? <Button size="sm" busy={openPortal.busy} onClick={() => openPortal.run()}>Open their portal</Button> : undefined} />
            <Alert>{act.error || openPortal.error}</Alert>
            {v.kind === 'chef' && <Alert tone="warn"><strong>Home chef or restaurant.</strong> Approval needs a verified <strong>food premises permit</strong> plus a verified <strong>food-handler certificate</strong> (home chef) or <strong>business licence</strong> (restaurant). Check they are genuine and current.</Alert>}
            {v.status === 'submitted' && !verified && <Alert tone="warn">This vendor cannot be approved until at least one business document is <strong>verified</strong> (open the documents below, check them, then verify).</Alert>}
            <div className="flex flex-wrap gap-2">
              {v.status !== 'approved' && <Button onClick={confirmThen(`Approve ${v.name}? Their stores can then be published and take orders.`, () => act.run(() => patch(`/admin/vendors/${id}/status`, { status: 'approved' }), 'Vendor approved', reload))}>Approve vendor</Button>}
              {v.status !== 'suspended' && <Button variant="secondary" onClick={confirmThen(`Suspend ${v.name}? Their stores stop appearing and cannot take orders.`, () => act.run(() => patch(`/admin/vendors/${id}/status`, { status: 'suspended' }), 'Vendor suspended', reload))}>Suspend</Button>}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <Card title="Business"><Kv rows={[['Business number', v.business_number], ['Phone', v.phone], ['Email', v.contact_email], ['Agreement', v.agreement_accepted_at ? `Accepted ${fmtDate(v.agreement_accepted_at)} (${v.agreement_version})` : <Badge key="a" tone="yellow">Not accepted</Badge>], ['Payout account', v.stripe_account_id ?? 'Not connected']]} /></Card>
              <Card title="People">{v.members.length ? <Kv rows={v.members.map((m) => [m.role.replace('vendor_', ''), `${m.full_name} · ${m.email}`])} /> : <p className="text-sm text-gray-500">No members.</p>}</Card>
            </div>
            <Card title="Stores">
              <DataTable rows={v.stores} empty="No stores." columns={[{ key: 'name', header: 'Store', render: (s) => <strong>{s.name}</strong> }, { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> }, { key: 'addr', header: 'Address', nowrap: false, render: (s) => `${s.address_line ?? ''} ${s.city ?? ''} ${s.postal_code ?? ''}` }, { key: 'phone', header: 'Phone' }]} />
              <p className="text-xs text-gray-500 mt-2">Publish stores from <Link className="underline" to="/stores">Stores</Link> once the vendor is approved.</p>
            </Card>
            <Card title="Business documents" sub="Documents are private. Open each, check it matches the business, then verify or reject with a note.">
              <DataTable rows={v.documents} empty="No documents uploaded yet." columns={[
                { key: 'kind', header: 'Type', render: (d) => d.kind.replace(/_/g, ' ') }, { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> }, { key: 'note', header: 'Note', nowrap: false, render: (d) => d.review_note ?? '' }, { key: 'at', header: 'Uploaded', render: (d) => fmtDate(d.created_at) },
                { key: 'a', header: '', nowrap: false, render: (d) => (
                  <div className="flex flex-wrap gap-2">
                    <a className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" href={`/api/admin/vendor-documents/${d.id}/file`} target="_blank" rel="noreferrer">Open file</a>
                    <Button size="sm" onClick={() => act.run(() => patch(`/admin/vendor-documents/${d.id}`, { status: 'verified' }), 'Document verified', reload)}>Verify</Button>
                    <Button size="sm" variant="danger" onClick={() => { setRejecting(d.id); setNote('') }}>Reject</Button>
                  </div>) }]} />
            </Card>
            <Card title="Commercial terms">
              <p className="text-sm">Commission: <strong>{v.commission_bps == null ? 'marketplace default' : `${v.commission_bps / 100}%`}</strong></p>
              <div className="mt-2">{can('settings.manage') ? <Button variant="secondary" size="sm" onClick={() => setComm(v.commission_bps == null ? '' : String(v.commission_bps / 100))}>Change commission override</Button> : <p className="text-xs text-gray-500">Only an admin can change a vendor’s commission.</p>}</div>
              <hr className="my-3" />
              <p className="text-sm">Payout account: <strong>{v.stripe_account_id ?? 'none'}</strong></p>
              <div className="mt-2">{can('payouts.manage') ? <Button variant="secondary" size="sm" onClick={() => setAcct(v.stripe_account_id ?? '')}>Set payout account</Button> : <p className="text-xs text-gray-500">Finance connects payout accounts. Until then payouts are by manual bank transfer.</p>}</div>
            </Card>
            <Card title="Danger zone">
              <p className="text-xs text-gray-600 mb-3">Remove this {v.kind === 'chef' ? 'cook or restaurant' : 'vendor'} from the marketplace. Their people keep their own accounts; delete those under Settings → Users.</p>
              <DeleteButton what={v.kind === 'chef' ? 'cook or restaurant' : 'vendor'} name={v.name} path={`/admin/vendors/${id}`} onDone={(r) => { toast(r.note); nav('/vendors') }}>Delete this {v.kind === 'chef' ? 'kitchen' : 'vendor'}</DeleteButton>
            </Card>
            {rejecting && (
              <Modal title="Reject document" onClose={() => setRejecting(null)}>
                <div className="space-y-3"><Field label="Reason (the vendor will see this)" htmlFor="dr"><Textarea id="dr" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                  <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" disabled={note.length < 3} onClick={async () => { await act.run(() => patch(`/admin/vendor-documents/${rejecting}`, { status: 'rejected', note }), 'Document rejected', reload); setRejecting(null) }}>Reject</Button></div></div>
              </Modal>
            )}
            {comm !== null && (
              <Modal title="Commission override" onClose={() => setComm(null)}>
                <div className="space-y-3"><p className="text-xs text-gray-600">Percent of merchandise value. Leave empty to use the marketplace default. Applies to new orders only. This change is recorded in the audit log.</p>
                  <Field label="Commission %" htmlFor="cm"><Input id="cm" inputMode="decimal" value={comm} onChange={(e) => setComm(e.target.value)} /></Field>
                  <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setComm(null)}>Cancel</Button><Button onClick={async () => { await act.run(() => patch(`/admin/vendors/${id}/commission`, { commission_bps: comm === '' ? null : Math.round(Number(comm) * 100) }), 'Commission updated', reload); setComm(null) }}>Save</Button></div></div>
              </Modal>
            )}
            {acct !== null && (
              <Modal title="Payout account" onClose={() => setAcct(null)}>
                <div className="space-y-3"><Field label="Stripe Connect account id" htmlFor="ac" hint="Starts with acct_. Leave empty to disconnect."><Input id="ac" value={acct} onChange={(e) => setAcct(e.target.value)} placeholder="acct_…" /></Field>
                  <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAcct(null)}>Cancel</Button><Button onClick={async () => { await act.run(() => patch(`/admin/vendors/${id}/payout-account`, { stripe_account_id: acct === '' ? null : acct }), 'Payout account saved', reload); setAcct(null) }}>Save</Button></div></div>
              </Modal>
            )}
          </>
        )
      }}</Fetch>
    </Need>
  )
}

export function StoresAdmin() {
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Need perm={['stores.manage']} what="managing stores">
      <PageHeader title="Stores" sub="A store is public only when it is published and its vendor is approved." />
      <Alert>{act.error}</Alert>
      <Fetch path="/admin/stores">{(rows, reload) => (
        <DataTable rows={rows} empty="No stores yet." columns={[
          { key: 'name', header: 'Store', nowrap: false, render: (r) => <><strong>{r.name}</strong> {r.is_test_data && <Badge tone="purple">Demo</Badge>}<div className="text-xs text-gray-500">{r.vendor_name}</div></> },
          { key: 'status', header: 'Store', render: (r) => <StatusBadge status={r.status} /> }, { key: 'vs', header: 'Vendor', render: (r) => <StatusBadge status={r.vendor_status} /> },
          { key: 'paused', header: 'Ordering', render: (r) => (r.ordering_paused ? <Badge tone="yellow">Paused by store</Badge> : 'On') },
          { key: 'a', header: '', nowrap: false, render: (r) => (
            <div className="flex flex-wrap items-center gap-2">
              {r.status !== 'published' && <Button size="sm" disabled={r.vendor_status !== 'approved'} title={r.vendor_status !== 'approved' ? 'Approve the vendor first' : ''} onClick={() => act.run(() => patch(`/admin/stores/${r.id}/status`, { status: 'published' }), 'Store published', reload)}>Publish</Button>}
              {r.status !== 'suspended' && <Button size="sm" variant="secondary" onClick={confirmThen(`Suspend ${r.name}? It disappears from the shop immediately.`, () => act.run(() => patch(`/admin/stores/${r.id}/status`, { status: 'suspended' }), 'Store suspended', reload))}>Suspend</Button>}
              {r.vendor_status !== 'approved' && <span className="text-xs text-gray-500">Vendor must be approved first</span>}
            </div>) }]} />
      )}</Fetch>
    </Need>
  )
}

export function Dishes() {
  const [hide, setHide] = useState(null); const [reason, setReason] = useState('')
  const act = useAction(async (reload) => { await post(`/admin/dishes/${hide.id}/hide`, { reason }); toast('Dish hidden. The cook can see it is hidden.'); setHide(null); setReason(''); reload() })
  const restore = useAction(async (r, reload) => { await post(`/admin/dishes/${r.id}/restore`); toast(`${r.name} is back on the menu.`); reload() })
  return (
    <Need perm={['catalog.manage', 'vendors.manage']} what="home-chef dishes">
      <PageHeader title="Home-chef dishes" sub="Every dish sold by a home kitchen. Hide any dish with a missing or doubtful allergen list." />
      <Fetch path="/admin/dishes">{(rows, reload) => (
        <>
          <Alert tone="warn">Allergen and dietary labels are declared by the cooks and are not verified by EAZyfoods. Hide a dish if its allergens look wrong; the cook must fix and re-submit it.</Alert>
          <DataTable rows={rows} empty="No dishes yet." columns={[
            { key: 'n', header: 'Dish', nowrap: false, render: (r) => <><strong>{r.name}</strong><div className="text-xs text-gray-500">{r.kitchen}{r.cuisine ? ` · ${r.cuisine}` : ''}</div></> },
            { key: 'a', header: 'Allergens', nowrap: false, render: (r) => (r.allergens == null ? <Badge tone="red">Not supplied</Badge> : r.allergens.length ? r.allergens.join(', ').replace(/_/g, ' ') : <span className="text-gray-500">None declared</span>) },
            { key: 't', header: 'Labels', nowrap: false, render: (r) => r.dish_tags.join(', ').replace(/_/g, ' ') || '—' }, { key: 'p', header: 'Price', render: (r) => cents(r.price_cents) },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status === 'dish_live' ? 'active' : 'hidden'} /> },
            { key: 'x', header: '', right: true, render: (r) => (r.status === 'dish_live' ? <Button size="sm" variant="danger" onClick={() => setHide(r)}>Hide</Button> : <Button size="sm" variant="secondary" onClick={() => restore.run(r, reload)}>Restore</Button>) }]} />
          {hide && (
            <Modal title={`Hide ${hide.name}`} onClose={() => setHide(null)}>
              <div className="space-y-3"><Alert>{act.error}</Alert><Field label="Reason (the cook is told in Messages)" htmlFor="hr"><Input id="hr" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setHide(null)}>Cancel</Button><Button variant="danger" busy={act.busy} disabled={reason.trim().length < 3} onClick={() => act.run(reload)}>Hide dish</Button></div></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}

export function Zones() {
  const stores = useApi('/admin/stores')
  const [edit, setEdit] = useState(null)
  const [v, setV] = useState({ name: '', fee: '5.99', free_over: '', eta: '90', is_active: true, fsas: '' })
  const [storeIds, setStoreIds] = useState([])
  const open = (z) => { setEdit(z ?? {}); setV({ name: z?.name ?? '', fee: z ? (z.fee_cents / 100).toFixed(2) : '5.99', free_over: z?.free_over_cents ? (z.free_over_cents / 100).toFixed(2) : '', eta: String(z?.eta_minutes ?? 90), is_active: z?.is_active ?? true, fsas: (z?.fsas ?? []).join(' ') }); setStoreIds(z?.store_ids ?? []) }
  const save = useAction(async (reload) => {
    const body = { name: v.name, fee_cents: Math.round(Number(v.fee) * 100), free_over_cents: v.free_over ? Math.round(Number(v.free_over) * 100) : null, eta_minutes: Number(v.eta), is_active: v.is_active, fsas: v.fsas.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean), store_ids: storeIds }
    if (edit?.id) await put(`/admin/zones/${edit.id}`, body); else await post('/admin/zones', body)
    toast('Zone saved'); setEdit(null); reload()
  })
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <Need perm={['stores.manage']} what="managing delivery zones">
      <PageHeader title="Delivery zones" sub="A postal code’s first three characters (FSA) decide which zone, fee and arrival estimate applies. Fee is charged per store." actions={<Button onClick={() => open(null)}><Plus className="h-4 w-4" /> New zone</Button>} />
      <Fetch path="/admin/zones">{(rows, reload) => (
        <>
          <DataTable rows={rows} onRow={open} empty="No delivery zones. Without a zone nobody can choose delivery." columns={[
            { key: 'name', header: 'Zone', render: (z) => <strong>{z.name}</strong> }, { key: 'active', header: 'State', render: (z) => (z.is_active ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>) },
            { key: 'fee', header: 'Fee per store', render: (z) => <>{cents(z.fee_cents)}{z.free_over_cents ? <span className="text-xs text-gray-500"> · free over {cents(z.free_over_cents)}</span> : null}</> },
            { key: 'eta', header: 'Estimate', render: (z) => `${z.eta_minutes} min` }, { key: 'fsas', header: 'Postal areas', render: (z) => `${z.fsas.length}` }, { key: 'st', header: 'Stores', render: (z) => `${z.store_ids.length}` }]} />
          {edit && (
            <Modal wide title={edit.id ? `Edit ${edit.name}` : 'New zone'} onClose={() => setEdit(null)}>
              <div className="space-y-3"><Alert>{save.error}</Alert>
                <Field label="Name" htmlFor="zn"><Input id="zn" value={v.name} onChange={s('name')} /></Field>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Delivery fee ($ per store)" htmlFor="zf"><Input id="zf" inputMode="decimal" value={v.fee} onChange={s('fee')} /></Field>
                  <Field label="Free over ($, optional)" htmlFor="zo" hint="Per store subtotal"><Input id="zo" inputMode="decimal" value={v.free_over} onChange={s('free_over')} /></Field>
                  <Field label="Arrival estimate (minutes)" htmlFor="ze"><Input id="ze" inputMode="numeric" value={v.eta} onChange={s('eta')} /></Field>
                </div>
                <Field label="Postal areas (FSA)" htmlFor="za" hint="3 characters each, e.g. T2A T2B. An area can only be in one zone."><Input id="za" value={v.fsas} onChange={s('fsas')} /></Field>
                <p className="text-xs text-gray-500">{lines(v.fsas.replace(/\s+/g, ',')).length} areas</p>
                <div><p className="text-sm font-medium text-gray-700 mb-1">Stores that deliver here</p><CheckList options={(stores.data ?? []).map((x) => ({ value: x.id, label: x.name }))} value={storeIds} onChange={setStoreIds} /></div>
                <Switch checked={v.is_active} label="Zone is active" onChange={(x) => setV({ ...v, is_active: x })} />
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={v.name.length < 2} onClick={() => save.run(reload)}>Save</Button></div></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}
