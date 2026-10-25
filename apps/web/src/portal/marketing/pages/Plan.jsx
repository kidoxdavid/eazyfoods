import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Copy, Trash2 } from 'lucide-react'
import { useApi, useAction, toast } from '../../shared/hooks'
import { post, put, del, money, fmtDate } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, ImageUpload, Input, Modal, PageHeader, Select, Stat, StatusBadge, Textarea, confirmThen } from '../../shared/ui'

export function Calendar() {
  const nav = useNavigate()
  const { data } = useApi('/marketing/occasions')
  const plan = useAction(async (o) => {
    await post('/marketing/campaigns', { name: `${o.name} ${o.next_start.slice(0, 4)}`, objective: `Plan for ${o.name}`, starts_on: o.next_start, ends_on: o.next_end, theme_id: o.id, status: 'planned' })
    toast('Campaign created'); nav('/campaigns')
  })
  return (
    <>
      <PageHeader title="Cultural Occasions" sub="Upcoming festivals and holidays, from the Storefront studio themes. Plan ahead: moving festivals hold their next dates only." />
      <Alert>{plan.error}</Alert>
      <DataTable rows={data ?? []} rowKey={(r) => r.slug} columns={[
        { key: 'n', header: 'Occasion', nowrap: false, render: (r) => <><span aria-hidden="true">{r.emoji} </span><strong>{r.name}</strong> {r.moves && <Badge tone="yellow">Dates move yearly</Badge>}</> },
        { key: 'd', header: 'When', render: (r) => `${r.next_start} → ${r.next_end}` }, { key: 'u', header: 'In', render: (r) => (r.days_until <= 0 ? <Badge tone="green">On now</Badge> : `${r.days_until} days`) },
        { key: 't', header: 'Shop theme', render: (r) => <StatusBadge status={r.status === 'off' ? 'draft' : r.status} /> },
        { key: 'x', header: '', right: true, render: (r) => <span className="inline-flex gap-1"><Button size="sm" variant="secondary" busy={plan.busy} onClick={() => plan.run(r)}>Plan a campaign</Button><Link className="px-3 py-1.5 text-sm text-primary-700 hover:underline" to="/studio">Studio</Link></span> }]} />
    </>
  )
}

const PLAT = ['instagram', 'facebook', 'tiktok', 'x', 'whatsapp', 'other']
const local = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

export function Social() {
  const { data, reload } = useApi('/marketing/social')
  const [edit, setEdit] = useState(null)
  const save = useAction(async () => {
    const b = { platform: edit.platform, caption: edit.caption, image_url: edit.image_url, link: edit.link || null, scheduled_for: edit.when ? new Date(edit.when).toISOString() : null, status: edit.status }
    if (edit.id) await put(`/marketing/social/${edit.id}`, b); else await post('/marketing/social', b)
    toast('Saved'); setEdit(null); reload()
  })
  const mark = useAction(async (p) => { await put(`/marketing/social/${p.id}`, { platform: p.platform, caption: p.caption, image_url: p.image_url, link: p.link, scheduled_for: p.scheduled_for, status: 'posted', campaign_id: p.campaign_id }); reload() })
  const remove = useAction(async (id) => { await del(`/marketing/social/${id}`); reload() })
  return (
    <>
      <PageHeader title="Social Media" sub="Plan captions and dates. Posting is done by hand on each platform (there are no connections to them yet)." actions={<Button onClick={() => setEdit({ platform: 'instagram', caption: '', image_url: null, link: '', when: '', status: 'draft' })}><Plus className="h-4 w-4" /> Create Post</Button>} />
      <DataTable rows={data ?? []} empty="No posts planned." columns={[
        { key: 'p', header: 'Platform', render: (r) => <strong className="capitalize">{r.platform}</strong> }, { key: 'c', header: 'Caption', nowrap: false, render: (r) => <span>{r.caption.slice(0, 90)}{r.caption.length > 90 ? '…' : ''}</span> },
        { key: 'w', header: 'When', render: (r) => (r.scheduled_for ? fmtDate(r.scheduled_for) : '—') }, { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status === 'posted' ? 'sent' : r.status} /> },
        { key: 'x', header: '', right: true, render: (r) => <span className="inline-flex gap-1"><Button size="sm" variant="secondary" onClick={() => setEdit({ ...r, when: local(r.scheduled_for), link: r.link ?? '' })}>Edit</Button>{r.status !== 'posted' && <Button size="sm" variant="ghost" onClick={() => mark.run(r)}>Mark posted</Button>}<Button size="sm" variant="ghost" onClick={confirmThen('Delete this post?', () => remove.run(r.id))}>Delete</Button></span> }]} />
      {edit && (
        <Modal wide title={edit.id ? 'Edit post' : 'New post'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Alert>{save.error}</Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Platform" htmlFor="sp"><Select id="sp" value={edit.platform} onChange={(e) => setEdit({ ...edit, platform: e.target.value })}>{PLAT.map((p) => <option key={p}>{p}</option>)}</Select></Field>
              <Field label="Status" htmlFor="ss"><Select id="ss" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="posted">Posted</option></Select></Field>
              <Field label="Post on" htmlFor="sw"><Input id="sw" type="datetime-local" value={edit.when} onChange={(e) => setEdit({ ...edit, when: e.target.value })} /></Field>
              <Field label="Link (optional)" htmlFor="sl" hint="https://… or a page like /deals"><Input id="sl" value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></Field>
            </div>
            <Field label="Caption" htmlFor="sc"><Textarea id="sc" rows={5} value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} maxLength={2200} /></Field>
            <div><p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Picture (optional)</p><ImageUpload value={edit.image_url} onChange={(u) => setEdit({ ...edit, image_url: u })} label="Post picture" /></div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={!edit.caption.trim()} onClick={() => save.run()}>Save</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}

export function Budget() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const { data, reload } = useApi(`/marketing/budget?month=${month}`)
  const [exp, setExp] = useState({ on_date: `${month}-01`, channel: 'email', amount: '', note: '' })
  const setBudget = useAction(async (channel, dollars) => { await put('/marketing/budget', { month, channel, budget_cents: Math.round(Number(dollars || 0) * 100) }); toast('Budget saved'); reload() })
  const add = useAction(async () => { await post('/marketing/expenses', { on_date: exp.on_date, channel: exp.channel, amount_cents: Math.round(Number(exp.amount) * 100), note: exp.note || null }); toast('Expense recorded'); setExp({ ...exp, amount: '', note: '' }); reload() })
  const remove = useAction(async (id) => { await del(`/marketing/expenses/${id}`); reload() })
  const total = data?.channels.reduce((a, c) => ({ b: a.b + c.budget_cents, s: a.s + c.actual_cents }), { b: 0, s: 0 })
  return (
    <>
      <PageHeader title="Budget" sub="Plan the month, record what you spend, and compare." />
      <Field label="Month" htmlFor="month" className="max-w-xs"><Input id="month" type="month" value={month} onChange={(e) => { setMonth(e.target.value); setExp({ ...exp, on_date: `${e.target.value}-01` }) }} /></Field>
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"><Stat label="Budget" value={money(total.b)} /><Stat label="Spent (recorded + measured)" value={money(total.s)} /><Stat label="Left" value={money(total.b - total.s)} sub={total.s > total.b ? 'Over budget' : undefined} /></div>
          <DataTable rows={data.channels} rowKey={(r) => r.channel} columns={[
            { key: 'c', header: 'Channel', render: (r) => <strong className="capitalize">{r.channel}</strong> },
            { key: 'b', header: 'Budget (CAD)', render: (r) => <Input type="number" min={0} step="1" defaultValue={(r.budget_cents / 100).toFixed(0)} aria-label={`${r.channel} budget`} className="max-w-[120px]" onBlur={(e) => { if (Math.round(Number(e.target.value) * 100) !== r.budget_cents) setBudget.run(r.channel, e.target.value) }} /> },
            { key: 'r', header: 'Recorded', render: (r) => money(r.recorded_cents) }, { key: 'm', header: 'Measured automatically', render: (r) => (r.measured_cents ? money(r.measured_cents) : '—') },
            { key: 'a', header: 'Spent', render: (r) => <strong className={r.budget_cents && r.actual_cents > r.budget_cents ? 'text-red-700' : ''}>{money(r.actual_cents)}</strong> }]} />
          <p className="text-xs text-gray-500">{data.note}</p>
          <Card title="Record an expense">
            <Alert>{add.error}</Alert>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mt-2">
              <Field label="Date" htmlFor="e1"><Input id="e1" type="date" value={exp.on_date} onChange={(e) => setExp({ ...exp, on_date: e.target.value })} /></Field>
              <Field label="Channel" htmlFor="e2"><Select id="e2" value={exp.channel} onChange={(e) => setExp({ ...exp, channel: e.target.value })}>{['email', 'ads', 'coupons', 'social', 'events', 'other'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Amount (CAD)" htmlFor="e3"><Input id="e3" type="number" min={0} step="0.01" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} /></Field>
              <Field label="Note" htmlFor="e4"><Input id="e4" value={exp.note} onChange={(e) => setExp({ ...exp, note: e.target.value })} maxLength={200} /></Field>
              <Button busy={add.busy} disabled={!(Number(exp.amount) > 0)} onClick={() => add.run()}>Add</Button>
            </div>
          </Card>
          <DataTable rows={data.expenses} empty="No expenses recorded this month." columns={[{ key: 'on_date', header: 'Date' }, { key: 'channel', header: 'Channel' }, { key: 'a', header: 'Amount', render: (r) => money(r.amount_cents) }, { key: 'n', header: 'Note', nowrap: false, render: (r) => r.note ?? '' }, { key: 'x', header: '', right: true, render: (r) => <Button size="sm" variant="ghost" onClick={confirmThen('Delete this expense?', () => remove.run(r.id))}>Delete</Button> }]} />
        </>
      )}
    </>
  )
}

export function Library() {
  const { data, reload } = useApi('/marketing/assets')
  const [f, setF] = useState({ title: '', url: null, tags: '' })
  const add = useAction(async () => { await post('/marketing/assets', { title: f.title, url: f.url, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean) }); toast('Added to the library'); setF({ title: '', url: null, tags: '' }); reload() })
  const remove = useAction(async (id) => { await del(`/marketing/assets/${id}`); reload() })
  const copy = async (url) => { try { await navigator.clipboard.writeText(`${window.location.origin}${url}`); toast('Link copied') } catch { toast('Copy failed', 'error') } }
  return (
    <>
      <PageHeader title="Content Library" sub="Pictures for emails, posts and banners, kept in one place." />
      <Card title="Add a picture">
        <Alert>{add.error}</Alert>
        <div className="flex flex-wrap items-end gap-4 mt-2">
          <ImageUpload value={f.url} onChange={(u) => setF({ ...f, url: u })} label="Library picture" />
          <Field label="Title" htmlFor="lt"><Input id="lt" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} /></Field>
          <Field label="Tags (comma separated)" htmlFor="lg"><Input id="lg" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
          <Button busy={add.busy} disabled={!f.url || f.title.trim().length < 2} onClick={() => add.run()}>Save</Button>
        </div>
      </Card>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {data?.map((a) => (
          <li key={a.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <img src={a.url} alt={a.title} loading="lazy" className="w-full aspect-square object-cover bg-gray-100" />
            <div className="p-3"><p className="font-medium text-sm truncate">{a.title}</p><p className="text-xs text-gray-500 truncate">{(a.tags || []).join(', ')}</p>
              <div className="flex gap-1 mt-2"><Button size="sm" variant="secondary" onClick={() => copy(a.url)}><Copy className="h-3 w-3" /> Copy link</Button><Button size="sm" variant="ghost" aria-label={`Delete ${a.title}`} onClick={confirmThen('Delete this picture?', () => remove.run(a.id))}><Trash2 className="h-3 w-3" /></Button></div></div>
          </li>
        ))}
      </ul>
      {data && !data.length && <p className="text-sm text-gray-500">No pictures yet.</p>}
    </>
  )
}
