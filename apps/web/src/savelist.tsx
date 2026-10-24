import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post, put } from './api';
import { useAuth } from './auth';
import { useAction, useApi } from './hooks';
import { useToast } from './toast';
import { Button, Input, Select } from './ui';

/** "Save to a list": pick one of your shopping lists (or start a new one). Signed-in customers only. */
export function SaveToList({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const { me } = useAuth(); const toast = useToast();
  const [open, setOpen] = useState(false);
  const lists = useApi<{ id: string; name: string }[]>(open && me ? '/lists' : null);
  const [pick, setPick] = useState(''); const [name, setName] = useState('');
  const save = useAction(async () => {
    let id = pick;
    if (!id || id === 'new') { id = (await post<{ id: string }>('/lists', { name: name.trim() || 'My list' })).id; }
    await put(`/lists/${id}/items`, { slug, quantity: 1 });
    toast('Saved to your list'); setOpen(false); setName(''); lists.reload();
  });
  if (!me) return <Link to={`/signin?next=/p/${slug}`} className={`btn ghost ${compact ? 'sm' : 'sm'}`}>♡ Save to a list</Link>;
  if (!open) return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>♡ Save to a list</button>;
  const none = lists.data && !lists.data.length;
  return (
    <div className="savelist" role="group" aria-label="Save to a list">
      {lists.data && lists.data.length > 0 && <Select aria-label="List" value={pick || lists.data[0].id} onChange={(e) => setPick(e.target.value)}>{lists.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}<option value="new">+ New list…</option></Select>}
      {(none || pick === 'new') && <Input aria-label="New list name" placeholder="List name, e.g. Sunday jollof" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
      <div className="row"><Button size="sm" busy={save.busy} onClick={() => save.run()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
      {save.error && <span className="small warnc">{save.error}</span>}
    </div>
  );
}
