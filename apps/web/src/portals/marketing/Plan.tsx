import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtDate, money } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, DataTable, Field, ImageUpload, Input, Modal, Notice, PageHeader, Select, Stat, Textarea, del, post, put } from './kit';

// ---------- Calendar of festivals and occasions ----------
export function Calendar() {
  const nav = useNavigate(); const toast = useToast();
  const { data } = useApi<any[]>('/marketing/occasions');
  const plan = useAction(async (o: any) => {
    const r = await post<{ id: string }>('/marketing/campaigns', { name: `${o.name} ${o.next_start.slice(0, 4)}`, objective: `Plan for ${o.name}`, starts_on: o.next_start, ends_on: o.next_end, theme_id: o.id, status: 'planned' });
    toast('Campaign created'); nav('/marketing/campaigns'); void r;
  });
  return (
    <>
      <PageHeader title="Calendar" sub="Upcoming festivals and holidays, from the Storefront studio themes. Plan ahead: moving festivals hold their next dates only." />
      {plan.error && <Notice tone="error">{plan.error}</Notice>}
      <DataTable rows={data ?? []} rowKey={(r: any) => r.slug} columns={[
        { key: 'n', header: 'Occasion', render: (r: any) => <><span aria-hidden="true">{r.emoji} </span><strong>{r.name}</strong> {r.moves && <Badge tone="warn">Dates move yearly</Badge>}</> },
        { key: 'd', header: 'When', render: (r: any) => `${r.next_start} → ${r.next_end}` }, { key: 'u', header: 'In', render: (r: any) => (r.days_until <= 0 ? <Badge tone="ok">On now</Badge> : `${r.days_until} days`) },
        { key: 't', header: 'Shop theme', render: (r: any) => <Badge tone={r.status === 'off' ? 'neutral' : 'info'}>{r.status}</Badge> },
        { key: 'x', header: '', render: (r: any) => <span className="row"><Button size="sm" variant="secondary" busy={plan.busy} onClick={() => plan.run(r)}>Plan a campaign</Button><Link className="btn ghost sm" to="/admin/studio">Studio</Link></span> }]} />
    </>
  );
}

// ---------- Social planner ----------
const PLAT = ['instagram', 'facebook', 'tiktok', 'x', 'whatsapp', 'other'];
export function Social() {
  const toast = useToast();
  const { data, reload } = useApi<any[]>('/marketing/social');
  const [edit, setEdit] = useState<any>(null);
  const save = useAction(async () => {
    const b = { platform: edit.platform, caption: edit.caption, image_url: edit.image_url, link: edit.link || null, scheduled_for: edit.when ? new Date(edit.when).toISOString() : null, status: edit.status };
    if (edit.id) await put(`/marketing/social/${edit.id}`, b); else await post('/marketing/social', b);
    toast('Saved'); setEdit(null); reload();
  });
  const mark = useAction(async (p: any) => { await put(`/marketing/social/${p.id}`, { platform: p.platform, caption: p.caption, image_url: p.image_url, link: p.link, scheduled_for: p.scheduled_for, status: 'posted', campaign_id: p.campaign_id }); reload(); });
  const remove = useAction(async (id: string) => { await del(`/marketing/social/${id}`); reload(); });
  const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  return (
    <>
      <PageHeader title="Social posts" sub="Plan captions and dates. Posting is done by hand on each platform (there are no connections to them yet)." actions={<Button size="sm" onClick={() => setEdit({ platform: 'instagram', caption: '', image_url: null, link: '', when: '', status: 'draft' })}>New post</Button>} />
      <DataTable rows={data ?? []} rowKey={(r: any) => r.id} empty="No posts planned." columns={[
        { key: 'p', header: 'Platform', render: (r: any) => <strong style={{ textTransform: 'capitalize' }}>{r.platform}</strong> }, { key: 'c', header: 'Caption', render: (r: any) => <span>{r.caption.slice(0, 90)}{r.caption.length > 90 ? '…' : ''}</span> },
        { key: 'w', header: 'When', render: (r: any) => (r.scheduled_for ? fmtDate(r.scheduled_for) : '—') }, { key: 's', header: 'Status', render: (r: any) => <Badge tone={r.status === 'posted' ? 'ok' : r.status === 'scheduled' ? 'info' : 'neutral'}>{r.status}</Badge> },
        { key: 'x', header: '', render: (r: any) => <span className="row"><Button size="sm" variant="secondary" onClick={() => setEdit({ ...r, when: local(r.scheduled_for), link: r.link ?? '' })}>Edit</Button>{r.status !== 'posted' && <Button size="sm" variant="ghost" onClick={() => mark.run(r)}>Mark posted</Button>}<Button size="sm" variant="ghost" onClick={() => remove.run(r.id)}>Delete</Button></span> }]} />
      {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit post' : 'New post'}>
        {save.error && <Notice tone="error">{save.error}</Notice>}
        <div className="form-grid">
          <Field label="Platform"><Select value={edit.platform} onChange={(e) => setEdit({ ...edit, platform: e.target.value })}>{PLAT.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Status"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="posted">Posted</option></Select></Field>
          <Field label="Post on"><Input type="datetime-local" value={edit.when} onChange={(e) => setEdit({ ...edit, when: e.target.value })} /></Field>
          <Field label="Link (optional)" hint="https://… or a page like /deals"><Input value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></Field>
        </div>
        <Field label="Caption"><Textarea value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} maxLength={2200} style={{ minHeight: 120 }} /></Field>
        <span className="label" style={{ fontWeight: 600 }}>Picture (optional)</span><ImageUpload value={edit.image_url} onChange={(u) => setEdit({ ...edit, image_url: u })} label="Post picture" />
        <div className="row end"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={!edit.caption.trim()} onClick={() => save.run()}>Save</Button></div>
      </Modal>}
    </>
  );
}

// ---------- Budget ----------
export function Budget() {
  const toast = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, reload } = useApi<any>(`/marketing/budget?month=${month}`);
  const [exp, setExp] = useState({ on_date: `${month}-01`, channel: 'email', amount: '', note: '' });
  const setBudget = useAction(async (channel: string, dollars: string) => { await put('/marketing/budget', { month, channel, budget_cents: Math.round(Number(dollars || 0) * 100) }); toast('Budget saved'); reload(); });
  const add = useAction(async () => { await post('/marketing/expenses', { on_date: exp.on_date, channel: exp.channel, amount_cents: Math.round(Number(exp.amount) * 100), note: exp.note || null }); toast('Expense recorded'); setExp({ ...exp, amount: '', note: '' }); reload(); });
  const remove = useAction(async (id: string) => { await del(`/marketing/expenses/${id}`); reload(); });
  const total = data?.channels.reduce((a: any, c: any) => ({ b: a.b + c.budget_cents, s: a.s + c.actual_cents }), { b: 0, s: 0 });
  return (
    <>
      <PageHeader title="Budget" sub="Plan the month, record what you spend, and compare." />
      <div className="row wrap top"><Field label="Month"><Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setExp({ ...exp, on_date: `${e.target.value}-01` }); }} /></Field></div>
      {data && <>
        <div className="grid cols-3"><Stat label="Budget" value={money(total.b)} /><Stat label="Spent (recorded + measured)" value={money(total.s)} /><Stat label="Left" value={money(total.b - total.s)} sub={total.s > total.b ? 'Over budget' : undefined} /></div>
        <DataTable rows={data.channels} rowKey={(r: any) => r.channel} columns={[
          { key: 'c', header: 'Channel', render: (r: any) => <strong style={{ textTransform: 'capitalize' }}>{r.channel}</strong> },
          { key: 'b', header: 'Budget (CAD)', render: (r: any) => <Input type="number" min={0} step="1" defaultValue={(r.budget_cents / 100).toFixed(0)} aria-label={`${r.channel} budget`} style={{ maxWidth: 110 }} onBlur={(e) => { if (Math.round(Number(e.target.value) * 100) !== r.budget_cents) setBudget.run(r.channel, e.target.value); }} /> },
          { key: 'r', header: 'Recorded', render: (r: any) => money(r.recorded_cents) }, { key: 'm', header: 'Measured automatically', render: (r: any) => (r.measured_cents ? money(r.measured_cents) : '—') },
          { key: 'a', header: 'Spent', render: (r: any) => <strong className={r.budget_cents && r.actual_cents > r.budget_cents ? 'warnc' : ''}>{money(r.actual_cents)}</strong> }]} />
        <p className="muted small">{data.note}</p>
        <Card><h3>Record an expense</h3>{add.error && <Notice tone="error">{add.error}</Notice>}
          <div className="row wrap top">
            <Field label="Date"><Input type="date" value={exp.on_date} onChange={(e) => setExp({ ...exp, on_date: e.target.value })} /></Field>
            <Field label="Channel"><Select value={exp.channel} onChange={(e) => setExp({ ...exp, channel: e.target.value })}>{['email', 'ads', 'coupons', 'social', 'events', 'other'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (CAD)"><Input type="number" min={0} step="0.01" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} /></Field>
            <Field label="Note"><Input value={exp.note} onChange={(e) => setExp({ ...exp, note: e.target.value })} maxLength={200} /></Field>
            <Button style={{ marginTop: 24 }} busy={add.busy} disabled={!(Number(exp.amount) > 0)} onClick={() => add.run()}>Add</Button>
          </div></Card>
        <DataTable rows={data.expenses} rowKey={(r: any) => r.id} empty="No expenses recorded this month." columns={[{ key: 'd', header: 'Date', render: (r: any) => r.on_date }, { key: 'c', header: 'Channel' }, { key: 'a', header: 'Amount', render: (r: any) => money(r.amount_cents) }, { key: 'n', header: 'Note', render: (r: any) => r.note ?? '' }, { key: 'x', header: '', render: (r: any) => <Button size="sm" variant="ghost" onClick={() => remove.run(r.id)}>Delete</Button> }]} />
      </>}
    </>
  );
}

// ---------- Asset library ----------
export function Library() {
  const toast = useToast();
  const { data, reload } = useApi<any[]>('/marketing/assets');
  const [f, setF] = useState<{ title: string; url: string | null; tags: string }>({ title: '', url: null, tags: '' });
  const add = useAction(async () => { await post('/marketing/assets', { title: f.title, url: f.url, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean) }); toast('Added to the library'); setF({ title: '', url: null, tags: '' }); reload(); });
  const remove = useAction(async (id: string) => { await del(`/marketing/assets/${id}`); reload(); });
  const copy = async (url: string) => { try { await navigator.clipboard.writeText(`${window.location.origin}${url}`); toast('Link copied'); } catch { toast('Copy failed', 'error'); } };
  return (
    <>
      <PageHeader title="Library" sub="Pictures for emails, posts and banners, kept in one place." />
      <Card><h3>Add a picture</h3>{add.error && <Notice tone="error">{add.error}</Notice>}
        <div className="row wrap top"><ImageUpload value={f.url} onChange={(u) => setF({ ...f, url: u })} label="Library picture" />
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} /></Field>
          <Field label="Tags (comma separated)"><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
          <Button style={{ marginTop: 24 }} busy={add.busy} disabled={!f.url || f.title.trim().length < 2} onClick={() => add.run()}>Save</Button></div></Card>
      <ul className="asset-grid" role="list">{data?.map((a) => (
        <li key={a.id} className="asset"><img src={a.url} alt={a.title} loading="lazy" /><strong>{a.title}</strong><span className="small muted">{a.tags.join(', ')}</span>
          <span className="row"><Button size="sm" variant="secondary" onClick={() => copy(a.url)}>Copy link</Button><Button size="sm" variant="ghost" onClick={() => remove.run(a.id)}>Delete</Button></span></li>))}</ul>
      {data && !data.length && <p className="muted">No pictures yet.</p>}
    </>
  );
}
