import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmtDate } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, Confirm, DataTable, ErrorBox, Field, Input, Loading, Modal, Notice, PageHeader, Select, Textarea, del, post, put } from './kit';

const STATUS: Record<string, 'neutral' | 'ok' | 'warn' | 'info'> = { draft: 'neutral', scheduled: 'info', sending: 'warn', sent: 'ok', cancelled: 'neutral' };

export function EmailList() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useApi<any[]>('/marketing/emails');
  const create = useAction(async () => { const r = await post<{ id: string }>('/marketing/emails', { name: 'Untitled email', subject: 'Hello {{first_name}}', body: 'Hi {{first_name}},\n\n\n\nSee what is new: {{link:/deals}}', ab_percent_b: 50 }); nav(`/marketing/emails/${r.id}`); });
  return (
    <>
      <PageHeader title="Email campaigns" sub="One-off emails to people who agreed to receive them." actions={<span className="row"><Link className="btn secondary sm" to="/marketing/templates">Templates</Link><Button size="sm" busy={create.busy} onClick={() => create.run()}>New email</Button></span>} />
      {loading && !data && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && <DataTable rows={data} rowKey={(r: any) => r.id} empty="No emails yet." columns={[
        { key: 'n', header: 'Name', render: (r: any) => <Link to={`/marketing/emails/${r.id}`}><strong>{r.name}</strong></Link> }, { key: 's', header: 'Status', render: (r: any) => <Badge tone={STATUS[r.status]}>{r.status}</Badge> },
        { key: 'a', header: 'Audience', render: (r: any) => r.segment ?? 'All opted-in customers' }, { key: 'w', header: 'When', render: (r: any) => fmtDate(r.queued_at ?? r.scheduled_at ?? r.created_at) },
        { key: 'r', header: 'Recipients', render: (r: any) => r.recipients || '—' }, { key: 'c', header: 'Clicked', render: (r: any) => (r.recipients ? `${r.clickers}` : '—') }]} />}
    </>
  );
}

const HELP = [['{{first_name}}', 'First name'], ['{{link:/deals}}', 'Tracked link to a page'], ['{{link:/kitchens}}', 'Link to Home chefs']];

export function EmailEditor() {
  const { id } = useParams(); const toast = useToast(); const nav = useNavigate();
  const e = useApi<any>(`/marketing/emails/${id}`);
  const segs = useApi<any[]>('/marketing/segments'); const camps = useApi<any[]>('/marketing/campaigns'); const tpls = useApi<any[]>('/marketing/templates');
  const [f, setF] = useState<any>(null); const [prev, setPrev] = useState<any>(null); const [at, setAt] = useState('');
  useEffect(() => { if (e.data) setF(e.data); }, [e.data]);
  const locked = f && !['draft', 'scheduled'].includes(f.status);
  const payload = () => ({ name: f.name, subject: f.subject, subject_b: f.subject_b || null, ab_percent_b: f.ab_percent_b, body: f.body, segment_id: f.segment_id || null, campaign_id: f.campaign_id || null });
  const save = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); toast('Saved'); e.reload(); });
  const preview = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); setPrev(await api(`/marketing/emails/${id}/preview`)); });
  const test = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); const r = await post<{ to: string }>(`/marketing/emails/${id}/test`); toast(`Test sent to ${r.to}`); });
  const send = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); const r = await post<{ recipients: number }>(`/marketing/emails/${id}/send`); toast(`Queued for ${r.recipients} people`); e.reload(); });
  const schedule = useAction(async () => { await put(`/marketing/emails/${id}`, payload()); await post(`/marketing/emails/${id}/schedule`, { at: new Date(at).toISOString() }); toast('Scheduled'); e.reload(); });
  const cancel = useAction(async () => { await post(`/marketing/emails/${id}/cancel`); toast('Schedule cancelled'); e.reload(); });
  const remove = useAction(async () => { await del(`/marketing/emails/${id}`); nav('/marketing/emails'); });
  const asTemplate = useAction(async () => { await post('/marketing/templates', { name: f.name, subject: f.subject, body: f.body }); toast('Saved as a template'); tpls.reload(); });
  if (e.loading && !f) return <Loading />;
  if (e.error) return <ErrorBox message={e.error} retry={e.reload} />;
  if (!f) return null;
  const set = (k: string) => (ev: any) => setF({ ...f, [k]: ev.target.value });
  const err = save.error || preview.error || test.error || send.error || schedule.error || cancel.error || remove.error;
  return (
    <>
      <PageHeader title={f.name} sub={<><Badge tone={STATUS[f.status]}>{f.status}</Badge> · <Link to="/marketing/emails">All emails</Link></>} />
      {err && <Notice tone="error">{err}</Notice>}
      {locked && <Notice>This email has been sent and can no longer be edited. {f.recipients} recipients.</Notice>}
      {f.status === 'sent' && <Stats id={id!} />}
      <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>
        <Card>
          <div className="form-grid">
            <Field label="Internal name"><Input value={f.name} onChange={set('name')} maxLength={100} /></Field>
            <Field label="Audience" hint="Only people who agreed to marketing email are ever included."><Select value={f.segment_id ?? ''} onChange={set('segment_id')}><option value="">All opted-in customers</option>{segs.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Part of campaign (optional)"><Select value={f.campaign_id ?? ''} onChange={set('campaign_id')}><option value="">None</option>{camps.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Start from a template"><Select value="" onChange={(ev) => { const t = tpls.data?.find((x) => x.id === ev.target.value); if (t) setF({ ...f, subject: t.subject, body: t.body }); }}><option value="">Choose…</option>{tpls.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          </div>
          <Field label="Subject"><Input value={f.subject} onChange={set('subject')} maxLength={150} /></Field>
          <div className="form-grid">
            <Field label="Subject B (optional, for an A/B test)"><Input value={f.subject_b ?? ''} onChange={set('subject_b')} maxLength={150} /></Field>
            <Field label="Share who get B (%)"><Input type="number" min={0} max={100} value={f.ab_percent_b} onChange={(ev) => setF({ ...f, ab_percent_b: Number(ev.target.value) })} disabled={!f.subject_b} /></Field>
          </div>
          <Field label="Message (plain text)" hint="The sender name, postal address and an unsubscribe link are added at the bottom automatically."><Textarea value={f.body} onChange={set('body')} maxLength={8000} style={{ minHeight: 220 }} /></Field>
          <div className="row wrap small">{HELP.map(([code, l]) => <Button key={code} type="button" size="sm" variant="ghost" onClick={() => setF({ ...f, body: `${f.body}${code}` })} title={l}>{code}</Button>)}<span className="muted">Click to add at the end</span></div>
        </Card>
      </fieldset>
      {!locked && (
        <div className="row wrap">
          <Button busy={save.busy} onClick={() => save.run()}>Save draft</Button>
          <Button variant="secondary" busy={preview.busy} onClick={() => preview.run()}>Preview</Button>
          <Button variant="secondary" busy={test.busy} onClick={() => test.run()}>Send a test to me</Button>
          <Button variant="secondary" size="sm" busy={asTemplate.busy} onClick={() => asTemplate.run()}>Save as template</Button>
          <span className="grow" />
          <Confirm variant="primary" message="Send this email now to everyone in the audience who has agreed to marketing email? This cannot be undone." onConfirm={() => send.run()}>Send now…</Confirm>
        </div>
      )}
      {!locked && <Card><h3>Schedule</h3><div className="row wrap top"><Field label="Send at (your time)"><Input type="datetime-local" value={at} onChange={(ev) => setAt(ev.target.value)} /></Field>
        <Button variant="secondary" style={{ marginTop: 24 }} disabled={!at} busy={schedule.busy} onClick={() => schedule.run()}>Schedule</Button>
        {f.status === 'scheduled' && <><span style={{ marginTop: 28 }}>Scheduled for <strong>{fmtDate(f.scheduled_at)}</strong></span><Button style={{ marginTop: 24 }} variant="ghost" onClick={() => cancel.run()}>Cancel schedule</Button></>}</div></Card>}
      {!locked && f.status === 'draft' && <p><Confirm size="sm" message="Delete this draft?" onConfirm={() => remove.run()}>Delete draft</Confirm></p>}
      <Modal open={!!prev} onClose={() => setPrev(null)} title="Preview">
        {prev && <><p className="muted small">Shown as it would arrive to you. Links are tracked; the footer is added automatically.</p><p><strong>Subject:</strong> {prev.subject}</p>{prev.subject_b && <p><strong>Subject B:</strong> {prev.subject_b}</p>}<pre className="json" style={{ maxHeight: 360, whiteSpace: 'pre-wrap' }}>{prev.body}</pre></>}
      </Modal>
    </>
  );
}

function Stats({ id }: { id: string }) {
  const { data } = useApi<any>(`/marketing/emails/${id}/stats`);
  if (!data) return null;
  return (
    <Card><h3>Results</h3>
      <DataTable rows={data.variants} rowKey={(r: any) => r.variant} columns={[{ key: 'v', header: 'Version', render: (r: any) => r.variant.toUpperCase() }, { key: 'q', header: 'Queued', render: (r: any) => r.queued }, { key: 's', header: 'Sent', render: (r: any) => r.sent },
        { key: 'f', header: 'Failed', render: (r: any) => r.failed }, { key: 'k', header: 'Skipped (no consent)', render: (r: any) => r.skipped }, { key: 'c', header: 'Clicked', render: (r: any) => r.clickers }, { key: 'u', header: 'Unsubscribed', render: (r: any) => r.unsubscribed }]} />
      <p className="muted small">{data.note}</p></Card>
  );
}

export function Templates() {
  const toast = useToast();
  const { data, reload } = useApi<any[]>('/marketing/templates');
  const [edit, setEdit] = useState<any>(null);
  const save = useAction(async () => { if (edit.id) await put(`/marketing/templates/${edit.id}`, edit); else await post('/marketing/templates', edit); toast('Saved'); setEdit(null); reload(); });
  const remove = useAction(async (id: string) => { await del(`/marketing/templates/${id}`); reload(); });
  return (
    <>
      <PageHeader title="Email templates" sub="Reusable subject and message." actions={<span className="row"><Link className="btn secondary sm" to="/marketing/emails">Emails</Link><Button size="sm" onClick={() => setEdit({ name: '', subject: '', body: '' })}>New template</Button></span>} />
      <DataTable rows={data ?? []} rowKey={(r: any) => r.id} empty="No templates." columns={[{ key: 'n', header: 'Name', render: (r: any) => <strong>{r.name}</strong> }, { key: 's', header: 'Subject' }, { key: 'x', header: '', render: (r: any) => <span className="row"><Button size="sm" variant="secondary" onClick={() => setEdit(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove.run(r.id)}>Delete</Button></span> }]} />
      {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit template' : 'New template'}>
        {save.error && <Notice tone="error">{save.error}</Notice>}
        <Field label="Name"><Input value={edit.name} onChange={(ev) => setEdit({ ...edit, name: ev.target.value })} /></Field>
        <Field label="Subject"><Input value={edit.subject} onChange={(ev) => setEdit({ ...edit, subject: ev.target.value })} /></Field>
        <Field label="Message"><Textarea value={edit.body} onChange={(ev) => setEdit({ ...edit, body: ev.target.value })} style={{ minHeight: 180 }} /></Field>
        <div className="row end"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={edit.name.length < 2 || !edit.subject || !edit.body} onClick={() => save.run()}>Save</Button></div>
      </Modal>}
    </>
  );
}
