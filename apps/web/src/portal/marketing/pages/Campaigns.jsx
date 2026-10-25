import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useApi, useAction, toast } from '../../shared/hooks'
import { get, post, put, del, money } from '../../shared/client'
import { Alert, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, StatusBadge, Textarea, confirmThen } from '../../shared/ui'

export function Campaigns() {
  const { data, reload } = useApi('/marketing/campaigns')
  const coupons = useApi('/admin/coupons'); const themes = useApi('/admin/themes')
  const [edit, setEdit] = useState(null); const [res, setRes] = useState(null)
  const save = useAction(async () => {
    const b = { name: edit.name, objective: edit.objective || null, starts_on: edit.starts_on || null, ends_on: edit.ends_on || null, budget_cents: Math.round(Number(edit.budget || 0) * 100), status: edit.status, coupon_id: edit.coupon_id || null, theme_id: edit.theme_id || null, notes: edit.notes || null }
    if (edit.id) await put(`/marketing/campaigns/${edit.id}`, b); else await post('/marketing/campaigns', b)
    toast('Campaign saved'); setEdit(null); reload()
  })
  const remove = useAction(async (id) => { await del(`/marketing/campaigns/${id}`); reload() })
  const open = async (r) => setRes({ c: r, ...(await get(`/marketing/campaigns/${r.id}/results`)) })
  const blank = { name: '', objective: '', starts_on: '', ends_on: '', budget: '', status: 'planned', coupon_id: '', theme_id: '', notes: '' }
  const s = (k) => (e) => setEdit({ ...edit, [k]: e.target.value })
  return (
    <>
      <PageHeader title="Campaigns" sub="Group the emails, coupon, theme and spend for one push, and see what happened." actions={<Button onClick={() => setEdit(blank)}><Plus className="h-4 w-4" /> Create Campaign</Button>} />
      <DataTable rows={data ?? []} empty="No campaigns yet." columns={[
        { key: 'n', header: 'Campaign', nowrap: false, render: (r) => <><strong>{r.name}</strong><div className="text-xs text-gray-500">{r.objective}</div></> }, { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status === 'planned' ? 'scheduled' : r.status === 'finished' ? 'completed' : r.status} /> },
        { key: 'd', header: 'Dates', render: (r) => (r.starts_on ? `${r.starts_on} → ${r.ends_on ?? '…'}` : '—') }, { key: 'b', header: 'Budget', render: (r) => money(r.budget_cents) },
        { key: 'c', header: 'Coupon / theme', render: (r) => [r.coupon_code, r.theme_name].filter(Boolean).join(' · ') || '—' },
        { key: 'x', header: '', right: true, render: (r) => <span className="inline-flex gap-1"><Button size="sm" variant="secondary" onClick={() => open(r)}>Results</Button>
          <Button size="sm" variant="secondary" onClick={() => setEdit({ ...r, budget: (r.budget_cents / 100).toFixed(2), coupon_id: r.coupon_id ?? '', theme_id: r.theme_id ?? '', starts_on: r.starts_on ?? '', ends_on: r.ends_on ?? '', objective: r.objective ?? '', notes: r.notes ?? '' })}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={confirmThen('Delete this campaign?', () => remove.run(r.id))}>Delete</Button></span> }]} />
      {edit && (
        <Modal wide title={edit.id ? 'Edit campaign' : 'New campaign'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Alert>{save.error}</Alert>
            <Field label="Name" htmlFor="cn"><Input id="cn" value={edit.name} onChange={s('name')} maxLength={100} /></Field>
            <Field label="Goal (one line)" htmlFor="co"><Input id="co" value={edit.objective} onChange={s('objective')} maxLength={300} /></Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Starts" htmlFor="c1"><Input id="c1" type="date" value={edit.starts_on} onChange={s('starts_on')} /></Field>
              <Field label="Ends" htmlFor="c2"><Input id="c2" type="date" value={edit.ends_on} onChange={s('ends_on')} /></Field>
              <Field label="Budget (CAD)" htmlFor="c3"><Input id="c3" type="number" min={0} step="0.01" value={edit.budget} onChange={s('budget')} /></Field>
              <Field label="Status" htmlFor="c4"><Select id="c4" value={edit.status} onChange={s('status')}>{['planned', 'active', 'finished', 'cancelled'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label="Coupon" htmlFor="c5"><Select id="c5" value={edit.coupon_id} onChange={s('coupon_id')}><option value="">None</option>{coupons.data?.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</Select></Field>
              <Field label="Festival / season theme" htmlFor="c6"><Select id="c6" value={edit.theme_id} onChange={s('theme_id')}><option value="">None</option>{themes.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            </div>
            <Field label="Notes" htmlFor="c7"><Textarea id="c7" rows={3} value={edit.notes} onChange={s('notes')} maxLength={1000} /></Field>
            <p className="text-xs text-gray-500">Link emails to this campaign from the email editor. Run the theme from the <Link className="underline" to="/studio">Storefront studio</Link>.</p>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={edit.name.trim().length < 2} onClick={() => save.run()}>Save</Button></div>
          </div>
        </Modal>
      )}
      {res && (
        <Modal wide title={`Results: ${res.c.name}`} onClose={() => setRes(null)}>
          <div className="space-y-3 text-sm">
            <p><strong>Spent:</strong> {money(res.spent_cents)} of {money(res.budget_cents)} budget (recorded expenses)</p>
            {res.coupon && <p><strong>Coupon:</strong> {res.coupon.redemptions} orders · {money(res.coupon.discount_cents)} in discounts · {money(res.coupon.merchandise_cents)} of items sold</p>}
            <DataTable rows={res.emails} empty="No emails linked yet." columns={[{ key: 'n', header: 'Email', render: (r) => <Link className="text-primary-700 hover:underline" to={`/emails/${r.id}`}>{r.name}</Link> }, { key: 'r', header: 'Sent to', render: (r) => r.recipients }, { key: 'c', header: 'Clicked', render: (r) => r.clickers }, { key: 'o', header: 'Ordered within 7 days', render: (r) => r.ordered_within_7_days }]} />
            <Alert tone="info">{res.note}</Alert>
          </div>
        </Modal>
      )}
    </>
  )
}

const WHEN = { welcome: 'After someone signs up (and has agreed to marketing email)', winback: 'When a customer has not ordered for a while', first_order_followup: 'After a customer’s first order', abandoned_basket: 'When items were left in a basket for a few hours (at most once a week per person)' }

export function Automations() {
  const { data, reload } = useApi('/marketing/automations')
  const [edit, setEdit] = useState(null)
  const save = useAction(async (a) => { const x = a ?? edit; await put(`/marketing/automations/${x.id}`, { name: x.name, delay_days: Number(x.delay_days), subject: x.subject, body: x.body, enabled: x.enabled }); toast('Saved'); setEdit(null); reload() })
  return (
    <>
      <PageHeader title="Automation" sub="Emails that send themselves. All are off until you turn them on, and only reach people who agreed to marketing." />
      <Alert>{save.error}</Alert>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {data?.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-gray-900">{a.name}</h3><StatusBadge status={a.enabled ? 'active' : 'paused'} /></div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">{WHEN[a.trigger]}{a.delay_days ? `, after ${a.delay_days} day${a.delay_days > 1 ? 's' : ''}` : ''}. Each person gets it at most once every 90 days. Sent so far: {a.sent}.</p>
            <p className="text-sm mt-2"><strong>Subject:</strong> {a.subject}</p>
            <div className="flex gap-2 mt-3"><Button size="sm" variant="secondary" onClick={() => setEdit({ ...a })}>Edit</Button><Button size="sm" variant={a.enabled ? 'ghost' : 'primary'} onClick={() => save.run({ ...a, enabled: !a.enabled })}>{a.enabled ? 'Pause' : 'Activate'}</Button></div>
          </Card>
        ))}
      </div>
      {edit && (
        <Modal wide title={`Edit: ${edit.name}`} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Name" htmlFor="a1"><Input id="a1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Wait (days)" htmlFor="a2"><Input id="a2" type="number" min={0} max={365} value={edit.delay_days} onChange={(e) => setEdit({ ...edit, delay_days: e.target.value })} /></Field>
            <Field label="Subject" htmlFor="a3"><Input id="a3" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
            <Field label="Message" htmlFor="a4" hint="Use {{first_name}} and {{link:/deals}}. The footer is added automatically."><Textarea id="a4" rows={7} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run()}>Save</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
