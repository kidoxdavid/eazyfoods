import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Button, Card, DataTable, Field, Input, Modal, Notice, PageHeader, Select, Switch, del, post, put } from './kit';

type Rules = Record<string, number | string | boolean | undefined>;
const FIELDS: [keyof Rules & string, string, string][] = [
  ['min_orders', 'At least this many orders', 'number'], ['max_orders', 'At most this many orders (0 = never ordered)', 'number'], ['days_since_last_order_min', 'Last ordered at least … days ago', 'number'],
  ['days_since_last_order_max', 'Last ordered within … days', 'number'], ['min_spend_cents', 'Spent at least (CAD)', 'money'], ['joined_within_days', 'Joined within … days', 'number'],
];
const describe = (r: Rules) => Object.entries(r).filter(([, v]) => v !== undefined && v !== '' && v !== false).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${k.endsWith('cents') ? `$${Number(v) / 100}` : v === true ? 'yes' : v}`).join(' · ') || 'Everyone who opted in';

export default function Audiences() {
  const toast = useToast();
  const { data, reload } = useApi<any[]>('/marketing/segments');
  const regions = useApi<{ slug: string; name: string }[]>('/regions');
  const [edit, setEdit] = useState<any>(null);
  const [count, setCount] = useState<{ count: number; sample: { first_name: string; email: string }[] } | null>(null);
  useEffect(() => { if (!edit) return; let live = true; const t = setTimeout(() => api('/marketing/segments/preview', { method: 'POST', json: { rules: clean(edit.rules) } }).then((r: any) => live && setCount(r), () => live && setCount(null)), 300); return () => { live = false; clearTimeout(t); }; }, [edit]);
  const save = useAction(async () => { const b = { name: edit.name, description: edit.description || null, rules: clean(edit.rules) }; if (edit.id) await put(`/marketing/segments/${edit.id}`, b); else await post('/marketing/segments', b); toast('Audience saved'); setEdit(null); reload(); });
  const remove = useAction(async (id: string) => { await del(`/marketing/segments/${id}`); reload(); });
  const setRule = (k: string, v: unknown) => setEdit({ ...edit, rules: { ...edit.rules, [k]: v } });
  return (
    <>
      <PageHeader title="Audiences" sub="Saved groups of customers. Everyone in them has agreed to marketing email, always." actions={<Button size="sm" onClick={() => { setEdit({ name: '', description: '', rules: {} }); setCount(null); }}>New audience</Button>} />
      <DataTable rows={data ?? []} rowKey={(r: any) => r.id} empty="No saved audiences yet. Emails without an audience go to everyone who opted in." columns={[
        { key: 'n', header: 'Name', render: (r: any) => <strong>{r.name}</strong> }, { key: 'r', header: 'Who', render: (r: any) => describe(r.rules) },
        { key: 'x', header: '', render: (r: any) => <span className="row"><Button size="sm" variant="secondary" onClick={() => { setEdit({ ...r, rules: { ...r.rules } }); setCount(null); }}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove.run(r.id)}>Delete</Button></span> }]} />
      {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit audience' : 'New audience'}>
        {save.error && <Notice tone="error">{save.error}</Notice>}
        <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={80} /></Field>
        <div className="form-grid">
          {FIELDS.map(([k, label, kind]) => <Field key={k} label={label}><Input type="number" min={0} value={kind === 'money' ? (edit.rules[k] == null ? '' : Number(edit.rules[k]) / 100) : (edit.rules[k] ?? '')} onChange={(e) => setRule(k, e.target.value === '' ? undefined : kind === 'money' ? Math.round(Number(e.target.value) * 100) : Number(e.target.value))} /></Field>)}
          <Field label="Has bought from region"><Select value={String(edit.rules.region ?? '')} onChange={(e) => setRule('region', e.target.value || undefined)}><option value="">Any</option>{regions.data?.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</Select></Field>
        </div>
        <Switch checked={!!edit.rules.kitchen_buyers} label="Has ordered from a home chef" onChange={(v) => setRule('kitchen_buyers', v || undefined)} />
        <Card><strong>{count ? `${count.count} ${count.count === 1 ? 'person' : 'people'} match` : 'Counting…'}</strong>
          {count?.sample.length ? <p className="small muted">For example: {count.sample.map((s) => `${s.first_name} (${s.email})`).join(', ')}</p> : null}</Card>
        <div className="row end"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={edit.name.trim().length < 2} onClick={() => save.run()}>Save audience</Button></div>
      </Modal>}
    </>
  );
}
const clean = (r: Rules) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== '' && v !== false));
