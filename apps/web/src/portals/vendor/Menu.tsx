import { useState } from 'react';
import { del, money, post, put } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, DataTable, ErrorBox, Field, ImageUpload, Input, Loading, Modal, Notice, PageHeader, Select, Textarea } from '../../ui';
import { StoreSelect, useVendor } from './Shared';

type Dish = { product_id: string; offer_id: string; name: string; description: string | null; cuisine: string | null; spice_level: number | null; serves: string | null; prep_minutes: number | null; allergens: string[] | null;
  ingredients: string | null; dish_tags: string[]; status: string; price_cents: number; stock_on_hand: number; stock_reserved: number; is_active: boolean; image_url: string | null };
type List = { dishes: Dish[]; allergens: string[]; tags: string[] };
const nice = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function Menu() {
  const { storeId } = useVendor();
  return (<><PageHeader title="Menu" sub="Your dishes, how many portions you can make today, and their allergens." /><StoreSelect /><MenuList key={storeId} /></>);
}

function MenuList() {
  const { storeId } = useVendor(); const toast = useToast();
  const d = useApi<List>(`/vendor/stores/${storeId}/dishes`);
  const [edit, setEdit] = useState<Dish | 'new' | null>(null);
  const portions = useAction(async (x: Dish, n: number) => { await put(`/vendor/stores/${storeId}/dishes/${x.product_id}/portions`, { portions: n }); d.reload(); });
  if (d.loading && !d.data) return <Loading />;
  if (d.error) return <ErrorBox message={d.error} retry={d.reload} />;
  if (!d.data) return null;
  return (
    <>
      <Notice>Every dish must list its allergens. Customers rely on this, and you are responsible for it being complete and correct. Dishes are made to order: set today’s portions and they sell down automatically.</Notice>
      {portions.error && <Notice tone="error">{portions.error}</Notice>}
      <div className="row end" style={{ margin: '10px 0' }}><Button onClick={() => setEdit('new')}>Add a dish</Button></div>
      <DataTable rows={d.data.dishes} rowKey={(r) => r.product_id} empty="No dishes yet. Add your first dish." columns={[
        { key: 'n', header: 'Dish', render: (r) => <><strong>{r.name}</strong>{r.status === 'draft' && <> <Badge tone="danger">Hidden by EAZyfoods</Badge></>}{!r.is_active && r.status !== 'draft' && <> <Badge>Off the menu</Badge></>}<div className="small muted">{(r.allergens ?? []).length ? `Contains ${(r.allergens ?? []).map(nice).join(', ')}` : 'No priority allergens declared'}</div></> },
        { key: 'p', header: 'Price', render: (r) => money(r.price_cents) },
        { key: 's', header: 'Portions today', render: (r) => (
          <span className="row" style={{ gap: 6 }}>
            <Button size="sm" variant="secondary" aria-label={`Fewer portions of ${r.name}`} disabled={portions.busy || r.stock_on_hand - 1 < r.stock_reserved} onClick={() => portions.run(r, r.stock_on_hand - 1)}>−</Button>
            <strong aria-label={`${r.stock_on_hand} portions`}>{r.stock_on_hand}</strong>
            <Button size="sm" variant="secondary" aria-label={`More portions of ${r.name}`} disabled={portions.busy || r.stock_on_hand >= 200} onClick={() => portions.run(r, r.stock_on_hand + 1)}>+</Button>
            {r.stock_reserved > 0 && <span className="muted small">{r.stock_reserved} reserved</span>}
          </span>) },
        { key: 'a', header: '', render: (r) => <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button> }]} />
      {edit && <DishEditor list={d.data} dish={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onDone={(m) => { toast(m); setEdit(null); d.reload(); }} />}
    </>
  );
}

function DishEditor({ list, dish, onClose, onDone }: { list: List; dish: Dish | null; onClose: () => void; onDone: (m: string) => void }) {
  const { storeId } = useVendor();
  const [f, setF] = useState({ name: dish?.name ?? '', description: dish?.description ?? '', cuisine: dish?.cuisine ?? '', price: dish ? (dish.price_cents / 100).toFixed(2) : '', portions: String(dish?.stock_on_hand ?? 10), serves: dish?.serves ?? 'Serves 1',
    spice: dish?.spice_level == null ? '' : String(dish.spice_level), prep: dish?.prep_minutes ? String(dish.prep_minutes) : '', ingredients: dish?.ingredients ?? '', allergens: dish?.allergens ?? [] as string[], tags: dish?.dish_tags ?? [] as string[],
    confirmed: false, active: dish?.is_active ?? true, image: dish?.image_url ?? null as string | null });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const flip = (k: 'allergens' | 'tags', v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);
  const save = useAction(async () => {
    const payload = { name: f.name, description: f.description || null, cuisine: f.cuisine || null, price_cents: Math.round(Number(f.price) * 100), portions: Number(f.portions), serves: f.serves || null, spice_level: f.spice === '' ? null : Number(f.spice),
      prep_minutes: f.prep ? Number(f.prep) : null, allergens: f.allergens, allergens_confirmed: f.confirmed, ingredients: f.ingredients || null, dish_tags: f.tags, image_url: f.image, is_active: f.active };
    if (dish) await put(`/vendor/stores/${storeId}/dishes/${dish.product_id}`, payload); else await post(`/vendor/stores/${storeId}/dishes`, payload);
    onDone('Dish saved.');
  });
  const remove = useAction(async () => { await del(`/vendor/stores/${storeId}/dishes/${dish!.product_id}`); onDone('Dish removed from your menu.'); });
  const valid = f.name.trim().length >= 2 && Number(f.price) >= 1 && f.confirmed;
  return (
    <Modal open onClose={onClose} title={dish ? `Edit ${dish.name}` : 'Add a dish'}>
      <form onSubmit={(e) => { e.preventDefault(); save.run(); }}>
        {(save.error || remove.error) && <Notice tone="error">{save.error || remove.error}</Notice>}
        <Field label="Dish name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} required /></Field>
        <Field label="Description"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={600} style={{ minHeight: 70 }} /></Field>
        <div className="form-grid">
          <Field label="Price (CAD)"><Input type="number" step="0.01" min="1" value={f.price} onChange={(e) => set('price', e.target.value)} inputMode="decimal" required /></Field>
          <Field label="Portions available today"><Input type="number" min="0" max="200" step="1" value={f.portions} onChange={(e) => set('portions', e.target.value)} inputMode="numeric" /></Field>
          <Field label="Serves"><Input value={f.serves} onChange={(e) => set('serves', e.target.value)} maxLength={30} /></Field>
          <Field label="Cuisine"><Input value={f.cuisine} onChange={(e) => set('cuisine', e.target.value)} maxLength={40} placeholder="e.g. Nigerian" /></Field>
          <Field label="Spice level"><Select value={f.spice} onChange={(e) => set('spice', e.target.value)}><option value="">Not shown</option><option value="0">Mild</option><option value="1">Medium-mild</option><option value="2">Hot</option><option value="3">Very hot</option></Select></Field>
          <Field label="Ready in (minutes)"><Input type="number" min="5" max="1440" value={f.prep} onChange={(e) => set('prep', e.target.value)} inputMode="numeric" /></Field>
        </div>
        <Field label="Ingredients"><Textarea value={f.ingredients} onChange={(e) => set('ingredients', e.target.value)} maxLength={800} style={{ minHeight: 60 }} /></Field>
        <fieldset style={{ border: 0, padding: 0, margin: '10px 0' }}><legend className="label" style={{ fontWeight: 700 }}>Allergens this dish contains</legend>
          <div className="pill-list">{list.allergens.map((a) => <label key={a} className="check"><input type="checkbox" checked={f.allergens.includes(a)} onChange={() => flip('allergens', a)} />{nice(a)}</label>)}</div></fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: '10px 0' }}><legend className="label" style={{ fontWeight: 700 }}>Dietary labels (optional)</legend><p className="muted small" style={{ margin: '0 0 4px' }}>Only tick what is true for this exact recipe. Customers see these as declared by you.</p>
          <div className="pill-list">{list.tags.map((t) => <label key={t} className="check"><input type="checkbox" checked={f.tags.includes(t)} onChange={() => flip('tags', t)} />{nice(t)}</label>)}</div></fieldset>
        <div><span className="label" style={{ fontWeight: 600, fontSize: '.9rem' }}>Photo (optional)</span><ImageUpload value={f.image} onChange={(u) => set('image', u)} label="Dish photo" /></div>
        <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} />Show on my menu</label>
        <label className="check legal-check"><input type="checkbox" checked={f.confirmed} onChange={(e) => set('confirmed', e.target.checked)} /><span><strong>I confirm the allergen list is complete and correct for this dish.</strong> If none are ticked, I confirm it contains none of these allergens, including from shared equipment I know about.</span></label>
        <div className="row end">
          {dish && <Button type="button" variant="danger" busy={remove.busy} onClick={() => remove.run()}>Remove dish</Button>}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" busy={save.busy} disabled={!valid}>Save dish</Button>
        </div>
      </form>
    </Modal>
  );
}
