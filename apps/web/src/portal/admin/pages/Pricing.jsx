import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast, useAction, useApi } from '../../shared/hooks'
import { get, post, put, fmtDateTime, errText } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Switch, Tabs, Textarea } from '../../shared/ui'
import { Need, cents, useCan } from '../common'

/**
 * Financial rules: one screen for delivery fees, driver pay, commission and service fees, plus the simulator.
 * All maths happens on the server (the same code checkout uses). This screen only edits rules, shows previews and asks the server to check them.
 */

const KINDS = [
  { id: 'delivery', label: 'Delivery fees', what: 'What the customer pays per store delivery.' },
  { id: 'driver_pay', label: 'Driver pay', what: 'What the driver earns per delivery, before tips (tips always go fully to the driver).' },
  { id: 'commission', label: 'Commission', what: 'What EAZyfoods keeps from a store’s merchandise sales. Tax and delivery are never in the base.' },
  { id: 'service_fee', label: 'Service fee', what: 'An optional fee shown to the customer before they pay. Not yet added to checkout.' },
]
const dollars = (c) => (c == null || c === '' ? '' : (c / 100).toFixed(2))
const toCents = (d) => (d === '' || d == null ? undefined : Math.round(Number(d) * 100))
const STATUS = { draft: 'Draft', pending_approval: 'Waiting for approval', active: 'Live', retired: 'Retired', rejected: 'Rejected' }
const TONE = { draft: 'gray', pending_approval: 'amber', active: 'green', retired: 'gray', rejected: 'red' }
const ScopeLabel = ({ r }) => (r.scope_type === 'global' ? 'Everywhere' : `${r.scope_type[0].toUpperCase()}${r.scope_type.slice(1)}: ${r.scope_name ?? ''}`)

export function Pricing() {
  const [tab, setTab] = useState('delivery')
  return (
    <Need perm={['pricing.view', 'pricing.edit', 'pricing.approve']} what="financial rules">
      <PageHeader title="Pricing & financial rules" sub="Change delivery fees, driver pay and commission here: checkout, driver jobs and statements all follow these rules. Orders already placed keep the rules they were placed under." />
      <Tabs value={tab} onChange={setTab} tabs={[...KINDS.map((k) => ({ id: k.id, label: k.label })), { id: 'simulator', label: 'Simulator' }]} />
      <div className="mt-4 space-y-4">{tab === 'simulator' ? <Simulator /> : <RuleList key={tab} kind={KINDS.find((k) => k.id === tab)} />}</div>
    </Need>
  )
}

/* -------------------------------------------------------------- list */

function RuleList({ kind }) {
  const can = useCan()
  const { data, error, loading, reload } = useApi(`/admin/pricing/rules?kind=${kind.id}`)
  const [open, setOpen] = useState(null)   // rule id, or 'new'
  return (
    <>
      <Alert tone="info">{kind.what} Rules start as drafts; nothing changes for customers until an administrator approves one.</Alert>
      <Alert>{error}</Alert>
      {can('pricing.edit', 'pricing.approve') && <div className="flex justify-end"><Button onClick={() => setOpen('new')}><Plus className="h-4 w-4" /> New {kind.label.toLowerCase()} rule</Button></div>}
      {loading && !data ? <Spinner className="h-32" /> : (
        <DataTable rows={data ?? []} onRow={(r) => setOpen(r.id)} empty="No rules yet." columns={[
          { key: 'n', header: 'Rule', nowrap: false, render: (r) => <div><strong>{r.name}</strong><div className="text-xs text-gray-500">Version {r.version} · {summary(kind.id, r.params)}</div></div> },
          { key: 's', header: 'Applies to', render: (r) => <ScopeLabel r={r} /> },
          { key: 'st', header: 'Status', render: (r) => <Badge tone={TONE[r.status]}>{STATUS[r.status]}</Badge> },
          { key: 'e', header: 'From', render: (r) => (r.effective_from ? fmtDateTime(r.effective_from) : '—') },
        ]} />
      )}
      {open && <RuleEditor kind={kind} id={open === 'new' ? null : open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}

function summary(kind, p) {
  if (kind === 'delivery') return p.model === 'distance_bands' ? `${p.bands?.length ?? 0} distance bands` : p.model === 'flat' ? `flat ${cents(p.flat_cents)}` : p.model === 'base_per_km' ? `${cents(p.base_cents)} + ${cents(p.per_km_cents)}/km` : 'zone fee'
  if (kind === 'driver_pay') return p.bands?.length ? `${p.bands.length} distance bands` : `flat ${cents(p.flat_cents)}`
  if (kind === 'commission') return `${(p.bps / 100).toFixed(2).replace(/\.?0+$/, '')}% of merchandise ${p.base === 'after_discount' ? 'after discounts' : 'before discounts'}`
  return p.mode === 'fixed' ? `fixed ${cents(p.fixed_cents)}` : `${(p.percent_bps / 100).toFixed(2)}%`
}

/* ------------------------------------------------------------- editor */

const BLANK = {
  delivery: { model: 'distance_bands', bands: [{ up_to_km: 3, fee_cents: 499 }, { up_to_km: null, fee_cents: 999 }], max_distance_km: null, over_max: 'block', fallback: 'zone_fee', straight_line_factor: 1.3 },
  driver_pay: { bands: [{ up_to_km: 5, base_cents: 575 }, { up_to_km: null, base_cents: 850 }], unknown_distance_cents: 575, beyond_per_km_cents: 0, waiting: { grace_minutes: 5, per_minute_cents: 0, max_cents: 0 }, additional_pickup_cents: 0, handling_cents: 0 },
  commission: { bps: 1200, base: 'after_discount', min_cents: 0 },
  service_fee: { mode: 'fixed', fixed_cents: 0, percent_bps: 0, min_cents: 0, max_cents: 0 },
}

function RuleEditor({ kind, id, onClose, onChanged }) {
  const can = useCan()
  const [rule, setRule] = useState(null)
  const [name, setName] = useState(''); const [note, setNote] = useState(''); const [from, setFrom] = useState('')
  const [params, setParams] = useState(BLANK[kind.id]); const [scopeType, setScopeType] = useState('global'); const [scopeId, setScopeId] = useState('')
  const [problems, setProblems] = useState([]); const [loadErr, setLoadErr] = useState('')
  const [approving, setApproving] = useState(false); const [rejecting, setRejecting] = useState('')
  const zones = useApi('/admin/zones'); const stores = useApi('/admin/stores'); const vendors = useApi('/admin/vendors')

  const load = async () => {
    if (!id) return
    try { const r = await get(`/admin/pricing/rules/${id}`); setRule(r); setName(r.name); setNote(r.note ?? ''); setParams(r.params); setFrom(r.effective_from ? r.effective_from.slice(0, 16) : ''); setScopeType(r.scope_type); setScopeId(r.scope_id ?? '') }
    catch (e) { setLoadErr(errText(e)) }
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const editable = !id || ['draft', 'rejected'].includes(rule?.status)
  const iso = from ? new Date(from).toISOString() : null
  const done = (msg) => { toast(msg); onChanged(); }

  const check = useAction(async () => { const r = await post('/admin/pricing/validate', { kind: kind.id, params }); setProblems(r.ok ? [] : r.errors); if (r.ok) toast('This rule is valid'); return r.ok })
  const save = useAction(async () => {
    setProblems([])
    try {
      if (id) await put(`/admin/pricing/rules/${id}`, { name, params, effective_from: iso, note: note || null, expected_updated_at: rule.updated_at })
      else { const r = await post('/admin/pricing/rules', { kind: kind.id, name, params, effective_from: iso, note: note || null, scope_type: scopeType, scope_id: scopeType === 'global' ? null : scopeId }); done('Draft saved'); onClose(); return r }
      done('Draft saved'); await load()
    } catch (e) { setProblems([errText(e)]); throw e }
  })
  const act = useAction(async (path, body, msg, close) => { await post(`/admin/pricing/rules/${id}/${path}`, body ?? {}); done(msg); if (close) onClose(); else await load() })

  const scopeOptions = scopeType === 'zone' ? zones.data : scopeType === 'store' ? stores.data : scopeType === 'vendor' ? vendors.data : []
  return (
    <Modal wide title={id ? `${kind.label}: ${rule?.name ?? ''}` : `New ${kind.label.toLowerCase()} rule`} onClose={onClose}>
      <div className="space-y-4">
        <Alert>{loadErr}</Alert>
        {rule && <div className="flex flex-wrap gap-2 items-center"><Badge tone={TONE[rule.status]}>{STATUS[rule.status]}</Badge><span className="text-xs text-gray-500">Version {rule.version}{rule.approved_by_name ? ` · approved by ${rule.approved_by_name}` : ''}</span></div>}
        {rule && !editable && <Alert tone="info">This rule can no longer be edited. To change it, create a new version: the old one keeps applying to orders already placed.</Alert>}
        <Field label="Name" htmlFor="rn"><Input id="rn" value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} /></Field>
        {!id && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Applies to" htmlFor="rs" hint="A store or vendor agreement beats a zone, which beats the global default."><Select id="rs" value={scopeType} onChange={(e) => { setScopeType(e.target.value); setScopeId('') }}><option value="global">Everywhere (global default)</option><option value="zone">One delivery zone</option><option value="store">One store</option><option value="vendor">One vendor (all their stores)</option></Select></Field>
            {scopeType !== 'global' && <Field label="Which one" htmlFor="rsi"><Select id="rsi" value={scopeId} onChange={(e) => setScopeId(e.target.value)}><option value="">Choose…</option>{(scopeOptions ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>}
          </div>
        )}
        {kind.id === 'delivery' && <DeliveryForm p={params} set={setParams} disabled={!editable} />}
        {kind.id === 'driver_pay' && <DriverForm p={params} set={setParams} disabled={!editable} />}
        {kind.id === 'commission' && <CommissionForm p={params} set={setParams} disabled={!editable} />}
        {kind.id === 'service_fee' && <ServiceFeeForm p={params} set={setParams} disabled={!editable} />}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Takes effect from (optional)" htmlFor="rf" hint="Leave empty to start when approved. It can never be set in the past."><Input id="rf" type="datetime-local" value={from} disabled={!editable} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Note for the record" htmlFor="rnote"><Input id="rnote" value={note} disabled={!editable} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        {!!problems.length && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-3 text-sm"><strong>Please fix:</strong><ul className="list-disc ml-5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
        <Alert>{save.error || act.error || check.error}</Alert>
        <div className="flex flex-wrap gap-2 justify-end">
          {editable && can('pricing.edit', 'pricing.approve') && <>
            <Button variant="secondary" busy={check.busy} onClick={() => check.run()}>Check</Button>
            <Button busy={save.busy} disabled={name.length < 2 || (!id && scopeType !== 'global' && !scopeId)} onClick={() => save.run()}>Save draft</Button>
            {id && <Button variant="secondary" busy={act.busy} onClick={() => act.run('submit', {}, 'Submitted for approval')}>Submit for approval</Button>}
          </>}
          {rule?.status === 'pending_approval' && can('pricing.approve') && <><Button variant="danger" onClick={() => setRejecting(' ')}>Reject</Button><Button onClick={() => setApproving(true)}>Review and approve</Button></>}
          {rule && ['active', 'retired'].includes(rule.status) && can('pricing.edit', 'pricing.approve') && <Button variant="secondary" busy={act.busy} onClick={async () => { const r = await post(`/admin/pricing/rules/${id}/new-version`); done('New draft created'); onClose(); void r }}>Create a new version</Button>}
          {rule?.status === 'active' && can('pricing.approve') && <Button variant="danger" onClick={() => { if (window.confirm('Stop this rule applying from now? Orders already placed keep their prices.')) act.run('retire', {}, 'Rule retired', true) }}>Retire</Button>}
        </div>
        {rule && <History events={rule.events} />}
      </div>
      {approving && (
        <Modal title="Approve this rule?" onClose={() => setApproving(false)}>
          <div className="space-y-3 text-sm">
            <p>This changes what real customers, drivers or vendors are charged or paid <strong>for new orders</strong>{iso ? <> from <strong>{fmtDateTime(iso)}</strong></> : <> <strong>starting now</strong></>}. Orders already placed are not changed.</p>
            <p className="text-gray-700">{summary(kind.id, params)}</p>
            <p className="text-xs text-gray-500">Run the simulator first if you have not checked this rule against typical baskets.</p>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setApproving(false)}>Cancel</Button><Button busy={act.busy} onClick={async () => { await act.run('approve', { confirm: true, effective_from: iso }, 'Rule approved and live', true) }}>Yes, make it live</Button></div>
          </div>
        </Modal>
      )}
      {rejecting && (
        <Modal title="Reject this rule" onClose={() => setRejecting('')}>
          <div className="space-y-3"><Field label="Why (recorded)" htmlFor="rrj"><Textarea id="rrj" value={rejecting.trim() ? rejecting : ''} onChange={(e) => setRejecting(e.target.value || ' ')} /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRejecting('')}>Cancel</Button><Button variant="danger" disabled={rejecting.trim().length < 3} onClick={async () => { await act.run('reject', { note: rejecting.trim() }, 'Rule rejected', true) }}>Reject</Button></div></div>
        </Modal>
      )}
    </Modal>
  )
}

function History({ events }) {
  if (!events?.length) return null
  return (
    <details className="text-sm"><summary className="cursor-pointer text-primary-700">History ({events.length})</summary>
      <ul className="mt-2 divide-y divide-gray-100">{events.map((e) => <li key={e.id} className="py-1.5"><strong className="capitalize">{e.action}</strong> <span className="text-gray-500">by {e.actor ?? 'system'} · {fmtDateTime(e.created_at)}</span>{e.detail?.note ? <div className="text-xs text-gray-600">{e.detail.note}</div> : null}</li>)}</ul>
    </details>
  )
}

/* -------------------------------------------------------------- forms */

const Money = ({ label, value, onChange, disabled, hint, id }) => (
  <Field label={label} hint={hint} htmlFor={id}><Input id={id} inputMode="decimal" disabled={disabled} value={dollars(value)} onChange={(e) => onChange(toCents(e.target.value))} placeholder="0.00" /></Field>
)

function Bands({ bands, set, valueKey, valueLabel, disabled, idp }) {
  const upd = (i, k, v) => set(bands.map((b, j) => (j === i ? { ...b, [k]: v } : b)))
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">Each band covers distances up to and including its limit. “And over” (no limit) can only be the last band.</p>
      {bands.map((b, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Field label={i === 0 ? 'Up to (km)' : `Over ${bands[i - 1].up_to_km ?? '…'} km, up to`} htmlFor={`${idp}k${i}`}>
            <Input id={`${idp}k${i}`} inputMode="decimal" disabled={disabled || b.up_to_km === null} value={b.up_to_km ?? ''} placeholder={b.up_to_km === null ? 'and over' : ''} onChange={(e) => upd(i, 'up_to_km', e.target.value === '' ? 0 : Number(e.target.value))} />
          </Field>
          <Money id={`${idp}v${i}`} label={valueLabel} value={b[valueKey]} disabled={disabled} onChange={(v) => upd(i, valueKey, v ?? 0)} />
          <Button variant="ghost" size="sm" disabled={disabled || bands.length < 2} aria-label={`Remove band ${i + 1}`} onClick={() => set(bands.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => { const fin = bands.filter((b) => b.up_to_km !== null); const last = fin[fin.length - 1]; const open = bands.find((b) => b.up_to_km === null); const nb = { up_to_km: (last?.up_to_km ?? 0) + 2, [valueKey]: last?.[valueKey] ?? 0 }; set(open ? [...fin, nb, open] : [...bands, nb]) }}><Plus className="h-4 w-4" /> Add a band</Button>
        {!bands.some((b) => b.up_to_km === null) && <Button variant="ghost" size="sm" disabled={disabled} onClick={() => set([...bands, { up_to_km: null, [valueKey]: bands[bands.length - 1]?.[valueKey] ?? 0 }])}>Add an “and over” band</Button>}
      </div>
    </div>
  )
}

function DeliveryForm({ p, set, disabled }) {
  const u = (k, v) => set({ ...p, [k]: v })
  return (
    <div className="space-y-3">
      <Field label="How the fee is worked out" htmlFor="dm"><Select id="dm" disabled={disabled} value={p.model} onChange={(e) => u('model', e.target.value)}>
        <option value="distance_bands">By distance band</option><option value="base_per_km">Base fee plus per kilometre</option><option value="zone_fee">The delivery zone’s fee</option><option value="flat">One flat fee</option></Select></Field>
      {p.model === 'distance_bands' && <Bands idp="db" bands={p.bands ?? []} set={(b) => u('bands', b)} valueKey="fee_cents" valueLabel="Customer fee ($)" disabled={disabled} />}
      {p.model === 'flat' && <Money id="df" label="Flat fee ($)" value={p.flat_cents} disabled={disabled} onChange={(v) => u('flat_cents', v)} />}
      {p.model === 'base_per_km' && <div className="grid sm:grid-cols-2 gap-3"><Money id="db1" label="Base fee ($)" value={p.base_cents} disabled={disabled} onChange={(v) => u('base_cents', v)} /><Money id="db2" label="Per kilometre ($)" value={p.per_km_cents} disabled={disabled} onChange={(v) => u('per_km_cents', v)} /></div>}
      <div className="grid sm:grid-cols-3 gap-3">
        <Money id="dmin" label="Minimum fee ($)" value={p.min_fee_cents} disabled={disabled} onChange={(v) => u('min_fee_cents', v)} />
        <Money id="dmax" label="Maximum fee ($)" value={p.max_fee_cents} disabled={disabled} onChange={(v) => u('max_fee_cents', v)} />
        <Money id="dfree" label="Free delivery over ($)" hint="Per store subtotal" value={p.free_over_cents ?? undefined} disabled={disabled} onChange={(v) => u('free_over_cents', v ?? null)} />
      </div>
      {(p.model === 'distance_bands' || p.model === 'base_per_km') && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Furthest delivery distance (km)" hint="Empty = no limit" htmlFor="dmd"><Input id="dmd" inputMode="decimal" disabled={disabled} value={p.max_distance_km ?? ''} onChange={(e) => u('max_distance_km', e.target.value === '' ? null : Number(e.target.value))} /></Field>
          <Field label="Beyond that distance" htmlFor="dom"><Select id="dom" disabled={disabled} value={p.over_max} onChange={(e) => u('over_max', e.target.value)}><option value="block">Not available</option><option value="quote">Ask the customer to contact us for a quote</option></Select></Field>
          <Field label="If the driving distance cannot be found" htmlFor="dfb" hint="No routing service is connected yet, so this setting decides every order today."><Select id="dfb" disabled={disabled} value={p.fallback} onChange={(e) => u('fallback', e.target.value)}><option value="zone_fee">Use the delivery zone’s fee</option><option value="straight_line">Estimate from straight-line distance</option><option value="block">Do not allow delivery</option></Select></Field>
          {p.fallback === 'straight_line' && <Field label="Straight-line multiplier" hint="Road distance is usually longer than a straight line" htmlFor="dsl"><Input id="dsl" inputMode="decimal" disabled={disabled} value={p.straight_line_factor} onChange={(e) => u('straight_line_factor', Number(e.target.value) || 1)} /></Field>}
        </div>
      )}
    </div>
  )
}

function DriverForm({ p, set, disabled }) {
  const u = (k, v) => set({ ...p, [k]: v })
  const bandsOn = !!p.bands?.length
  return (
    <div className="space-y-3">
      <Switch checked={bandsOn} disabled={disabled} label="Pay by distance band" hint="Off = one flat amount per delivery" onChange={(on) => set(on ? { ...p, bands: BLANK.driver_pay.bands, flat_cents: undefined } : { ...p, bands: undefined, flat_cents: 700 })} />
      {bandsOn ? <Bands idp="pb" bands={p.bands} set={(b) => u('bands', b)} valueKey="base_cents" valueLabel="Driver pay ($)" disabled={disabled} /> : <Money id="pf" label="Flat pay per delivery ($)" value={p.flat_cents} disabled={disabled} onChange={(v) => u('flat_cents', v)} />}
      <div className="grid sm:grid-cols-3 gap-3">
        <Money id="pu" label="If distance is unknown ($)" value={p.unknown_distance_cents} disabled={disabled} onChange={(v) => u('unknown_distance_cents', v ?? 0)} />
        <Money id="pbk" label="Per km beyond the last band ($)" value={p.beyond_per_km_cents} disabled={disabled} onChange={(v) => u('beyond_per_km_cents', v ?? 0)} />
        <Money id="pap" label="Extra pickup ($)" value={p.additional_pickup_cents} disabled={disabled} onChange={(v) => u('additional_pickup_cents', v ?? 0)} />
        <Money id="ph" label="Heavy or special handling ($)" value={p.handling_cents} disabled={disabled} onChange={(v) => u('handling_cents', v ?? 0)} />
      </div>
      <Alert tone="info">Waiting-time pay is configurable but not applied to real deliveries yet: the app does not record when a driver arrives at the store. Tips are never part of this amount.</Alert>
    </div>
  )
}

function CommissionForm({ p, set, disabled }) {
  const u = (k, v) => set({ ...p, [k]: v })
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Commission (%)" htmlFor="cb"><Input id="cb" inputMode="decimal" disabled={disabled} value={p.bps / 100} onChange={(e) => u('bps', Math.round(Number(e.target.value) * 100) || 0)} /></Field>
        <Field label="Calculated on" htmlFor="cbase"><Select id="cbase" disabled={disabled} value={p.base} onChange={(e) => u('base', e.target.value)}><option value="after_discount">Merchandise after discounts</option><option value="before_discount">Merchandise before discounts</option></Select></Field>
        <Money id="cm" label="Minimum per order ($)" value={p.min_cents} disabled={disabled} onChange={(v) => u('min_cents', v ?? 0)} />
      </div>
      <Alert tone="warn">The commission must match what each store actually agreed to. A rule for one store or vendor overrides the global one. Orders already placed keep their original commission.</Alert>
    </div>
  )
}

function ServiceFeeForm({ p, set, disabled }) {
  const u = (k, v) => set({ ...p, [k]: v })
  return (
    <div className="space-y-3">
      <Field label="Type" htmlFor="sm"><Select id="sm" disabled={disabled} value={p.mode} onChange={(e) => u('mode', e.target.value)}><option value="fixed">Fixed amount</option><option value="percent">Percentage of merchandise</option></Select></Field>
      <div className="grid sm:grid-cols-3 gap-3">
        {p.mode === 'fixed' ? <Money id="sf" label="Amount ($)" value={p.fixed_cents} disabled={disabled} onChange={(v) => u('fixed_cents', v ?? 0)} /> : <Field label="Percentage" htmlFor="sp"><Input id="sp" inputMode="decimal" disabled={disabled} value={p.percent_bps / 100} onChange={(e) => u('percent_bps', Math.round(Number(e.target.value) * 100) || 0)} /></Field>}
        <Money id="smin" label="Minimum ($)" value={p.min_cents} disabled={disabled} onChange={(v) => u('min_cents', v ?? 0)} />
        <Money id="smax" label="Maximum ($)" value={p.max_cents} disabled={disabled} onChange={(v) => u('max_cents', v ?? 0)} />
      </div>
      <Alert tone="warn">Service fees are not added to checkout yet. A fee will only be introduced together with clear wording shown to the customer before they pay.</Alert>
    </div>
  )
}

/* ---------------------------------------------------------- simulator */

const D = (c) => `$${((c ?? 0) / 100).toFixed(2)}`
function Simulator() {
  const [v, setV] = useState({ merchandise: '70.00', discount: '0', distance: '6', tip: '0', taxM: '0', taxD: '5', procBps: '0', procFixed: '2.65', vendorFunded: false, proposed: false })
  const [res, setRes] = useState(null)
  const live = useApi('/admin/pricing/effective')
  const run = useAction(async () => {
    const body = {
      merchandise_cents: toCents(v.merchandise) ?? 0, discount_cents: toCents(v.discount) ?? 0, distance_km: v.distance === '' ? null : Number(v.distance), tip_cents: toCents(v.tip) ?? 0,
      tax_bps_merchandise: Math.round(Number(v.taxM) * 100), tax_bps_delivery: Math.round(Number(v.taxD) * 100),
      processing_bps: Math.round(Number(v.procBps) * 100), processing_fixed_cents: toCents(v.procFixed) ?? 0, vendor_funded_discount: v.vendorFunded,
    }
    setRes(await post('/admin/pricing/simulate', body))
  })
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const missing = live.data && (!live.data.delivery || !live.data.driver_pay)
  return (
    <>
      <Alert tone="info">The simulator uses the same calculation as checkout, on made-up numbers. It creates no order, charges nobody and changes no rule. It uses the rules that are <strong>live now</strong>; to test a proposal, approve it for a quiet store first, or check the numbers by hand against a draft.</Alert>
      {missing && <Alert tone="warn">No {!live.data.delivery ? 'delivery' : 'driver pay'} rule is live yet, so there is nothing to simulate. Approve a rule first (the proposed profile is waiting as drafts).</Alert>}
      <Card title="A sample order">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Merchandise ($)" htmlFor="sm1"><Input id="sm1" inputMode="decimal" value={v.merchandise} onChange={set('merchandise')} /></Field>
          <Field label="Discount ($)" htmlFor="sm2"><Input id="sm2" inputMode="decimal" value={v.discount} onChange={set('discount')} /></Field>
          <Field label="Delivery distance (km)" htmlFor="sm3" hint="Empty = unknown"><Input id="sm3" inputMode="decimal" value={v.distance} onChange={set('distance')} /></Field>
          <Field label="Tip ($)" htmlFor="sm4"><Input id="sm4" inputMode="decimal" value={v.tip} onChange={set('tip')} /></Field>
          <Field label="Tax on merchandise (%)" htmlFor="sm5"><Input id="sm5" inputMode="decimal" value={v.taxM} onChange={set('taxM')} /></Field>
          <Field label="Tax on delivery (%)" htmlFor="sm6"><Input id="sm6" inputMode="decimal" value={v.taxD} onChange={set('taxD')} /></Field>
          <Field label="Assumed processing: % of total" hint="An assumption, not an actual charge" htmlFor="sm7"><Input id="sm7" inputMode="decimal" value={v.procBps} onChange={set('procBps')} /></Field>
          <Field label="Assumed processing: fixed ($)" htmlFor="sm8"><Input id="sm8" inputMode="decimal" value={v.procFixed} onChange={set('procFixed')} /></Field>
          <div className="flex items-end"><Switch checked={v.vendorFunded} label="Vendor funds the discount" onChange={(x) => setV({ ...v, vendorFunded: x })} /></div>
        </div>
        <Alert>{run.error}</Alert>
        <div className="mt-3"><Button busy={run.busy} disabled={missing} onClick={() => run.run()}>Calculate</Button></div>
      </Card>
      {res && <SimResult r={res} />}
    </>
  )
}

function SimResult({ r }) {
  const rows = (items) => <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">{items.map(([k, val, strong]) => <div key={k} className="contents"><dt className="text-gray-600">{k}</dt><dd className={`text-right ${strong ? 'font-bold' : ''}`}>{val}</dd></div>)}</dl>
  const c = r.customer, p = r.platform
  return (
    <div className="space-y-3" aria-live="polite">
      {r.warnings.map((w) => <Alert key={w} tone="warn">{w}</Alert>)}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Customer pays">{rows([['Merchandise', D(c.merchandise_cents)], ['Discount', `− ${D(c.discount_cents)}`], ['Delivery', D(c.delivery_cents)], ['Service fee', D(c.service_fee_cents)], ['Tax', D(c.tax_cents)], ['Tip (all to the driver)', D(c.tip_cents)], ['Total', D(c.total_cents), true]])}
          {r.delivery.ok && r.delivery.notes.length > 0 && <p className="text-xs text-gray-500 mt-2">{r.delivery.notes.join(' ')}</p>}</Card>
        <Card title="Vendor and driver">{rows([['Vendor commission', D(r.vendor.commission_cents)], ['Vendor net proceeds', D(r.vendor.net_cents), true], ['Driver pay (without tip)', D(r.driver.total_cents), true], ['Driver tip', D(c.tip_cents)]])}</Card>
      </div>
      <Card title="EAZyfoods">{rows([['Commission', D(p.commission_cents)], ['Delivery revenue', D(p.delivery_revenue_cents)], ['Service fee', D(p.service_fee_cents)], ['Revenue', D(p.revenue_cents), true], ['Driver pay', `− ${D(p.driver_pay_cents)}`], ['Processing (assumed)', `− ${D(p.processing_cents_assumed)}`], ['Discount funded by EAZyfoods', `− ${D(p.discount_funded_cents)}`], ['Contribution margin (estimate)', `${D(p.margin_cents)}${p.margin_pct != null ? ` (${p.margin_pct}% of revenue)` : ''}`, true]])}
        <p className="text-xs text-gray-500 mt-2">{r.assumptions.join(' ')} Delivery fee covers {r.delivery_recovery_pct ?? '—'}% of driver pay.</p></Card>
    </div>
  )
}
