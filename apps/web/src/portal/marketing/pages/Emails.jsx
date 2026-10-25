import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { useApi, useAction, toast } from '../../shared/hooks'
import { get, post, put, del, fmtDate, fmtDateTime } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea, confirmThen } from '../../shared/ui'

export function EmailList() {
  const nav = useNavigate()
  const { data, loading, error } = useApi('/marketing/emails')
  const create = useAction(async () => { const r = await post('/marketing/emails', { name: 'Untitled email', subject: 'Hello {{first_name}}', body: 'Hi {{first_name}},\n\n\n\nSee what is new: {{link:/deals}}', ab_percent_b: 50 }); nav(`/emails/${r.id}`) })
  return (
    <>
      <PageHeader title="Email Campaigns" sub="One-off emails to people who agreed to receive them."
        actions={<><Link to="/email-templates" className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50"><FileText className="h-4 w-4" /> Templates</Link><Button busy={create.busy} onClick={() => create.run()}><Plus className="h-4 w-4" /> Create Campaign</Button></>} />
      <Alert>{error || create.error}</Alert>
      {loading && !data ? <Spinner className="h-40" /> : (
        <DataTable rows={data ?? []} empty="No emails yet." columns={[
          { key: 'n', header: 'Name', render: (r) => <Link to={`/emails/${r.id}`} className="font-medium text-primary-700 hover:underline">{r.name}</Link> }, { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'a', header: 'Audience', render: (r) => r.segment ?? 'All opted-in customers' }, { key: 'w', header: 'When', render: (r) => fmtDate(r.queued_at ?? r.scheduled_at ?? r.created_at) },
          { key: 'r', header: 'Recipients', render: (r) => r.recipients || '—' }, { key: 'c', header: 'Clicked', render: (r) => (r.recipients ? r.clickers : '—') }]} />
      )}
    </>
  )
}

const HELP = [['{{first_name}}', 'First name'], ['{{link:/deals}}', 'Tracked link to a page'], ['{{link:/kitchens}}', 'Link to Home chefs']]

export function EmailEditor() {
  const { id } = useParams(); const nav = useNavigate()
  const e = useApi(`/marketing/emails/${id}`)
  const segs = useApi('/marketing/segments'); const camps = useApi('/marketing/campaigns'); const tpls = useApi('/marketing/templates')
  const [f, setF] = useState(null); const [prev, setPrev] = useState(null); const [at, setAt] = useState('')
  useEffect(() => { if (e.data) setF(e.data) }, [e.data])
  const locked = f && !['draft', 'scheduled'].includes(f.status)
  const payload = () => ({ name: f.name, subject: f.subject, subject_b: f.subject_b || null, ab_percent_b: f.ab_percent_b, body: f.body, segment_id: f.segment_id || null, campaign_id: f.campaign_id || null })
  const save = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); toast('Saved'); e.reload() })
  const preview = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); setPrev(await get(`/marketing/emails/${id}/preview`)) })
  const test = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); const r = await post(`/marketing/emails/${id}/test`); toast(`Test sent to ${r.to}`) })
  const send = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); const r = await post(`/marketing/emails/${id}/send`); toast(`Queued for ${r.recipients} people`); e.reload() })
  const schedule = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); await post(`/marketing/emails/${id}/schedule`, { at: new Date(at).toISOString() }); toast('Scheduled'); e.reload() })
  const cancel = useAction(async () => { await post(`/marketing/emails/${id}/cancel`); toast('Schedule cancelled'); e.reload() })
  const remove = useAction(async () => { await del(`/marketing/emails/${id}`); nav('/emails') })
  const asTemplate = useAction(async () => { await post('/marketing/templates', { name: f.name, subject: f.subject, body: f.body }); toast('Saved as a template'); tpls.reload() })
  if (e.loading && !f) return <Spinner />
  if (e.error) return <Alert>{e.error}</Alert>
  if (!f) return null
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value })
  const err = save.error || preview.error || test.error || send.error || schedule.error || cancel.error || remove.error
  return (
    <>
      <Link to="/emails" className="text-primary-600 hover:text-primary-700 text-sm">← Back to Email Campaigns</Link>
      <PageHeader title={f.name} sub={<StatusBadge status={f.status} />} />
      <Alert>{err}</Alert>
      {locked && <Alert tone="info">This email has been sent and can no longer be edited. {f.recipients} recipients.</Alert>}
      {f.status === 'sent' && <Results id={id} />}
      <fieldset disabled={locked} className="border-0 p-0 m-0 space-y-3">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Internal name" htmlFor="name"><Input id="name" value={f.name} onChange={set('name')} maxLength={100} /></Field>
            <Field label="Audience" htmlFor="seg" hint="Only people who agreed to marketing email are ever included."><Select id="seg" value={f.segment_id ?? ''} onChange={set('segment_id')}><option value="">All opted-in customers</option>{segs.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Part of campaign (optional)" htmlFor="camp"><Select id="camp" value={f.campaign_id ?? ''} onChange={set('campaign_id')}><option value="">None</option>{camps.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Start from a template" htmlFor="tpl"><Select id="tpl" value="" onChange={(ev) => { const t = tpls.data?.find((x) => x.id === ev.target.value); if (t) setF({ ...f, subject: t.subject, body: t.body }) }}><option value="">Choose…</option>{tpls.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          </div>
          <Field label="Subject" htmlFor="subj" className="mt-4"><Input id="subj" value={f.subject} onChange={set('subject')} maxLength={150} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Subject B (optional, for an A/B test)" htmlFor="subjb"><Input id="subjb" value={f.subject_b ?? ''} onChange={set('subject_b')} maxLength={150} /></Field>
            <Field label="Share who get B (%)" htmlFor="pctb"><Input id="pctb" type="number" min={0} max={100} value={f.ab_percent_b} onChange={(ev) => setF({ ...f, ab_percent_b: Number(ev.target.value) })} disabled={!f.subject_b} /></Field>
          </div>
          <Field label="Message (plain text)" htmlFor="body" hint="The sender name, postal address and an unsubscribe link are added at the bottom automatically." className="mt-4"><Textarea id="body" rows={10} value={f.body} onChange={set('body')} maxLength={8000} /></Field>
          <div className="flex flex-wrap items-center gap-1 mt-2 text-xs">{HELP.map(([code, l]) => <Button key={code} size="sm" variant="ghost" title={l} onClick={() => setF({ ...f, body: `${f.body}${code}` })}>{code}</Button>)}<span className="text-gray-500">Click to add at the end</span></div>
        </Card>
      </fieldset>
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button busy={save.busy} onClick={() => save.run()}>Save draft</Button>
          <Button variant="secondary" busy={preview.busy} onClick={() => preview.run()}>Preview</Button>
          <Button variant="secondary" busy={test.busy} onClick={() => test.run()}>Send a test to me</Button>
          <Button variant="secondary" size="sm" busy={asTemplate.busy} onClick={() => asTemplate.run()}>Save as template</Button>
          <span className="flex-1" />
          <Button variant="success" busy={send.busy} onClick={confirmThen('Send this email now to everyone in the audience who has agreed to marketing email? This cannot be undone.', () => send.run())}>Send now…</Button>
        </div>
      )}
      {!locked && (
        <Card title="Schedule">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Send at (your time)" htmlFor="at"><Input id="at" type="datetime-local" value={at} onChange={(ev) => setAt(ev.target.value)} /></Field>
            <Button variant="secondary" disabled={!at} busy={schedule.busy} onClick={() => schedule.run()}>Schedule</Button>
            {f.status === 'scheduled' && <><span className="text-sm">Scheduled for <strong>{fmtDateTime(f.scheduled_at)}</strong></span><Button variant="ghost" onClick={() => cancel.run()}>Cancel schedule</Button></>}
          </div>
        </Card>
      )}
      {!locked && f.status === 'draft' && <div><Button size="sm" variant="ghost" onClick={confirmThen('Delete this draft?', () => remove.run())}>Delete draft</Button></div>}
      {prev && (
        <Modal title="Preview" onClose={() => setPrev(null)}>
          <p className="text-xs text-gray-500 mb-2">Shown as it would arrive to you. Links are tracked; the footer is added automatically.</p>
          <p className="text-sm"><strong>Subject:</strong> {prev.subject}</p>{prev.subject_b && <p className="text-sm"><strong>Subject B:</strong> {prev.subject_b}</p>}
          <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-auto">{prev.body}</pre>
        </Modal>
      )}
    </>
  )
}

function Results({ id }) {
  const { data } = useApi(`/marketing/emails/${id}/stats`)
  if (!data) return null
  return (
    <Card title="Results">
      <DataTable rows={data.variants} rowKey={(r) => r.variant} columns={[{ key: 'v', header: 'Version', render: (r) => r.variant.toUpperCase() }, { key: 'q', header: 'Queued', render: (r) => r.queued }, { key: 's', header: 'Sent', render: (r) => r.sent },
        { key: 'f', header: 'Failed', render: (r) => r.failed }, { key: 'k', header: 'Skipped (no consent)', render: (r) => r.skipped }, { key: 'c', header: 'Clicked', render: (r) => r.clickers }, { key: 'u', header: 'Unsubscribed', render: (r) => r.unsubscribed }]} />
      <p className="text-xs text-gray-500 mt-2">{data.note}</p>
    </Card>
  )
}

export function Templates() {
  const { data, reload } = useApi('/marketing/templates')
  const [edit, setEdit] = useState(null)
  const save = useAction(async () => { if (edit.id) await put(`/marketing/templates/${edit.id}`, edit); else await post('/marketing/templates', edit); toast('Saved'); setEdit(null); reload() })
  const remove = useAction(async (id) => { await del(`/marketing/templates/${id}`); reload() })
  return (
    <>
      <PageHeader title="Email Templates" sub="Reusable subject and message." actions={<Button onClick={() => setEdit({ name: '', subject: '', body: '' })}><Plus className="h-4 w-4" /> Create Template</Button>} />
      <DataTable rows={data ?? []} empty="No templates." columns={[{ key: 'n', header: 'Name', render: (r) => <strong>{r.name}</strong> }, { key: 'subject', header: 'Subject', nowrap: false },
        { key: 'x', header: '', right: true, render: (r) => <span className="inline-flex gap-1"><Button size="sm" variant="secondary" onClick={() => setEdit(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={confirmThen('Delete this template?', () => remove.run(r.id))}>Delete</Button></span> }]} />
      {edit && (
        <Modal title={edit.id ? 'Edit template' : 'New template'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Alert>{save.error}</Alert>
            <Field label="Name" htmlFor="tn"><Input id="tn" value={edit.name} onChange={(ev) => setEdit({ ...edit, name: ev.target.value })} /></Field>
            <Field label="Subject" htmlFor="ts"><Input id="ts" value={edit.subject} onChange={(ev) => setEdit({ ...edit, subject: ev.target.value })} /></Field>
            <Field label="Message" htmlFor="tb"><Textarea id="tb" rows={8} value={edit.body} onChange={(ev) => setEdit({ ...edit, body: ev.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={edit.name.length < 2 || !edit.subject || !edit.body} onClick={() => save.run()}>Save</Button></div>
          </div>
        </Modal>
      )}
      <span hidden><Badge /></span>
    </>
  )
}
