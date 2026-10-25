import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApi, useAction, toast } from '../hooks'
import { post, patch, money, fmtDate } from '../client'
import { Alert, Badge, Button, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, Switch } from '../ui'

const BLANK = { code: '', description: '', kind: 'percent', value: '10', min: '0', cap: '', first: false, starts: '', ends: '', max: '', per_user: '1' }

/** Coupons are funded by EAZyfoods: they lower what the customer pays but do not reduce a store's earnings. */
export default function Coupons() {
  const { data, reload, loading, error } = useApi('/admin/coupons')
  const [open, setOpen] = useState(false)
  const [v, setV] = useState(BLANK)
  const toggle = useAction(async (id, on) => { await patch(`/admin/coupons/${id}`, { is_active: on }); toast(on ? 'Coupon enabled' : 'Coupon disabled'); reload() })
  const create = useAction(async () => {
    await post('/admin/coupons', {
      code: v.code, description: v.description || undefined, kind: v.kind, value: v.kind === 'percent' ? Number(v.value) : Math.round(Number(v.value) * 100),
      min_subtotal_cents: Math.round(Number(v.min || 0) * 100), max_discount_cents: v.cap ? Math.round(Number(v.cap) * 100) : null, first_order_only: v.first,
      starts_at: v.starts ? new Date(v.starts).toISOString() : null, ends_at: v.ends ? new Date(v.ends).toISOString() : null, max_redemptions: v.max ? Number(v.max) : null, per_user_limit: Number(v.per_user || 1),
    })
    toast('Coupon created'); setOpen(false); setV(BLANK); reload()
  })
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <>
      <PageHeader title="Coupons" sub="Funded by EAZyfoods: they lower what the customer pays but do not reduce a store’s earnings." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create Coupon</Button>} />
      <Alert>{error || toggle.error}</Alert>
      {loading && !data ? <Spinner className="h-40" /> : (
        <DataTable rows={data ?? []} empty="No coupons yet." columns={[
          { key: 'c', header: 'Code', nowrap: false, render: (r) => <><strong>{r.code}</strong><div className="text-xs text-gray-500">{r.description}</div></> },
          { key: 'v', header: 'Discount', render: (r) => (r.kind === 'percent' ? `${r.value}%${r.max_discount_cents ? ` (max ${money(r.max_discount_cents)})` : ''}` : money(r.value)) },
          { key: 'm', header: 'Rules', nowrap: false, render: (r) => <span className="text-xs">{r.min_subtotal_cents ? `min ${money(r.min_subtotal_cents)} · ` : ''}{r.first_order_only ? 'first order only · ' : ''}{r.per_user_limit}/customer{r.max_redemptions ? ` · ${r.max_redemptions} total` : ''}</span> },
          { key: 'd', header: 'Dates', render: (r) => (r.starts_at || r.ends_at ? `${r.starts_at ? fmtDate(r.starts_at) : '…'} to ${r.ends_at ? fmtDate(r.ends_at) : '…'}` : 'Always') },
          { key: 'u', header: 'Used', render: (r) => r.redemptions }, { key: 's', header: 'State', render: (r) => (r.is_active ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>) },
          { key: 'a', header: '', right: true, render: (r) => <Button size="sm" variant="secondary" onClick={() => toggle.run(r.id, !r.is_active)}>{r.is_active ? 'Disable' : 'Enable'}</Button> }]} />
      )}
      {open && (
        <Modal wide title="New coupon" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Alert>{create.error}</Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Code" htmlFor="k1" hint="Letters, numbers, - and _ (not case sensitive)"><Input id="k1" value={v.code} onChange={s('code')} /></Field>
              <Field label="Type" htmlFor="k2"><Select id="k2" value={v.kind} onChange={s('kind')}><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option></Select></Field>
              <Field label={v.kind === 'percent' ? 'Percent (1–100)' : 'Amount ($)'} htmlFor="k3"><Input id="k3" inputMode="decimal" value={v.value} onChange={s('value')} /></Field>
              <Field label="Minimum spend ($)" htmlFor="k4"><Input id="k4" inputMode="decimal" value={v.min} onChange={s('min')} /></Field>
              <Field label="Maximum discount ($, optional)" htmlFor="k5"><Input id="k5" inputMode="decimal" value={v.cap} onChange={s('cap')} /></Field>
              <Field label="Uses per customer" htmlFor="k6"><Input id="k6" inputMode="numeric" value={v.per_user} onChange={s('per_user')} /></Field>
              <Field label="Total uses (optional)" htmlFor="k7"><Input id="k7" inputMode="numeric" value={v.max} onChange={s('max')} /></Field>
              <Field label="Starts (optional)" htmlFor="k8"><Input id="k8" type="datetime-local" value={v.starts} onChange={s('starts')} /></Field>
              <Field label="Ends (optional)" htmlFor="k9"><Input id="k9" type="datetime-local" value={v.ends} onChange={s('ends')} /></Field>
            </div>
            <Field label="Description (internal)" htmlFor="k10"><Input id="k10" value={v.description} onChange={s('description')} /></Field>
            <Switch checked={v.first} label="First orders only" onChange={(x) => setV({ ...v, first: x })} />
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button busy={create.busy} disabled={v.code.length < 3} onClick={() => create.run()}>Create coupon</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
