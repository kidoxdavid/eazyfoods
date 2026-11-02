import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast, useAction, useApi } from '../../shared/hooks'
import { del, patch, post, put, errText, fmtDateTime } from '../../shared/client'
import { useUser } from '../../shared/StaffShell'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, Switch, Tabs, Textarea } from '../../shared/ui'
import { DeleteButton, Fetch, Need, useCan } from '../common'
import { STAFF_ROLES } from '../perms'

/* ------------------------------------------------------------- Settings */

const META = {
  'kitchens.enabled': { label: 'Home chefs and restaurants', kind: 'bool', help: 'Show home kitchens and restaurants and let them sell meals.' },
  'payout.auto_enabled': { label: 'Automatic payouts', kind: 'bool', help: 'Pay connected vendors automatically once the hold period is over.' },
  'payout.auto_min_cents': { label: 'Smallest automatic payout', kind: 'dollars', help: 'Balances below this wait until they reach it.', range: [1, 10000] },
  currency: { label: 'Currency', kind: 'fixed', help: 'All prices are in Canadian dollars.' },
  'tax.rates_bps': { label: 'Tax rates', kind: 'tax', help: 'GST rate for zero-rated and standard-rated products. Delivery fees use the standard rate. Confirm treatment with an accountant.', range: [0, 30] },
  'commission.default_bps': { label: 'Default commission', kind: 'percent_bps', help: 'Marketplace commission on merchandise value. A vendor can have its own override. Applies to new orders only.', range: [0, 50] },
  'checkout.reservation_minutes': { label: 'Stock hold at checkout', kind: 'int', unit: 'minutes', help: 'How long items are held while the customer pays.', range: [5, 60] },
  'vendor.accept_timeout_minutes': { label: 'Store accept warning', kind: 'int', unit: 'minutes', help: 'Orders not accepted by this time show as needing attention.', range: [1, 240] },
  'vendor.auto_reject_minutes': { label: 'Auto-reject unanswered orders', kind: 'int', unit: 'minutes', help: 'After this the order is rejected and the customer fully refunded.', range: [5, 720] },
  'vendor.require_verified_docs': { label: 'Require verified documents to approve a vendor', kind: 'bool', help: 'Turn off only for controlled pilots.' },
  'ordering.require_open': { label: 'Only allow orders while the store is open', kind: 'bool', help: 'Scheduled orders are not supported, so keep this on.' },
  'driver.pay_per_delivery_cents': { label: 'Driver pay per delivery', kind: 'dollars', help: 'Recorded as a cost when a delivery completes.', range: [0, 100] },
  'payout.approval_threshold_cents': { label: 'Second approval for payouts above', kind: 'dollars', help: 'A payout above this amount waits for a different person with approval rights. 0 turns it off.', range: [0, 1000000] },
  'finance.processing_assumption_bps': { label: 'Assumed processing fee (%)', kind: 'percent_bps', help: 'Used only for the ESTIMATED margin in the Financial overview, because real processing fees are not imported yet. Not an actual charge.', range: [0, 10] },
  'finance.processing_assumption_fixed_cents': { label: 'Assumed processing fee per order', kind: 'dollars', help: 'Fixed part of the processing assumption, per order. Estimate only.', range: [0, 2] },
  'finance.notifications': { label: 'Email alerts to staff about money events', kind: 'toggles', help: 'Who is emailed: approvers when a payout or pricing rule waits for approval, finance when a payout fails or the books do not match. Each alert is sent once per event.' },
  'payout.hold_days': { label: 'Payout hold after delivery', kind: 'int', unit: 'days', help: 'Vendor earnings become payable this long after delivery.', range: [0, 30] },
  'ads.min_cpc_cents': { label: 'Minimum cost per click (ads)', kind: 'dollars', help: 'Advertisers cannot bid below this.', range: [0.01, 50] },
  'ads.min_budget_cents': { label: 'Minimum campaign budget (ads)', kind: 'dollars', help: 'Smallest budget a vendor can set.', range: [1, 10000] },
  'vendor.agreement_version': { label: 'Vendor agreement version', kind: 'text', help: 'Changing this does not re-ask existing vendors automatically.' },
}

const ALERT_LABEL = { payout_needs_approval: 'A payout is waiting for approval', payout_failed: 'A payout failed', pricing_rule_pending: 'A pricing rule is waiting for approval', reconciliation_difference: 'The books do not match', payout_hold_placed: 'A payout hold was placed' }

function show(key, v) {
  const m = META[key]; if (!m) return JSON.stringify(v)
  switch (m.kind) {
    case 'percent_bps': return `${v / 100}%`
    case 'dollars': return `$${(v / 100).toFixed(2)}`
    case 'int': return `${v} ${m.unit}`
    case 'bool': return v ? 'On' : 'Off'
    case 'tax': return `Zero-rated ${v.zero_rated / 100}% · Standard ${v.standard / 100}%`
    default: return String(v)
  }
}

function Commercial() {
  const can = useCan()
  const [edit, setEdit] = useState(null)
  const [text, setText] = useState('')
  const [text2, setText2] = useState('')
  const open = (r) => {
    const m = META[r.key]; setEdit(r)
    if (m.kind === 'percent_bps') setText(String(r.value / 100)); else if (m.kind === 'dollars') setText((r.value / 100).toFixed(2)); else if (m.kind === 'tax') { setText(String(r.value.zero_rated / 100)); setText2(String(r.value.standard / 100)) } else setText(String(r.value))
  }
  const flip = async (key, value, reload) => { try { await put(`/admin/settings/${key}`, { value }); toast('Saved and recorded in the audit log'); reload() } catch (e) { toast(errText(e), 'error') } }
  const save = useAction(async (reload) => {
    const m = META[edit.key]; let value
    const nums = m.kind === 'tax' ? [Number(text), Number(text2)] : [Number(text)]
    if (m.range && (nums.some((n) => Number.isNaN(n)) || nums.some((n) => n < m.range[0] || n > m.range[1]))) throw new Error(`Enter a number between ${m.range[0]} and ${m.range[1]}${m.kind === 'percent_bps' || m.kind === 'tax' ? ' (%)' : m.kind === 'dollars' ? ' ($)' : m.unit ? ` ${m.unit}` : ''}.`)
    if (m.kind === 'percent_bps' || m.kind === 'dollars') value = Math.round(Number(text) * 100); else if (m.kind === 'int') value = Number(text)
    else if (m.kind === 'bool') value = text === 'true'; else if (m.kind === 'tax') value = { zero_rated: Math.round(Number(text) * 100), standard: Math.round(Number(text2) * 100) }; else value = text
    await put(`/admin/settings/${edit.key}`, { value })
    toast('Setting saved and recorded in the audit log'); setEdit(null); reload()
  })
  const m = edit ? META[edit.key] : null
  return (
    <Fetch path="/admin/settings">{(rows, reload) => (
      <>
        {!can('settings.manage') && <Alert tone="info">You can view these settings. Only an admin can change them.</Alert>}
        <DataTable rows={rows.filter((r) => !RW_KEYS.includes(r.key))} rowKey={(r) => r.key} empty="No settings." columns={[
          { key: 'l', header: 'Setting', nowrap: false, render: (r) => <div><strong>{META[r.key]?.label ?? r.key}</strong><div className="text-xs text-gray-500">{META[r.key]?.help}</div></div> },
          { key: 'v', header: 'Value', nowrap: false, render: (r) => (META[r.key]?.kind === 'toggles' ? <div className="space-y-1.5">{Object.entries(r.value).map(([k, on]) => <Switch key={k} checked={!!on} disabled={!can('settings.manage')} label={ALERT_LABEL[k] ?? k} onChange={(v) => flip(r.key, { ...r.value, [k]: v }, reload)} />)}</div> : META[r.key]?.kind === 'bool' && can('settings.manage') ? <Switch checked={!!r.value} label={META[r.key].label} onChange={(v) => flip(r.key, v, reload)} /> : <strong>{show(r.key, r.value)}</strong>) },
          { key: 'u', header: 'Changed', render: (r) => fmtDateTime(r.updated_at) },
          { key: 'a', header: '', render: (r) => (can('settings.manage') && META[r.key] && META[r.key].kind !== 'fixed' && META[r.key].kind !== 'bool' && META[r.key].kind !== 'toggles' ? <Button size="sm" variant="secondary" onClick={() => open(r)}>Change</Button> : null) },
        ]} />
        {edit && (
          <Modal title={m?.label ?? edit.key} onClose={() => setEdit(null)}>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">{m?.help}</p>
              <Alert>{save.error}</Alert>
              {m?.kind === 'tax'
                ? <div className="grid grid-cols-2 gap-3"><Field label="Zero-rated (%)" htmlFor="tz"><Input id="tz" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} /></Field><Field label="Standard (%)" htmlFor="ts"><Input id="ts" inputMode="decimal" value={text2} onChange={(e) => setText2(e.target.value)} /></Field></div>
                : <Field label={`Value${m?.kind === 'percent_bps' ? ' (%)' : m?.kind === 'dollars' ? ' ($)' : m?.unit ? ` (${m.unit})` : ''}`} htmlFor="sv"><Input id="sv" inputMode={m?.kind === 'text' ? 'text' : 'decimal'} value={text} onChange={(e) => setText(e.target.value)} /></Field>}
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run(reload)}>Save</Button></div>
            </div>
          </Modal>
        )}
      </>
    )}</Fetch>
  )
}

function Users() {
  const me = useUser()
  const can = useCan()
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [grant, setGrant] = useState({})
  const [bump, setBump] = useState(0)
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Need perm={['users.view']} what="viewing users">
      {can('settings.manage') && <NewStaff onDone={() => setBump((b) => b + 1)} />}
      <form className="flex items-end gap-2 max-w-xl" onSubmit={(e) => { e.preventDefault(); setApplied(q.trim()) }}>
        <Field label="Name or email" htmlFor="uq" className="flex-1"><Input id="uq" value={q} onChange={(e) => setQ(e.target.value)} /></Field><Button type="submit">Search</Button>
      </form>
      <Alert>{act.error}</Alert>
      <Fetch path={`/admin/users?_=${bump}${applied ? `&q=${encodeURIComponent(applied)}` : ''}`}>{(rows, reload) => (
        rows.length === 0 ? <p className="text-sm text-gray-500">No users match.</p> : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{rows.map((u) => (
          <li key={u.id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span aria-hidden className="h-10 w-10 flex-none rounded-full bg-primary-50 text-primary-700 font-semibold grid place-items-center">{(u.full_name || u.email || '?').trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-sm sm:text-base text-gray-900 break-words">{u.full_name}</strong>{u.disabled && <Badge tone="red">Disabled</Badge>}</div>
                <div className="text-xs sm:text-sm text-gray-500 break-all">{u.email}</div>
              </div>
              {can('settings.manage') && u.id !== me?.id && <DeleteButton what="account" name={u.email} path={`/admin/users/${u.id}`} onDone={(x) => { toast(x.note); reload() }} />}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Roles</div>
              <div className="flex flex-wrap gap-1">{u.roles.length ? u.roles.map((r) => (
                <Badge key={r} tone={STAFF_ROLES.includes(r) ? 'blue' : 'gray'}>{r.replace('_', ' ')}{can('settings.manage') && STAFF_ROLES.includes(r) && <button type="button" className="ml-1" aria-label={`Remove ${r} role`} onClick={() => act.run(() => del(`/admin/users/${u.id}/roles/${r}`), 'Role removed', reload)}>×</button>}</Badge>)) : <span className="text-xs text-gray-400">None</span>}</div>
            </div>
            {can('settings.manage') && (
              <div className="mt-auto pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Select aria-label={`Role to grant to ${u.full_name}`} value={grant[u.id] ?? ''} onChange={(e) => setGrant((s) => ({ ...s, [u.id]: e.target.value }))}><option value="">Add role…</option>{STAFF_ROLES.filter((r) => !u.roles.includes(r)).map((r) => <option key={r} value={r}>{r}</option>)}</Select>
                  <Button size="sm" disabled={!grant[u.id]} onClick={() => act.run(() => post(`/admin/users/${u.id}/roles`, { role: grant[u.id] }), 'Role granted', reload)}>Grant</Button>
                </div>
                {u.id !== me?.id && <Switch checked={!u.disabled} label="Can sign in" onChange={(v) => act.run(() => patch(`/admin/users/${u.id}/disabled`, { disabled: !v }), v ? 'Account enabled' : 'Account disabled', reload)} />}
              </div>)}
          </li>))}</ul>)
      )}</Fetch>
    </Need>
  )
}

function NewStaff({ onDone }) {
  const [open, setOpen] = useState(false)
  const create = useAction(async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    await post('/admin/users', { email: f.email, full_name: f.full_name, password: f.password, role: f.role })
    toast('Login created. Share the email and password with them privately; they can change it after signing in.'); setOpen(false); onDone()
  })
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create a staff login</Button></div>
      {open && (
        <Modal title="Create a staff login" onClose={() => setOpen(false)}>
          <form onSubmit={create.run} className="space-y-3">
            <p className="text-xs text-gray-500">For admin, marketing, support, finance, dispatch or catalogue staff. Vendors and drivers sign themselves up in their own windows.</p>
            <Alert>{create.error}</Alert>
            <Field label="Full name" htmlFor="nsn"><Input id="nsn" name="full_name" required /></Field>
            <Field label="Email" htmlFor="nse"><Input id="nse" name="email" type="email" required autoComplete="off" /></Field>
            <Field label="Temporary password" hint="At least 10 characters." htmlFor="nsp"><Input id="nsp" name="password" type="text" required minLength={10} autoComplete="off" /></Field>
            <Field label="Role" htmlFor="nsr"><Select id="nsr" name="role" defaultValue="marketing">{STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
            <div className="flex justify-end"><Button type="submit" busy={create.busy}>Create login</Button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

function RolesRef() {
  return (
    <Need perm={['users.view']} what="viewing roles">
      <Fetch path="/admin/roles">{(r) => (
        <div className="grid sm:grid-cols-2 gap-4">{Object.entries(r).map(([role, perms]) => (
          <Card key={role} title={role}>{perms.includes('*')
            ? <p className="text-sm"><Badge tone="amber">Everything</Badge> The top role: it can do everything and control every other area. Keep admins few.</p>
            : <div className="flex flex-wrap gap-1.5">{perms.map((p) => <Badge key={p}>{p}</Badge>)}</div>}</Card>))}</div>
      )}</Fetch>
    </Need>
  )
}

const RW_KEYS = ['rewards.points_per_dollar', 'rewards.points_per_credit_dollar', 'rewards.redeem_step_points', 'membership.trial_days', 'membership.free_delivery_min_cents', 'membership.points_multiplier', 'membership.price_cents']

/** One place for the EAZY Rewards points and EAZY+ membership numbers, with a plain-words preview of what they mean. */
function RewardsSettings() {
  const can = useCan()
  const flags = useApi('/admin/control/features')
  const [busy, setBusy] = useState(null)
  const flip = async (k, enabled) => { setBusy(k); try { await put(`/admin/control/features/${k}`, { enabled }); await flags.reload(); toast(enabled ? 'Switched on.' : 'Switched off.') } catch (e) { toast(errText(e), 'error') } finally { setBusy(null) } }
  return (
    <Fetch path="/admin/settings">{(rows, reload) => <RewardsForm rows={rows} reload={reload} can={can('settings.manage')} flags={flags.data} busy={busy} flip={flip} />}</Fetch>
  )
}

function RewardsForm({ rows, reload, can, flags, busy, flip }) {
  const val = (k) => rows.find((r) => r.key === k)?.value
  const init = () => ({
    ppd: String(val('rewards.points_per_dollar') ?? 1), pcd: String(val('rewards.points_per_credit_dollar') ?? 100), step: String(val('rewards.redeem_step_points') ?? 500),
    trial: String(val('membership.trial_days') ?? 30), minFree: ((val('membership.free_delivery_min_cents') ?? 3000) / 100).toFixed(2), mult: String(val('membership.points_multiplier') ?? 2), price: ((val('membership.price_cents') ?? 799) / 100).toFixed(2),
  })
  const [f, setF] = useState(init)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const n = (x) => Number(x)
  const stepValue = n(f.pcd) > 0 ? n(f.step) / n(f.pcd) : 0
  const orderPts = Math.floor(50 * n(f.ppd)), backPct = n(f.pcd) > 0 ? (n(f.ppd) / n(f.pcd)) * 100 : 0
  const save = useAction(async () => {
    const check = (label, x, lo, hi) => { if (Number.isNaN(x) || x < lo || x > hi) throw new Error(`${label}: enter a number between ${lo} and ${hi}.`) }
    check('Points per dollar', n(f.ppd), 0, 100); check('Points worth $1', n(f.pcd), 10, 10000); check('Redeem step', n(f.step), 10, 100000)
    check('Trial days', n(f.trial), 1, 365); check('Free delivery minimum', n(f.minFree), 0, 1000); check('Points multiplier', n(f.mult), 1, 10); check('Price', n(f.price), 0, 1000)
    const body = {
      'rewards.points_per_dollar': Math.round(n(f.ppd)), 'rewards.points_per_credit_dollar': Math.round(n(f.pcd)), 'rewards.redeem_step_points': Math.round(n(f.step)),
      'membership.trial_days': Math.round(n(f.trial)), 'membership.free_delivery_min_cents': Math.round(n(f.minFree) * 100), 'membership.points_multiplier': Math.round(n(f.mult)), 'membership.price_cents': Math.round(n(f.price) * 100),
    }
    for (const [k, v] of Object.entries(body)) if (JSON.stringify(val(k)) !== JSON.stringify(v)) await put(`/admin/settings/${k}`, { value: v })
    toast('Saved and recorded in the audit log'); reload()
  })
  const flag = (k) => flags?.find((x) => x.key === k)
  return (
    <div className="space-y-4">
      {!can && <Alert tone="info">You can view these numbers. Only an admin can change them.</Alert>}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="EAZY Rewards points" sub="Customers earn points on delivered orders and redeem them for store credit.">
          <div className="space-y-3">
            {flag('shop.points') && <Switch label="Points are on" hint="Turn off to stop earning and redeeming." checked={flag('shop.points').enabled} disabled={!can || busy === 'shop.points'} onChange={(v) => flip('shop.points', v)} />}
            <Field label="Points earned per $1 spent" hint="Counted on what was delivered, after refunds. 0 stops new points." htmlFor="rw1"><Input id="rw1" inputMode="numeric" value={f.ppd} disabled={!can} onChange={set('ppd')} /></Field>
            <Field label="Points that are worth $1 of credit" hint="Higher means points are worth less." htmlFor="rw2"><Input id="rw2" inputMode="numeric" value={f.pcd} disabled={!can} onChange={set('pcd')} /></Field>
            <Field label="Redeem in steps of (points)" hint="Customers redeem a whole step at a time." htmlFor="rw3"><Input id="rw3" inputMode="numeric" value={f.step} disabled={!can} onChange={set('step')} /></Field>
          </div>
        </Card>
        <Card title="EAZY+ membership" sub="A membership with free delivery over a minimum and bonus points. For now it is a free trial: nothing is charged.">
          <div className="space-y-3">
            {flag('shop.membership') && <Switch label="EAZY+ is on" hint="Turn off to hide it and stop the benefits." checked={flag('shop.membership').enabled} disabled={!can || busy === 'shop.membership'} onChange={(v) => flip('shop.membership', v)} />}
            <Field label="Free trial length (days)" htmlFor="mb1"><Input id="mb1" inputMode="numeric" value={f.trial} disabled={!can} onChange={set('trial')} /></Field>
            <Field label="Free delivery from a store once items there reach ($)" hint="Delivery is waived per store, for members only." htmlFor="mb2"><Input id="mb2" inputMode="decimal" value={f.minFree} disabled={!can} onChange={set('minFree')} /></Field>
            <Field label="Points multiplier for members (×)" htmlFor="mb3"><Input id="mb3" inputMode="numeric" value={f.mult} disabled={!can} onChange={set('mult')} /></Field>
            <Field label="Price after the trial ($ per month)" hint="Shown for planning only. Paid billing is not switched on yet." htmlFor="mb4"><Input id="mb4" inputMode="decimal" value={f.price} disabled={!can} onChange={set('price')} /></Field>
          </div>
        </Card>
      </div>
      <Card title="What this means">
        <ul className="text-sm space-y-1.5 text-gray-700 list-disc pl-5">
          <li>A <strong>$50</strong> delivered order earns <strong>{orderPts} points</strong>{n(f.mult) > 1 ? <>, or <strong>{orderPts * n(f.mult)}</strong> for an EAZY+ member</> : ''}.</li>
          <li>{n(f.step)} points redeem for <strong>${stepValue.toFixed(2)}</strong> of store credit. That is about <strong>{backPct.toFixed(1)}%</strong> back on what a customer spends{n(f.mult) > 1 ? <> (<strong>{(backPct * n(f.mult)).toFixed(1)}%</strong> for members)</> : ''}.</li>
          <li>Members get <strong>free delivery</strong> from a store once their items there reach <strong>${n(f.minFree).toFixed(2)}</strong>.</li>
          <li>Redeemed points become store credit that the company pays for, so it is booked as an expense in the finance records.</li>
        </ul>
      </Card>
      {can && <div><Alert>{save.error}</Alert><Button busy={save.busy} onClick={() => save.run()}>Save changes</Button></div>}
    </div>
  )
}

export function Settings() {
  const can = useCan()
  const [tab, setTab] = useState(can('settings.view') ? 'settings' : 'users')
  return (
    <>
      <PageHeader title="Settings & access" sub="Commercial rules and who can do what. Every change is recorded in the audit log." />
      <Tabs value={tab} onChange={setTab} tabs={[...(can('settings.view') ? [{ id: 'settings', label: 'Commercial settings' }] : []), { id: 'rewards', label: 'Rewards & EAZY+' }, { id: 'users', label: 'Users & roles' }, { id: 'roles', label: 'Role reference' }]} />
      <div className="mt-4 space-y-4">{tab === 'settings' ? <Need perm={['settings.view']}><Commercial /></Need> : tab === 'rewards' ? <Need perm={['settings.view']}><RewardsSettings /></Need> : tab === 'users' ? <Users /> : <RolesRef />}</div>
    </>
  )
}

/* -------------------------------------------------------- Control centre */

/** Menu items per area, so an admin can hide what a team does not need. */
const AREA_NAV = {
  vendor: [['/vendor/orders', 'Orders'], ['/vendor/inventory', 'Inventory'], ['/vendor/questions', 'Questions'], ['/vendor/promotions', 'Promotions'], ['/vendor/ads', 'Ads'], ['/vendor/storefront', 'Storefront'], ['/vendor/analytics', 'Analytics'], ['/vendor/payouts', 'Payouts'], ['/vendor/reports', 'Reports'], ['/vendor/stores', 'Stores'], ['/vendor/chat', 'Chat'], ['/vendor/documentation', 'Documentation']],
  chef: [['/vendor/orders', 'Orders'], ['/vendor/cuisines', 'Cuisines'], ['/vendor/questions', 'Questions'], ['/vendor/promotions', 'Promotions'], ['/vendor/ads', 'Ads'], ['/vendor/storefront', 'Storefront'], ['/vendor/gallery', 'Gallery'], ['/vendor/analytics', 'Analytics'], ['/vendor/payouts', 'Payouts'], ['/vendor/reports', 'Reports'], ['/vendor/chat', 'Chat'], ['/vendor/documentation', 'Documentation']],
  marketing: [['/marketing/analytics', 'Analytics'], ['/marketing/emails', 'Email campaigns'], ['/marketing/automations', 'Automations'], ['/marketing/audiences', 'Audiences'], ['/marketing/campaigns', 'Campaigns'], ['/marketing/social', 'Social posts'], ['/marketing/calendar', 'Calendar'], ['/marketing/budget', 'Budget'], ['/marketing/library', 'Library'], ['/marketing/studio', 'Storefront studio'], ['/marketing/coupons', 'Coupons'], ['/marketing/rewards', 'Rewards & credit'], ['/marketing/settings', 'Settings']],
  finance: [['/finance/balances', 'Balances & payouts'], ['/finance/settlements', 'Settlements'], ['/finance/reconciliation', 'Reconciliation'], ['/finance/refunds', 'Refunds'], ['/finance/gift-cards', 'Gift cards'], ['/finance/pricing', 'Pricing & rules'], ['/finance/insights', 'Insights'], ['/finance/reports', 'Reports'], ['/finance/orders', 'Orders'], ['/finance/system', 'System & audit']],
  driver: [['/driver/history', 'History'], ['/driver/earnings', 'Earnings']],
  admin: [['/admin/orders', 'Orders'], ['/admin/dispatch', 'Dispatch'], ['/admin/drivers', 'Drivers'], ['/admin/support', 'Support'], ['/admin/customers', 'Customers'], ['/admin/reviews', 'Reviews'], ['/admin/refunds', 'Refunds'], ['/admin/vendors', 'Vendors'], ['/admin/messages', 'Vendor messages'], ['/admin/stores', 'Stores'], ['/admin/catalogue', 'Catalogue'], ['/admin/dishes', 'Home-chef dishes'], ['/admin/taxonomy', 'Taxonomy'], ['/admin/zones', 'Delivery zones'], ['/admin/promotions', 'Promotions'], ['/admin/ads', 'Advertising'], ['/admin/studio', 'Storefront studio'], ['/admin/content', 'Content'], ['/admin/crm', 'Vendor pipeline'], ['/admin/finance', 'Finance'], ['/admin/overview', 'Financial overview'], ['/admin/settlements', 'Settlements'], ['/admin/reconciliation', 'Reconciliation'], ['/admin/pricing', 'Pricing & rules'], ['/admin/gift-cards', 'Gift cards'], ['/admin/insights', 'Insights'], ['/admin/reports', 'Reports'], ['/admin/settings', 'Settings & access'], ['/admin/system', 'System & audit']],
}
const AREA_LABEL = { vendor: 'Vendor portal (stores)', chef: 'Chef portal (home kitchens)', marketing: 'Marketing', finance: 'Finance', driver: 'Driver', admin: 'Admin' }

export function ControlCentre() {
  const [tab, setTab] = useState('features')
  return (
    <Need perm={['control.manage']} what="the control centre">
      <PageHeader title="Control centre" sub="Switch features on or off, decide what each kind of vendor may do, and tailor every area’s menu. Changes apply within seconds and are recorded in the audit log." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'features', label: 'Shop features' }, { id: 'vendors', label: 'Vendor permissions' }, { id: 'areas', label: 'Menus & notices' }, { id: 'platform', label: 'Platform' }]} />
      <div className="mt-4 space-y-4">{tab === 'features' && <Features />}{tab === 'vendors' && <VendorPerms />}{tab === 'areas' && <Areas />}{tab === 'platform' && <PlatformSwitches />}</div>
    </Need>
  )
}

function Loader({ api, children }) {
  if (api.loading && !api.data) return <Spinner className="h-40" />
  if (api.error) return <Alert>{api.error} <button type="button" className="underline ml-2" onClick={api.reload}>Try again</button></Alert>
  return api.data ? children(api.data) : null
}

function Features() {
  const api = useApi('/admin/control/features')
  const [busy, setBusy] = useState(null)
  const flip = async (k, enabled) => { setBusy(k); try { await put(`/admin/control/features/${k}`, { enabled }); await api.reload(); toast(enabled ? 'Switched on.' : 'Switched off.') } catch (e) { toast(errText(e), 'error') } finally { setBusy(null) } }
  return (
    <Loader api={api}>{(data) => (
      <div className="grid lg:grid-cols-2 gap-4">
        {[...new Set(data.map((f) => f.grp))].map((g) => (
          <Card key={g} title={g}><div className="divide-y divide-gray-100">{data.filter((f) => f.grp === g).map((f) => <div key={f.key} className="py-2"><Switch checked={f.enabled} disabled={busy === f.key} onChange={(v) => flip(f.key, v)} label={f.label} hint={f.description} /></div>)}</div></Card>
        ))}
      </div>
    )}</Loader>
  )
}

function VendorPerms() {
  const api = useApi('/admin/control/vendor-capabilities')
  const [q, setQ] = useState('')
  const setDefault = async (k, v) => { try { await put('/admin/control/vendor-capabilities/defaults', { [k]: v }); await api.reload() } catch (e) { toast(errText(e), 'error') } }
  const setVendor = async (id, k, v) => { try { await put(`/admin/control/vendor-capabilities/${id}`, { [k]: v }); await api.reload() } catch (e) { toast(errText(e), 'error') } }
  return (
    <Loader api={api}>{(data) => {
      const keys = Object.keys(data.caps)
      const rows = data.vendors.filter((v) => v.name.toLowerCase().includes(q.toLowerCase()))
      return (
        <>
          <Alert tone="info">The first row is the rule for <strong>every</strong> vendor. Below it, a vendor can be allowed or blocked individually (highlighted cells are overrides). “Reset” returns a vendor to the rule for everyone.</Alert>
          <div className="max-w-xs"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter vendors" aria-label="Filter vendors" /></div>
          {/* Phones and tablets: one card per vendor, each permission on its own row with its switch. */}
          <div className="lg:hidden space-y-3">
            <div className="bg-primary-50 rounded-lg border border-primary-100 p-3">
              <strong className="text-sm">Everyone (default)</strong>
              <ul className="mt-2 divide-y divide-primary-100">{keys.map((k) => (
                <li key={k} className="py-2"><Switch label={data.caps[k]} checked={data.defaults[k] !== false} onChange={(on) => setDefault(k, on)} /></li>))}</ul>
            </div>
            {rows.map((v) => (
              <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><strong className="text-sm break-words">{v.name}</strong><div className="text-xs text-gray-500">{v.kind === 'chef' ? 'chef' : 'store'} · {v.status}</div></div>
                  {Object.keys(v.capabilities).length > 0 && <Button size="sm" variant="ghost" onClick={() => Promise.all(Object.keys(v.capabilities).map((k) => setVendor(v.id, k, null)))}>Reset</Button>}
                </div>
                <ul className="mt-2 divide-y divide-gray-100">{keys.map((k) => (
                  <li key={k} className={`py-2 ${k in v.capabilities ? 'bg-amber-50 -mx-3 px-3' : ''}`}><Switch label={data.caps[k]} checked={v.effective[k]} onChange={(on) => setVendor(v.id, k, on)} /></li>))}</ul>
              </div>))}
            {rows.length === 0 && <p className="text-sm text-gray-500">No vendors match.</p>}
          </div>
          <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50"><tr><th scope="col" className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Vendor</th>{keys.map((k) => <th scope="col" key={k} title={data.caps[k]} className="px-3 py-2 text-xs font-medium text-gray-500 uppercase text-left min-w-[7rem]">{data.caps[k]}</th>)}<th scope="col"><span className="sr-only">Reset</span></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-primary-50"><td className="px-3 py-2"><strong>Everyone (default)</strong></td>{keys.map((k) => <td key={k} className="px-3 py-2"><Switch label={`Default: ${data.caps[k]}`} checked={data.defaults[k] !== false} onChange={(v) => setDefault(k, v)} /></td>)}<td /></tr>
                {rows.map((v) => (
                  <tr key={v.id}><td className="px-3 py-2 whitespace-nowrap"><strong>{v.name}</strong> <span className="text-xs text-gray-500">{v.kind === 'chef' ? 'chef' : 'store'} · {v.status}</span></td>
                    {keys.map((k) => <td key={k} className={`px-3 py-2 ${k in v.capabilities ? 'bg-amber-50' : ''}`}><Switch label={`${v.name}: ${data.caps[k]}`} checked={v.effective[k]} onChange={(on) => setVendor(v.id, k, on)} /></td>)}
                    <td className="px-3 py-2">{Object.keys(v.capabilities).length > 0 && <Button size="sm" variant="ghost" onClick={() => Promise.all(Object.keys(v.capabilities).map((k) => setVendor(v.id, k, null)))}>Reset</Button>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )
    }}</Loader>
  )
}

function Areas() {
  const api = useApi('/admin/control/portals')
  const [portal, setPortal] = useState('vendor')
  const cur = api.data?.find((p) => p.portal === portal)
  const [hidden, setHidden] = useState([]); const [notice, setNotice] = useState(''); const [tone, setTone] = useState('info')
  useEffect(() => { if (cur) { setHidden(cur.hidden_nav); setNotice(cur.notice ?? ''); setTone(cur.notice_tone) } }, [cur?.portal, cur?.hidden_nav.join(','), cur?.notice]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = useAction(async () => { await put(`/admin/control/portals/${portal}`, { hidden_nav: hidden, notice: notice.trim() || null, notice_tone: tone }); toast('Saved. People see it the next time they open or refresh the page.'); api.reload() })
  return (
    <Loader api={api}>{() => (
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Area">
          <div className="space-y-3">
            <Field label="Area" htmlFor="car"><Select id="car" value={portal} onChange={(e) => setPortal(e.target.value)}>{Object.entries(AREA_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Notice shown at the top of every page" htmlFor="cno"><Textarea id="cno" rows={3} maxLength={300} value={notice} onChange={(e) => setNotice(e.target.value)} placeholder="e.g. Payouts are paused on Dec 24–26" /></Field>
            <Field label="Notice style" htmlFor="cnt"><Select id="cnt" value={tone} onChange={(e) => setTone(e.target.value)}><option value="info">Information</option><option value="warn">Warning</option></Select></Field>
            <Alert>{save.error}</Alert>
            <Button busy={save.busy} onClick={() => save.run()}>Save</Button>
          </div>
        </Card>
        <Card title={`Menu items shown in ${AREA_LABEL[portal]}`} sub="Switch off what this team does not need. The Dashboard always stays. People can still reach a hidden page by its address if their role allows it; this only tidies the menu. Use Vendor permissions to actually block an action.">
          <div className="divide-y divide-gray-100">{AREA_NAV[portal].map(([to, label]) => <div key={to} className="py-2"><Switch checked={!hidden.includes(to)} onChange={(on) => setHidden(on ? hidden.filter((h) => h !== to) : [...hidden, to])} label={label} /></div>)}</div>
        </Card>
      </div>
    )}</Loader>
  )
}

function PlatformSwitches() {
  const api = useApi('/admin/control/platform')
  return (
    <Loader api={api}>{(data) => (
      <Card title="Platform rules" sub="Money rules (commission, tax, fees, hold days) stay in Settings & access.">
        <div className="divide-y divide-gray-100">{data.map((s) => <div key={s.key} className="py-2"><Switch checked={s.enabled} label={s.label} hint={s.description} onChange={async (v) => { try { await put(`/admin/control/platform/${s.key}`, { enabled: v }); await api.reload(); toast('Saved.') } catch (e) { toast(errText(e), 'error') } }} /></div>)}</div>
      </Card>
    )}</Loader>
  )
}
