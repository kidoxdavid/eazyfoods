import { useState } from 'react';
import { useAction } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Field, Input, Modal, Notice, PageHeader, StatusBadge } from '../../ui';
import { DataTable, Fetch, Need, post } from './common';

type Row = { id: string; name: string; status: string; allergens: string[] | null; dish_tags: string[]; cuisine: string | null; price_cents: number | null; kitchen: string; kitchen_slug: string; vendor_id: string };

export default function Dishes() {
  const toast = useToast();
  const [hide, setHide] = useState<Row | null>(null); const [reason, setReason] = useState('');
  const act = useAction(async (reload: () => void) => { await post(`/admin/dishes/${hide!.id}/hide`, { reason }); toast('Dish hidden. The cook can see it is hidden.'); setHide(null); setReason(''); reload(); });
  const restore = useAction(async (r: Row, reload: () => void) => { await post(`/admin/dishes/${r.id}/restore`); toast(`${r.name} is back on the menu.`); reload(); });
  return (
    <Need perm={['catalog.manage', 'vendors.manage']} what="home-chef dishes">
      <PageHeader title="Home-chef dishes" sub="Every dish sold by a home kitchen. Hide any dish with a missing or doubtful allergen list." />
      <Fetch path="/admin/dishes">{(rows: Row[], reload) => (
        <>
          <Notice tone="warn">Allergen and dietary labels are declared by the cooks and are not verified by EAZyfoods. Hide a dish if its allergens look wrong; the cook must fix and re-submit it.</Notice>
          <DataTable rows={rows} rowKey={(r) => r.id} empty="No dishes yet." columns={[
            { key: 'n', header: 'Dish', render: (r) => <><strong>{r.name}</strong><div className="small muted">{r.kitchen}{r.cuisine ? ` · ${r.cuisine}` : ''}</div></> },
            { key: 'a', header: 'Allergens', render: (r) => (r.allergens == null ? <Badge tone="danger">Not supplied</Badge> : r.allergens.length ? r.allergens.join(', ').replace(/_/g, ' ') : <span className="muted">None declared</span>) },
            { key: 't', header: 'Labels', render: (r) => r.dish_tags.join(', ').replace(/_/g, ' ') || '—' },
            { key: 'p', header: 'Price', render: (r) => (r.price_cents == null ? '' : `$${(r.price_cents / 100).toFixed(2)}`) },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status === 'dish_live' ? 'live' : 'hidden'} /> },
            { key: 'x', header: '', render: (r) => r.status === 'dish_live' ? <Button size="sm" variant="danger" onClick={() => setHide(r)}>Hide</Button> : <Button size="sm" variant="secondary" onClick={() => restore.run(r, reload)}>Restore</Button> }]} />
          {hide && <Modal open onClose={() => setHide(null)} title={`Hide ${hide.name}`}>
            {act.error && <Notice tone="error">{act.error}</Notice>}
            <Field label="Reason (the cook is told in Messages)"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
            <div className="row end"><Button variant="ghost" onClick={() => setHide(null)}>Cancel</Button><Button variant="danger" busy={act.busy} disabled={reason.trim().length < 3} onClick={() => act.run(reload)}>Hide dish</Button></div>
          </Modal>}
        </>
      )}</Fetch>
    </Need>
  );
}
