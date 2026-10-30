import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAction, useApi, toast } from '../../shared/hooks'
import { get, post, put, patch, fmtDate, fmtDateTime } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Switch, Tabs, Textarea } from '../../shared/ui'
import { Fetch, Need, cents, lines } from '../common'

/* ------------------------------------------------------------------ Ads */

export function Ads() {
  const [rejecting, setRejecting] = useState(null)
  const [note, setNote] = useState('')
  const act = useAction(async (id, status, n, reload) => { await patch(`/admin/ads/${id}`, { status, note: n }); toast(`Campaign ${status}`); reload() })
  return (
    <Need perm={['ads.manage']} what="managing advertising">
      <PageHeader title="Advertising" sub="Review creative before it goes live. Impressions, clicks and spend are counted by EAZyfoods. We make no claim about effect on sales." />
      <Alert>{act.error}</Alert>
      <Fetch path="/admin/ads">{(rows, reload) => (
        <>
          <DataTable rows={rows} empty="No campaigns yet." columns={[
            { key: 't', header: 'Campaign', nowrap: false, render: (r) => <div><strong>{r.title}</strong><div className="text-xs text-gray-500">{r.vendor_name}{r.product_name ? ` · ${r.product_name}` : ''}</div>{r.body && <div className="text-xs">{r.body}</div>}{r.image_url && <img src={r.image_url} alt="" className="w-24 rounded mt-1" />}</div> },
            { key: 'p', header: 'Placement', render: (r) => <Badge tone="blue">{r.placement.replace(/_/g, ' ')}</Badge> },
            { key: 'd', header: 'Dates', render: (r) => `${fmtDate(r.starts_at)} to ${fmtDate(r.ends_at)}` },
            { key: 'b', header: 'Budget', render: (r) => <div>{cents(r.budget_cents)}<div className="text-xs text-gray-500">{cents(r.cpc_cents)} per click</div></div> },
            { key: 'm', header: 'Measured', render: (r) => <span className="text-xs">{r.impressions} impressions · {r.clicks} clicks · {cents(r.spent_cents)} spent</span> },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'a', header: '', render: (r) => (
              <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {r.status !== 'approved' && <Button size="sm" onClick={() => act.run(r.id, 'approved', undefined, reload)}>Approve</Button>}
                {r.status === 'approved' && <Button size="sm" variant="secondary" onClick={() => act.run(r.id, 'paused', undefined, reload)}>Pause</Button>}
                {r.status !== 'rejected' && <Button size="sm" variant="danger" onClick={() => { setRejecting(r.id); setNote('') }}>Reject</Button>}
              </div>) },
          ]} />
          {rejecting && (
            <Modal title="Reject campaign" onClose={() => setRejecting(null)}>
              <Field label="Tell the vendor why (required)" htmlFor="rej"><Textarea id="rej" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="flex justify-end gap-2 mt-3"><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
                <Button variant="danger" disabled={note.length < 3} onClick={async () => { await act.run(rejecting, 'rejected', note, reload); setRejecting(null) }}>Reject</Button></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}

/* -------------------------------------------------------------- Content */

export function Content() {
  const [tab, setTab] = useState('home')
  return (
    <Need perm={['content.manage']} what="managing content">
      <PageHeader title="Content" sub="Homepage text, policy pages, email templates and recipes." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'home', label: 'Homepage' }, { id: 'pages', label: 'Pages & policies' }, { id: 'templates', label: 'Email templates' }, { id: 'recipes', label: 'Recipes' }]} />
      <div className="mt-4 space-y-4">{tab === 'home' ? <Home /> : tab === 'pages' ? <Pages /> : tab === 'templates' ? <Templates /> : <Recipes />}</div>
    </Need>
  )
}

function Home() {
  return <Fetch path="/content/home">{(c, reload) => <HomeForm c={c} reload={reload} />}</Fetch>
}
function HomeForm({ c, reload }) {
  const [h, setH] = useState({ title: c.home_hero?.title ?? '', subtitle: c.home_hero?.subtitle ?? '' })
  const [a, setA] = useState({ text: c.announcement?.text ?? '', active: !!c.announcement?.active })
  const sh = useAction(async () => { await put('/admin/content/home_hero', h); toast('Homepage text saved'); reload() })
  const sa = useAction(async () => { await put('/admin/content/announcement', a); toast('Announcement saved'); reload() })
  return (
    <>
      <Card title="Homepage headline"><Alert>{sh.error}</Alert>
        <div className="space-y-3 mt-2">
          <Field label="Headline" htmlFor="hh"><Textarea id="hh" rows={2} value={h.title} onChange={(e) => setH({ ...h, title: e.target.value })} /></Field>
          <Field label="Sub-headline" htmlFor="hs"><Textarea id="hs" value={h.subtitle} onChange={(e) => setH({ ...h, subtitle: e.target.value })} /></Field>
          <Button busy={sh.busy} onClick={() => sh.run()}>Save</Button></div></Card>
      <Card title="Announcement bar" sub="Shown at the very top of the shop. Only make claims you can stand behind."><Alert>{sa.error}</Alert>
        <div className="space-y-3 mt-2">
          <Field label="Text" htmlFor="at"><Input id="at" maxLength={200} value={a.text} onChange={(e) => setA({ ...a, text: e.target.value })} /></Field>
          <Switch checked={a.active} label="Show it" onChange={(x) => setA({ ...a, active: x })} />
          <Button busy={sa.busy} onClick={() => sa.run()}>Save</Button></div></Card>
    </>
  )
}

function Pages() {
  const [edit, setEdit] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [v, setV] = useState({ slug: '', title: '', body: '', status: 'published', needs_legal_review: false })
  const open = async (slug) => {
    if (!slug) { setV({ slug: '', title: '', body: '', status: 'draft', needs_legal_review: false }); setIsNew(true); setEdit(true); return }
    const p = await get(`/admin/pages/${slug}`); setV({ slug, title: p.title, body: p.body, status: p.status, needs_legal_review: p.needs_legal_review }); setIsNew(false); setEdit(true)
  }
  const save = useAction(async (reload) => { await put(`/admin/pages/${v.slug}`, { title: v.title, body: v.body, status: v.status, needs_legal_review: v.needs_legal_review }); toast('Page saved'); setEdit(null); reload() })
  return (
    <Fetch path="/admin/pages">{(rows, reload) => (
      <>
        <div className="flex justify-end"><Button onClick={() => open(null)}><Plus className="h-4 w-4" /> New page</Button></div>
        <DataTable rows={rows} rowKey={(r) => r.slug} onRow={(r) => open(r.slug)} columns={[
          { key: 't', header: 'Page', render: (r) => <div><strong>{r.title}</strong><div className="text-xs text-gray-500">/pages/{r.slug}</div></div> },
          { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'l', header: 'Legal', render: (r) => (r.needs_legal_review ? <Badge tone="red">Needs legal review</Badge> : <span className="text-gray-500">—</span>) },
          { key: 'u', header: 'Updated', render: (r) => fmtDate(r.updated_at) }]} />
        {edit && (
          <Modal wide title={isNew ? 'New page' : 'Edit page'} onClose={() => setEdit(null)}>
            <div className="space-y-3"><Alert>{save.error}</Alert>
              {v.needs_legal_review && <Alert tone="warn">This page is flagged as needing legal review before launch. Do not publish it as final until a qualified professional has approved it.</Alert>}
              {isNew && <Field label="Address (slug)" hint="lowercase letters, numbers and dashes" htmlFor="ps"><Input id="ps" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} /></Field>}
              <Field label="Title" htmlFor="pt"><Input id="pt" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
              <Field label="Body" hint="Use ## for headings; blank line between paragraphs." htmlFor="pb"><Textarea id="pb" rows={12} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>
              <Field label="Status" htmlFor="pst"><Select id="pst" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="published">Published</option><option value="draft">Draft</option></Select></Field>
              <Switch checked={v.needs_legal_review} label="Needs legal review before launch" onChange={(x) => setV({ ...v, needs_legal_review: x })} />
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                <Button busy={save.busy} disabled={!/^[a-z0-9-]+$/.test(v.slug) || v.title.length < 2 || !v.body} onClick={() => save.run(reload)}>Save page</Button></div></div>
          </Modal>
        )}
      </>
    )}</Fetch>
  )
}

const VARS = {
  order_confirmed: 'order_number, total, web_url', order_status: 'order_number, status, note, web_url', vendor_new_order: 'order_number, web_url', refund_processed: 'order_number, amount',
  substitution_proposed: 'order_number, web_url', password_reset: 'link', email_verify: 'link', vendor_approved: 'name, web_url',
}
function Templates() {
  const [edit, setEdit] = useState(null)
  const [v, setV] = useState({ subject: '', body: '' })
  const save = useAction(async (reload) => { await put(`/admin/templates/${edit.key}`, v); toast('Template saved'); setEdit(null); reload() })
  return (
    <Fetch path="/admin/templates">{(rows, reload) => (
      <>
        <DataTable rows={rows} rowKey={(r) => r.key} onRow={(r) => { setEdit(r); setV({ subject: r.subject, body: r.body }) }} columns={[
          { key: 'k', header: 'Template', render: (r) => <strong>{r.key.replace(/_/g, ' ')}</strong> }, { key: 'subject', header: 'Subject' }, { key: 'u', header: 'Updated', render: (r) => fmtDate(r.updated_at) }]} />
        {edit && (
          <Modal wide title={`Template: ${edit.key}`} onClose={() => setEdit(null)}>
            <div className="space-y-3"><Alert>{save.error}</Alert>
              <p className="text-xs text-gray-500">Available variables: {(VARS[edit.key] ?? 'see the current text').split(', ').map((x) => <code key={x} className="mr-1.5">{`{{${x}}}`}</code>)}</p>
              <Field label="Subject" htmlFor="ts"><Input id="ts" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>
              <Field label="Body" htmlFor="tb"><Textarea id="tb" rows={10} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run(reload)}>Save</Button></div></div>
          </Modal>
        )}
      </>
    )}</Fetch>
  )
}

const blankIng = () => ({ label: '', quantity_text: '', product_slug: '', optional: false, alternative_slugs: '' })
const blankRecipe = { title: '', summary: '', region_slug: '', country_slug: '', servings: '4', prep: '', cook: '', steps: '', safety: '', reviewed: false, status: 'draft' }

function Recipes() {
  const tax = useApi('/admin/taxonomy')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [v, setV] = useState(blankRecipe)
  const [ings, setIngs] = useState([blankIng()])
  const reset = () => { setV(blankRecipe); setIngs([blankIng()]); setLoadErr('') }
  const edit = async (r) => {
    reset(); setEditing(r.id); setOpen(true)
    try {
      const d = await get(`/admin/recipes/${r.id}`)
      setV({ title: d.title, summary: d.summary ?? '', region_slug: d.region_slug ?? '', country_slug: d.country_slug ?? '', servings: String(d.servings), prep: d.prep_minutes ?? '', cook: d.cook_minutes ?? '', steps: d.steps.join('\n'), safety: d.food_safety_note ?? '', reviewed: d.reviewed, status: d.status })
      setIngs(d.ingredients.map((i) => ({ label: i.label, quantity_text: i.quantity_text ?? '', product_slug: i.product_slug ?? '', optional: i.optional, alternative_slugs: (i.alternative_slugs ?? []).join(', ') })))
    } catch { setLoadErr('Could not load this recipe for editing.') }
  }
  const save = useAction(async (reload) => {
    const body = { title: v.title, summary: v.summary || undefined, region_slug: v.region_slug || undefined, country_slug: v.country_slug || undefined, servings: Number(v.servings), prep_minutes: v.prep ? Number(v.prep) : undefined, cook_minutes: v.cook ? Number(v.cook) : undefined,
      steps: v.steps.split('\n').map((s) => s.trim()).filter(Boolean), food_safety_note: v.safety || undefined, reviewed: v.reviewed, status: v.status,
      ingredients: ings.filter((i) => i.label.trim()).map((i) => ({ label: i.label, quantity_text: i.quantity_text || undefined, product_slug: i.product_slug || undefined, optional: i.optional, alternative_slugs: lines(i.alternative_slugs) })) }
    if (editing) await put(`/admin/recipes/${editing}`, body); else await post('/admin/recipes', body)
    toast('Recipe saved'); setOpen(false); reload()
  })
  const setIng = (i, k, val) => setIngs((s) => s.map((x, j) => (j === i ? { ...x, [k]: val } : x)))
  const f = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <Fetch path="/admin/recipes">{(rows, reload) => (
      <>
        <Alert tone="warn">AI-generated recipe drafts must be reviewed by a person (check food safety and allergens) and marked “Reviewed” before the draft label is removed. Linked products come from the real catalogue; availability is never invented.</Alert>
        <div className="flex justify-end"><Button onClick={() => { reset(); setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" /> New recipe</Button></div>
        <DataTable rows={rows} onRow={edit} columns={[
          { key: 't', header: 'Recipe', render: (r) => <strong>{r.title}</strong> }, { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'ai', header: 'Origin', render: (r) => (r.ai_generated ? <Badge tone="amber">AI draft</Badge> : 'Written by us') },
          { key: 'r', header: 'Reviewed', render: (r) => (r.reviewed ? <Badge tone="green">Reviewed</Badge> : <Badge tone="red">Not reviewed</Badge>) }]} />
        {open && (
          <Modal wide title={editing ? 'Edit recipe' : 'New recipe'} onClose={() => setOpen(false)}>
            <div className="space-y-3">
              {tax.loading && <Spinner className="h-10" />}
              <Alert tone="warn">{loadErr}</Alert>
              {editing && <Alert tone="warn">Saving replaces all ingredients. Re-enter curated alternative products below or they will be removed.</Alert>}
              <Alert>{save.error}</Alert>
              <Field label="Title" htmlFor="rt"><Input id="rt" value={v.title} onChange={f('title')} /></Field>
              <Field label="Summary" htmlFor="rsu"><Input id="rsu" value={v.summary} onChange={f('summary')} /></Field>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Region" htmlFor="rrg"><Select id="rrg" value={v.region_slug} onChange={f('region_slug')}><option value="">None</option>{(tax.data?.regions ?? []).map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</Select></Field>
                <Field label="Country" htmlFor="rco"><Select id="rco" value={v.country_slug} onChange={f('country_slug')}><option value="">None</option>{(tax.data?.countries ?? []).map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</Select></Field>
                <Field label="Servings" htmlFor="rse"><Input id="rse" inputMode="numeric" value={v.servings} onChange={f('servings')} /></Field>
                <Field label="Prep (min)" htmlFor="rpr"><Input id="rpr" inputMode="numeric" value={v.prep} onChange={f('prep')} /></Field>
                <Field label="Cook (min)" htmlFor="rck"><Input id="rck" inputMode="numeric" value={v.cook} onChange={f('cook')} /></Field>
              </div>
              <Field label="Steps (one per line)" htmlFor="rst"><Textarea id="rst" rows={7} value={v.steps} onChange={f('steps')} /></Field>
              <Field label="Food safety note" htmlFor="rfs"><Input id="rfs" value={v.safety} onChange={f('safety')} /></Field>
              <h4 className="font-semibold text-sm">Ingredients</h4>
              {ings.map((i, n) => (
                <div key={n} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Ingredient" htmlFor={`ig${n}`}><Input id={`ig${n}`} value={i.label} onChange={(e) => setIng(n, 'label', e.target.value)} /></Field>
                    <Field label="Quantity" htmlFor={`iq${n}`}><Input id={`iq${n}`} value={i.quantity_text} onChange={(e) => setIng(n, 'quantity_text', e.target.value)} /></Field>
                    <Field label="Linked product slug" hint="Leave empty for pantry items" htmlFor={`ip${n}`}><Input id={`ip${n}`} value={i.product_slug} onChange={(e) => setIng(n, 'product_slug', e.target.value)} /></Field>
                    <Field label="Curated alternatives (slugs)" htmlFor={`ia${n}`}><Input id={`ia${n}`} value={i.alternative_slugs} onChange={(e) => setIng(n, 'alternative_slugs', e.target.value)} /></Field>
                  </div>
                  <div className="flex items-center justify-between"><Switch checked={i.optional} label="Optional" onChange={(x) => setIng(n, 'optional', x)} /><Button size="sm" variant="ghost" onClick={() => setIngs((s) => s.filter((_, j) => j !== n))}>Remove</Button></div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => setIngs((s) => [...s, blankIng()])}>Add ingredient</Button>
              <Field label="Status" htmlFor="rsta"><Select id="rsta" value={v.status} onChange={f('status')}><option value="draft">Draft (hidden)</option><option value="published">Published</option></Select></Field>
              <Switch checked={v.reviewed} label="A person has reviewed this recipe (food safety, allergens)" onChange={(x) => setV({ ...v, reviewed: x })} />
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button busy={save.busy} disabled={v.title.length < 2 || !v.steps.trim() || !ings.some((i) => i.label.trim())} onClick={() => save.run(reload)}>Save recipe</Button></div>
            </div>
          </Modal>
        )}
      </>
    )}</Fetch>
  )
}

/* ------------------------------------------------------------------ CRM */

const STAGES = ['identified', 'contacted', 'demo', 'onboarding', 'launched', 'lost']
const blankProspect = { business_name: '', contact_name: '', phone: '', email: '', address: '', source: '', next_action: '', next_action_at: '' }
const iso = (s) => (s ? new Date(s).toISOString() : undefined)

export function Crm() {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState(blankProspect)
  const f = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const add = useAction(async (reload) => {
    await post('/admin/crm/prospects', { business_name: v.business_name, contact_name: v.contact_name || undefined, phone: v.phone || undefined, email: v.email || undefined, address: v.address || undefined,
      source: v.source || undefined, next_action: v.next_action || undefined, next_action_at: iso(v.next_action_at) })
    toast('Prospect added'); setOpen(false); setV(blankProspect); reload()
  })
  return (
    <Need perm={['crm.manage']} what="the vendor sales pipeline">
      <PageHeader title="Vendor pipeline" sub="Internal only. Contact details here are personal information: keep it to what you need." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add prospect</Button>} />
      <Fetch path="/admin/crm/prospects">{(rows, reload) => (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Pipeline stages">{STAGES.map((s) => {
            const items = rows.filter((r) => r.stage === s)
            return (
              <div key={s} className="w-64 flex-shrink-0 bg-gray-100 rounded-lg p-2.5 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">{s[0].toUpperCase() + s.slice(1)} <Badge>{items.length}</Badge></h3>
                {items.map((r) => (
                  <Link key={r.id} to={`/crm/${r.id}`} className={`block bg-white rounded-lg border p-3 text-sm hover:shadow ${r.overdue ? 'border-red-300' : 'border-gray-200'}`}>
                    <strong>{r.business_name}</strong>
                    <div className="text-xs text-gray-500">{r.contact_name ?? ''}{r.source ? ` · ${r.source}` : ''}</div>
                    {r.next_action && <div className="text-xs mt-1">{r.overdue && <Badge tone="red">Overdue</Badge>} {r.next_action}{r.next_action_at ? ` · ${fmtDate(r.next_action_at)}` : ''}</div>}
                  </Link>
                ))}
                {!items.length && <p className="text-xs text-gray-600">None</p>}
              </div>
            )
          })}</div>
          {open && (
            <Modal title="Add prospect" onClose={() => setOpen(false)}>
              <div className="space-y-3"><Alert>{add.error}</Alert>
                <Field label="Business name" htmlFor="pbn"><Input id="pbn" value={v.business_name} onChange={f('business_name')} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Contact" htmlFor="pcn"><Input id="pcn" value={v.contact_name} onChange={f('contact_name')} /></Field>
                  <Field label="Phone" htmlFor="pph"><Input id="pph" value={v.phone} onChange={f('phone')} /></Field>
                  <Field label="Email" htmlFor="pem"><Input id="pem" type="email" value={v.email} onChange={f('email')} /></Field>
                  <Field label="Source" hint="walk-in, referral, social…" htmlFor="pso"><Input id="pso" value={v.source} onChange={f('source')} /></Field>
                </div>
                <Field label="Address" htmlFor="pad"><Input id="pad" value={v.address} onChange={f('address')} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Next action" htmlFor="pna"><Input id="pna" value={v.next_action} onChange={f('next_action')} /></Field>
                  <Field label="When" htmlFor="pnw"><Input id="pnw" type="datetime-local" value={v.next_action_at} onChange={f('next_action_at')} /></Field>
                </div>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button busy={add.busy} disabled={v.business_name.length < 2} onClick={() => add.run(reload)}>Add</Button></div></div>
            </Modal>
          )}
        </>
      )}</Fetch>
    </Need>
  )
}

const blankActivity = { kind: 'call', note: '', next_action: '', next_action_at: '' }

export function ProspectDetail() {
  const { id } = useParams()
  const [v, setV] = useState(blankActivity)
  const f = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const act = useAction(async (fn, ok, reload) => { await fn(); toast(ok); reload() })
  return (
    <Need perm={['crm.manage']} what="the vendor sales pipeline">
      <Fetch path={`/admin/crm/prospects/${id}`}>{(p, reload) => (
        <>
          <PageHeader title={p.business_name} sub={<><Badge tone="blue">{p.stage}</Badge> · <Link className="text-primary-700 underline" to="/crm">Pipeline</Link></>}
            actions={<Select aria-label="Stage" value={p.stage} onChange={(e) => act.run(() => patch(`/admin/crm/prospects/${id}`, { stage: e.target.value }), 'Stage updated', reload)}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>} />
          <Alert>{act.error}</Alert>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Details"><dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
              {[['Contact', p.contact_name], ['Phone', p.phone], ['Email', p.email], ['Address', p.address], ['Source', p.source], ['Last contact', p.last_contact_at ? fmtDateTime(p.last_contact_at) : 'Never'],
                ['Next action', p.next_action ? `${p.next_action}${p.next_action_at ? ' · ' + fmtDateTime(p.next_action_at) : ''}` : null], ...(p.launched_at ? [['Launched', fmtDateTime(p.launched_at)]] : [])]
                .map(([k, val]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd>{val || '—'}</dd></div>)}</dl></Card>
            <Card title="Log an activity"><div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                <Field label="Type" htmlFor="ak"><Select id="ak" value={v.kind} onChange={f('kind')}><option value="call">Call</option><option value="visit">Visit</option><option value="email">Email</option><option value="demo">Demo</option><option value="note">Note</option></Select></Field>
                <Field label="Next action" htmlFor="ana"><Input id="ana" value={v.next_action} onChange={f('next_action')} /></Field>
                <Field label="When" htmlFor="anw"><Input id="anw" type="datetime-local" value={v.next_action_at} onChange={f('next_action_at')} /></Field>
              </div>
              <Field label="What happened" htmlFor="an"><Textarea id="an" value={v.note} onChange={f('note')} /></Field>
              <Button busy={act.busy} disabled={!v.note.trim()} onClick={async () => {
                await act.run(() => post(`/admin/crm/prospects/${id}/activities`, { kind: v.kind, note: v.note, next_action: v.next_action || undefined, next_action_at: iso(v.next_action_at) }), 'Activity logged', reload); setV(blankActivity)
              }}>Save activity</Button></div></Card>
          </div>
          <Card title="History">
            {p.activities.map((a) => <div key={a.id} className="border-b border-gray-100 py-2 text-sm last:border-0"><div className="text-xs text-gray-500">{a.kind} · {a.by ?? 'System'} · {fmtDateTime(a.created_at)}</div>{a.note}</div>)}
            {!p.activities.length && <p className="text-sm text-gray-500">No activity yet.</p>}
          </Card>
        </>
      )}</Fetch>
    </Need>
  )
}
