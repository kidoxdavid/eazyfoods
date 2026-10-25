import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAction, toast } from '../../shared/hooks'
import { post, put, patch } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Switch, Tabs, Textarea } from '../../shared/ui'
import { CheckList, Fetch, Need, lines } from '../common'

export default function Taxonomy() {
  const [tab, setTab] = useState('regions')
  return (
    <Need perm={['catalog.manage']} what="managing the taxonomy">
      <PageHeader title="Taxonomy" sub="Regions, countries, categories and collections are data. Change them here, no code needed." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'regions', label: 'Regions' }, { id: 'countries', label: 'Countries' }, { id: 'categories', label: 'Categories' }, { id: 'collections', label: 'Collections' }]} />
      <Fetch path="/admin/taxonomy">{(t, reload) => (tab === 'regions' ? <Regions t={t} reload={reload} /> : tab === 'countries' ? <Countries t={t} reload={reload} /> : tab === 'categories' ? <Categories t={t} reload={reload} /> : <Collections t={t} reload={reload} />)}</Fetch>
    </Need>
  )
}

function Regions({ t, reload }) {
  const [edit, setEdit] = useState(null)
  const [v, setV] = useState({ name: '', description: '', sort_order: '100', is_active: true }); const [countries, setCountries] = useState([])
  const open = (r) => { setEdit(r ?? {}); setV({ name: r?.name ?? '', description: r?.description ?? '', sort_order: String(r?.sort_order ?? 100), is_active: r?.is_active ?? true }); setCountries(r?.countries ?? []) }
  const save = useAction(async () => {
    if (edit?.id) await patch(`/admin/regions/${edit.id}`, { name: v.name, description: v.description || null, is_active: v.is_active, sort_order: Number(v.sort_order), countries })
    else await post('/admin/regions', { name: v.name, description: v.description || undefined, sort_order: Number(v.sort_order), countries })
    toast('Region saved'); setEdit(null); reload()
  })
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open(null)}><Plus className="h-4 w-4" /> New region</Button></div>
      <DataTable rows={t.regions} onRow={open} empty="No regions." columns={[{ key: 'name', header: 'Region', render: (r) => <strong>{r.name}</strong> }, { key: 'active', header: 'Shown', render: (r) => (r.is_active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>) }, { key: 'sort', header: 'Order', render: (r) => r.sort_order }, { key: 'c', header: 'Countries', render: (r) => `${r.countries.length}` }]} />
      {edit && (
        <Modal wide title={edit.id ? `Edit ${edit.name}` : 'New region'} onClose={() => setEdit(null)}>
          <div className="space-y-3"><Alert>{save.error}</Alert>
            <Field label="Name" htmlFor="rn"><Input id="rn" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
            <Field label="Description" htmlFor="rd"><Textarea id="rd" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
            <Field label="Display order" htmlFor="ro"><Input id="ro" inputMode="numeric" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value })} /></Field>
            {edit.id && <Switch checked={v.is_active} label="Shown to shoppers" onChange={(x) => setV({ ...v, is_active: x })} />}
            <p className="text-xs text-gray-500">A country may belong to several regions (for example Cameroon in both West and Central Africa).</p>
            <CheckList options={t.countries.map((c) => ({ value: c.slug, label: c.name }))} value={countries} onChange={setCountries} />
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={v.name.length < 2} onClick={() => save.run()}>Save</Button></div></div>
        </Modal>
      )}
    </>
  )
}

function Countries({ t, reload }) {
  const [v, setV] = useState({ name: '', iso2: '' })
  const add = useAction(async () => { await post('/admin/countries', { name: v.name, iso2: v.iso2 || undefined }); setV({ name: '', iso2: '' }); toast('Country added'); reload() })
  return (
    <>
      <Card title="Add a country"><Alert>{add.error}</Alert>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mt-2"><Field label="Name" htmlFor="cn"><Input id="cn" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field><Field label="ISO code (2 letters, optional)" htmlFor="ci"><Input id="ci" maxLength={2} value={v.iso2} onChange={(e) => setV({ ...v, iso2: e.target.value })} /></Field></div>
        <div className="mt-3"><Button busy={add.busy} disabled={v.name.length < 2} onClick={() => add.run()}>Add country</Button></div></Card>
      <DataTable rows={t.countries} columns={[{ key: 'name', header: 'Country' }, { key: 'iso2', header: 'ISO' }, { key: 'slug', header: 'Slug' }]} />
    </>
  )
}

function Categories({ t, reload }) {
  const [v, setV] = useState({ name: '', parent: '' })
  const add = useAction(async () => { await post('/admin/categories', { name: v.name, parent_slug: v.parent || undefined }); setV({ name: '', parent: '' }); toast('Category added'); reload() })
  const byId = new Map(t.categories.map((c) => [c.id, c]))
  return (
    <>
      <Card title="Add a category"><Alert>{add.error}</Alert>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mt-2"><Field label="Name" htmlFor="ka"><Input id="ka" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Parent (optional)" htmlFor="kp"><Select id="kp" value={v.parent} onChange={(e) => setV({ ...v, parent: e.target.value })}><option value="">Top level</option>{t.categories.filter((c) => !c.parent_id).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field></div>
        <div className="mt-3"><Button busy={add.busy} disabled={v.name.length < 2} onClick={() => add.run()}>Add category</Button></div></Card>
      <DataTable rows={t.categories} columns={[{ key: 'name', header: 'Category', render: (c) => <strong>{c.name}</strong> }, { key: 'parent', header: 'Parent', render: (c) => byId.get(c.parent_id)?.name ?? '' }, { key: 'slug', header: 'Slug' }]} />
    </>
  )
}

function Collections({ t, reload }) {
  const [edit, setEdit] = useState(null)
  const [v, setV] = useState({ title: '', subtitle: '', region_slug: '', category_slug: '', products: '', sort_order: '100', is_active: true })
  const open = (c) => { setEdit(c ?? {}); setV({ title: c?.title ?? '', subtitle: c?.subtitle ?? '', region_slug: c?.region_slug ?? '', category_slug: c?.category_slug ?? '', products: (c?.manual_products ?? []).join('\n'), sort_order: String(c?.sort_order ?? 100), is_active: c?.is_active ?? true }) }
  const save = useAction(async () => {
    const body = { title: v.title, subtitle: v.subtitle || null, region_slug: v.region_slug || null, category_slug: v.category_slug || null, product_slugs: lines(v.products), sort_order: Number(v.sort_order), is_active: v.is_active }
    if (edit?.id) await put(`/admin/collections/${edit.id}`, body); else await post('/admin/collections', body)
    toast('Collection saved'); setEdit(null); reload()
  })
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open(null)}><Plus className="h-4 w-4" /> New collection</Button></div>
      <DataTable rows={t.collections} onRow={open} empty="No collections." columns={[
        { key: 'title', header: 'Collection', nowrap: false, render: (c) => <><strong>{c.title}</strong><div className="text-xs text-gray-500">{c.subtitle}</div></> },
        { key: 'rule', header: 'Contents', render: (c) => (c.manual_products.length ? `${c.manual_products.length} hand-picked` : `Rule: ${[c.region_slug, c.category_slug].filter(Boolean).join(' + ') || 'none'}`) }, { key: 'a', header: 'Shown', render: (c) => (c.is_active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>) }]} />
      {edit && (
        <Modal wide title={edit.id ? 'Edit collection' : 'New collection'} onClose={() => setEdit(null)}>
          <div className="space-y-3"><Alert>{save.error}</Alert>
            <Field label="Title" htmlFor="ct"><Input id="ct" value={v.title} onChange={s('title')} /></Field>
            <Field label="Subtitle" htmlFor="cs"><Input id="cs" value={v.subtitle} onChange={s('subtitle')} /></Field>
            <p className="text-xs text-gray-500">Hand-picked products win. If none are listed, the region and/or category rule fills the collection automatically.</p>
            <Field label="Product slugs (one per line)" htmlFor="cp"><Textarea id="cp" value={v.products} onChange={s('products')} placeholder="garri-white" /></Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Region rule" htmlFor="cr"><Select id="cr" value={v.region_slug} onChange={s('region_slug')}><option value="">None</option>{t.regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</Select></Field>
              <Field label="Category rule" htmlFor="cc"><Select id="cc" value={v.category_slug} onChange={s('category_slug')}><option value="">None</option>{t.categories.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</Select></Field>
              <Field label="Display order" htmlFor="co"><Input id="co" inputMode="numeric" value={v.sort_order} onChange={s('sort_order')} /></Field>
            </div>
            <Switch checked={v.is_active} label="Shown to shoppers" onChange={(x) => setV({ ...v, is_active: x })} />
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} disabled={v.title.length < 2} onClick={() => save.run()}>Save</Button></div></div>
        </Modal>
      )}
    </>
  )
}
