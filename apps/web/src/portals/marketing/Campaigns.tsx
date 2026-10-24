import { useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, DataTable, Field, Input, Modal, Notice, PageHeader, Select, Textarea, del, post, put } from './kit';

const TONE: Record<string, 'neutral' | 'ok' | 'info' | 'warn'> = { planned: 'info', active: 'ok', finished: 'neutral', cancelled: 'neutral' };

export function Campaigns() {
  const toast = useToast();
  const { data, reload } = useApi<any[]>('/marketing/campaigns');
  const coupons = useApi<any[]>('/admin/coupons'); const themes = useApi<any[]>('/admin/themes');
  const [edit, setEdit] = useState<any>(null); const [res, setRes] = useState<any>(null);
  const save = useAction(async () => {
    const b = { name: edit.name, objective: edit.objective || null, starts_on: edit.starts_on || null, ends_on: edit.ends_on || null, budget_cents: Math.round(Number(edit.budget || 0) * 100), status: edit.status, coupon_id: edit.coupon_id || null, theme_id: edit.theme_id || null, notes: edit.notes || null };
    if (edit.id) await put(`/marketing/campaigns/${edit.id}`, b); else await post('/marketing/campaigns', b);
    toast('Campaign saved'); setEdit(null); reload();
  });
  const remove = useAction(async (id: string) => { await del(`/marketing/campaigns/${id}`); reload(); });
  const open = async (id: string, c: any) => { const { api } = await import('../../api'); setRes({ c, ...(await api<any>(`/marketing/campaigns/${id}/results`)) }); };
  const blank = { name: '', objective: '', starts_on: '', ends_on: '', budget: '', status: 'planned', coupon_id: '', theme_id: '', notes: '' };
  return (
    <>
      <PageHeader title="Campaigns" sub="Group the emails, coupon, theme and spend for one push, and see what happened." actions={<Button size="sm" onClick={() => setEdit(blank)}>New campaign</Button>} />
      <DataTable rows={data ?? []} rowKey={(r: any) => r.id} empty="No campaigns yet." columns={[
        { key: 'n', header: 'Campaign', render: (r: any) => <><strong>{r.name}</strong><div className="small muted">{r.objective}</div></> }, { key: 's', header: 'Status', render: (r: any) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
        { key: 'd', header: 'Dates', render: (r: any) => (r.starts_on ? `${r.starts_on} → ${r.ends_on ?? '…'}` : '—') }, { key: 'b', header: 'Budget', render: (r: any) => money(r.budget_cents) },
        { key: 'c', header: 'Coupon / theme', render: (r: any) => [r.coupon_code, r.theme_name].filter(Boolean).join(' · ') || '—' },
        { key: 'x', header: '', render: (r: any) => <span className="row"><Button size="sm" variant="secondary" onClick={() => open(r.id, r)}>Results</Button><Button size="sm" variant="secondary" onClick={() => setEdit({ ...r, budget: (r.budget_cents / 100).toFixed(2), coupon_id: r.coupon_id ?? '', theme_id: r.theme_id ?? '', starts_on: r.starts_on ?? '', ends_on: r.ends_on ?? '', objective: r.objective ?? '', notes: r.notes ?? '' })}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove.run(r.id)}>Delete</Button></span> }]} />
      {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit campaign' : 'New campaign'}>
        {save.error && <Notice tone="error">{save.error}</Notice>}
        <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={100} /></Field>
        <Field label="Goal (one line)"><Input value={edit.objective} onChange={(e) => setEdit({ ...edit, objective: e.target.value })} maxLength={300} /></Field>
        <div className="form-grid">
          <Field label="Starts"><Input type="date" value={edit.starts_on} onChange={(e) => setEdit({ ...edit, starts_on: e.target.value })} /></Field>
          <Field label="Ends"><Input type="date" value={edit.ends_on} onChange={(e) => setEdit({ ...edit, ends_on: e.target.value })} /></Field>
          <Field label="Budget (CAD)"><Input type="number" min={0} step="0.01" value={edit.budget} onChange={(e) => setEdit({ ...edit, budget: e.target.value })} /></Field>
          <Field label="Status"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{['planned', 'active', 'finished', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Coupon"><Select value={edit.coupon_id} onChange={(e) => setEdit({ ...edit, coupon_id: e.target.value })}><option value="">None</option>{coupons.data?.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}</Select></Field>
          <Field label="Festival / season theme"><Select value={edit.theme_id} onChange={(e) => setEdit({ ...edit, theme_id: e.target.value })}><option value="">None</option>{themes.data?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        </div>
        <Field label="Notes"><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} maxLength={1000} style={{ minHeight: 70 }} /></Field>
        <p className="small muted">Link emails to this campaign from the email editor. Link the theme to run it from the <Link to="/admin/studio">Storefront studio</Link>.</p>
        <div className="row end"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={edit.name.trim().length < 2} onClick={() => save.run()}>Save</Button></div>
      </Modal>}
      {res && <Modal open onClose={() => setRes(null)} title={`Results: ${res.c.name}`}>
        <p><strong>Spent:</strong> {money(res.spent_cents)} of {money(res.budget_cents)} budget (recorded expenses)</p>
        {res.coupon && <p><strong>Coupon:</strong> {res.coupon.redemptions} orders · {money(res.coupon.discount_cents)} in discounts · {money(res.coupon.merchandise_cents)} of items sold</p>}
        <DataTable rows={res.emails} rowKey={(r: any) => r.id} empty="No emails linked yet." columns={[{ key: 'n', header: 'Email', render: (r: any) => <Link to={`/marketing/emails/${r.id}`}>{r.name}</Link> }, { key: 'r', header: 'Sent to', render: (r: any) => r.recipients }, { key: 'c', header: 'Clicked', render: (r: any) => r.clickers }, { key: 'o', header: 'Ordered within 7 days', render: (r: any) => r.ordered_within_7_days }]} />
        <Notice>{res.note}</Notice>
      </Modal>}
    </>
  );
}

export function Automations() {
  const toast = useToast();
  const { data, reload } = useApi<any[]>('/marketing/automations');
  const [edit, setEdit] = useState<any>(null);
  const save = useAction(async (a?: any) => { const x = a ?? edit; await put(`/marketing/automations/${x.id}`, { name: x.name, delay_days: Number(x.delay_days), subject: x.subject, body: x.body, enabled: x.enabled }); toast('Saved'); setEdit(null); reload(); });
  const WHEN: Record<string, string> = { welcome: 'After someone signs up (and has agreed to marketing email)', winback: 'When a customer has not ordered for a while', first_order_followup: 'After a customer’s first order', abandoned_basket: 'When items were left in a basket for a few hours (at most once a week per person)' };
  return (
    <>
      <PageHeader title="Automations" sub="Emails that send themselves. All are off until you turn them on, and only reach people who agreed to marketing." />
      {save.error && <Notice tone="error">{save.error}</Notice>}
      <div className="grid cols-2">
        {data?.map((a) => (
          <Card key={a.id}>
            <div className="row between"><h3 style={{ margin: 0 }}>{a.name}</h3><Badge tone={a.enabled ? 'ok' : 'neutral'}>{a.enabled ? 'On' : 'Off'}</Badge></div>
            <p className="small muted">{WHEN[a.trigger]}{a.delay_days ? `, after ${a.delay_days} day${a.delay_days > 1 ? 's' : ''}` : ''}. Each person gets it at most once every 90 days. Sent so far: {a.sent}.</p>
            <p className="small"><strong>Subject:</strong> {a.subject}</p>
            <div className="row"><Button size="sm" variant="secondary" onClick={() => setEdit({ ...a })}>Edit</Button><Button size="sm" variant={a.enabled ? 'ghost' : 'primary'} onClick={() => save.run({ ...a, enabled: !a.enabled })}>{a.enabled ? 'Turn off' : 'Turn on'}</Button></div>
          </Card>))}
      </div>
      {edit && <Modal open onClose={() => setEdit(null)} title={`Edit: ${edit.name}`}>
        <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
        <Field label="Wait (days)"><Input type="number" min={0} max={365} value={edit.delay_days} onChange={(e) => setEdit({ ...edit, delay_days: e.target.value })} /></Field>
        <Field label="Subject"><Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
        <Field label="Message" hint="Use {{first_name}} and {{link:/deals}}. The footer is added automatically."><Textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} style={{ minHeight: 160 }} /></Field>
        <div className="row end"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run()}>Save</Button></div>
      </Modal>}
    </>
  );
}
