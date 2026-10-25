import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAction, useApi, toast } from '../../shared/hooks'
import { post, put, patch, del } from '../../shared/client'
import { Alert, Badge, Button, Card, DataTable, Field, ImageUpload, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea } from '../../shared/ui'
import { CheckList, Fetch, Need } from '../common'

export function Catalogue() {
  const nav = useNavigate()
  const [status, setStatus] = useState(''); const [q, setQ] = useState(''); const [creating, setCreating] = useState(false)
  const path = `/admin/products?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) })}`
  return (
    <Need perm={['catalog.manage']} what="managing the catalogue">
      <PageHeader title="Catalogue" sub="Shared products. Vendor suggestions arrive as Pending and stay hidden until you publish them." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New product</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        <Field label="Status" htmlFor="cs"><Select id="cs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="pending">Pending review</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select></Field>
        <Field label="Search name" htmlFor="cq"><Input id="cq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. garri" /></Field>
      </div>
      <Fetch path={path}>{(rows) => (
        <DataTable rows={rows} onRow={(r) => nav(`/catalogue/${r.id}`)} empty="No products match." columns={[
          { key: 'name', header: 'Product', nowrap: false, render: (r) => <><strong>{r.name}</strong><div className="text-xs text-gray-500">{r.brand ?? 'No brand'} · {r.category ?? 'No category'}</div></> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { key: 'by', header: 'Suggested by', render: (r) => r.suggested_by ?? '' }, { key: 'offers', header: 'Store offers' },
          { key: 'images', header: 'Photos', render: (r) => (r.images ? r.images : <span className="text-gray-500">none</span>) }]} />
      )}</Fetch>
      {creating && <NewProduct onClose={() => setCreating(false)} />}
    </Need>
  )
}

function NewProduct({ onClose }) {
  const nav = useNavigate()
  const [name, setName] = useState(''); const [brand, setBrand] = useState('')
  const create = useAction(async () => { const r = await post('/admin/products', { name, brand: brand || undefined, status: 'draft' }); nav(`/catalogue/${r.id}`) })
  return (
    <Modal title="New product" onClose={onClose}>
      <div className="space-y-3"><Alert>{create.error}</Alert>
        <Field label="Product name" htmlFor="pn"><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Brand (optional)" htmlFor="pb"><Input id="pb" value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
        <p className="text-xs text-gray-500">It is created as a draft. Add details, countries and photos on the next screen, then publish.</p>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button busy={create.busy} disabled={name.trim().length < 2} onClick={() => create.run()}>Create</Button></div></div>
    </Modal>
  )
}

export function ProductEditor() {
  const { id } = useParams()
  return <Need perm={['catalog.manage']} what="managing the catalogue"><Fetch path={`/admin/products/${id}`}>{(p, reload) => <Editor p={p} reload={reload} />}</Fetch></Need>
}

function Editor({ p, reload }) {
  const tax = useApi('/admin/taxonomy')
  const mode = p.allergens == null ? 'unknown' : p.allergens.length ? 'list' : 'none'
  const [v, setV] = useState({
    name: p.name, brand: p.brand ?? '', category_slug: p.category_slug ?? '', description: p.description ?? '', sku: p.sku ?? '', barcode: p.barcode ?? '', sold_by: p.sold_by, pack_size: p.pack_size ?? '', pack_unit: p.pack_unit ?? '',
    ingredients: p.ingredients ?? '', storage_info: p.storage_info ?? '', manufacturer: p.manufacturer ?? '', tax_class: p.tax_class, status: p.status, seo_title: p.seo_title ?? '', seo_description: p.seo_description ?? '', allergen_mode: mode, allergens: (p.allergens ?? []).join(', '),
  })
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const [culinary, setCulinary] = useState(p.countries.filter((c) => c.kind === 'culinary').map((c) => c.slug))
  const [made, setMade] = useState(p.countries.filter((c) => c.kind === 'manufacturing').map((c) => c.slug))
  const [alias, setAlias] = useState(''); const [imgUrl, setImgUrl] = useState(null); const [alt, setAlt] = useState('')
  useEffect(() => { setAlt((a) => a || p.name) }, [p.name])
  const save = useAction(async () => {
    const allergens = v.allergen_mode === 'unknown' ? null : v.allergen_mode === 'none' ? [] : v.allergens.split(',').map((x) => x.trim()).filter(Boolean)
    await patch(`/admin/products/${p.id}`, { name: v.name, brand: v.brand || null, category_slug: v.category_slug || null, description: v.description || null, sku: v.sku || null, barcode: v.barcode || null, sold_by: v.sold_by,
      pack_size: v.pack_size === '' ? null : Number(v.pack_size), pack_unit: v.pack_unit || null, ingredients: v.ingredients || null, allergens, storage_info: v.storage_info || null, manufacturer: v.manufacturer || null, tax_class: v.tax_class, status: v.status, seo_title: v.seo_title || null, seo_description: v.seo_description || null })
    await put(`/admin/products/${p.id}/countries`, { culinary, manufacturing: made })
    toast('Product saved'); reload()
  })
  const addAlias = useAction(async () => { await post(`/admin/products/${p.id}/aliases`, { alias, verified: false }); setAlias(''); toast('Alias added (not searchable until verified)'); reload() })
  const setVerified = useAction(async (id, verified) => { await patch(`/admin/aliases/${id}`, { verified }); toast(verified ? 'Alias verified: now searchable' : 'Alias hidden from search'); reload() })
  const rmAlias = useAction(async (id) => { await del(`/admin/aliases/${id}`); reload() })
  const addImage = useAction(async () => { await post(`/admin/products/${p.id}/images`, { url: imgUrl, alt }); setImgUrl(null); toast('Photo added'); reload() })
  const rmImage = useAction(async (id) => { await del(`/admin/product-images/${id}`); reload() })
  const countries = (tax.data?.countries ?? []).map((c) => ({ value: c.slug, label: c.name }))
  const cats = tax.data?.categories ?? []
  return (
    <>
      <Link to="/catalogue" className="text-sm text-primary-600 hover:text-primary-700">← All products</Link>
      <PageHeader title={p.name} sub={<><StatusBadge status={p.status} />{p.suggested_by_vendor_id && <> · <Badge tone="blue">Vendor suggestion</Badge></>}</>} actions={<Button busy={save.busy} onClick={() => save.run()}>Save changes</Button>} />
      <Alert>{save.error}</Alert>
      {p.status === 'pending' && <Alert tone="warn">Pending review. Check the details, then set Status to Published and save. Until then it is hidden from shoppers.</Alert>}
      <Card title="Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name" htmlFor="e1"><Input id="e1" value={v.name} onChange={s('name')} /></Field>
          <Field label="Brand" htmlFor="e2"><Input id="e2" value={v.brand} onChange={s('brand')} /></Field>
          <Field label="Category" htmlFor="e3"><Select id="e3" value={v.category_slug} onChange={s('category_slug')}><option value="">None</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
          <Field label="Status" htmlFor="e4"><Select id="e4" value={v.status} onChange={s('status')}><option value="draft">Draft</option><option value="pending">Pending</option><option value="published">Published</option><option value="archived">Archived</option></Select></Field>
          <Field label="Sold by" htmlFor="e5"><Select id="e5" value={v.sold_by} onChange={s('sold_by')}><option value="unit">Fixed unit / pack</option><option value="weight">Weight (price is per unit, final weight may vary)</option></Select></Field>
          <Field label="Pack size" htmlFor="e6"><Input id="e6" inputMode="decimal" value={v.pack_size} onChange={s('pack_size')} /></Field>
          <Field label="Pack unit" htmlFor="e7" hint="g, kg, ml, L…"><Input id="e7" value={v.pack_unit} onChange={s('pack_unit')} /></Field>
          <Field label="Tax class" htmlFor="e8" hint="Zero-rated basic groceries vs standard-rated items. Confirm with your accountant."><Select id="e8" value={v.tax_class} onChange={s('tax_class')}><option value="zero_rated">Zero-rated (0%)</option><option value="standard">Standard (GST)</option></Select></Field>
          <Field label="SKU" htmlFor="e9"><Input id="e9" value={v.sku} onChange={s('sku')} /></Field>
          <Field label="Barcode" htmlFor="e10"><Input id="e10" value={v.barcode} onChange={s('barcode')} /></Field>
          <Field label="Manufacturer" htmlFor="e11"><Input id="e11" value={v.manufacturer} onChange={s('manufacturer')} /></Field>
        </div>
        <div className="space-y-3 mt-3">
          <Field label="Description" htmlFor="e12"><Textarea id="e12" value={v.description} onChange={s('description')} /></Field>
          <Field label="Ingredients" htmlFor="e13"><Textarea id="e13" value={v.ingredients} onChange={s('ingredients')} /></Field>
          <Field label="Storage and handling" htmlFor="e14"><Input id="e14" value={v.storage_info} onChange={s('storage_info')} /></Field>
        </div>
      </Card>
      <Card title="Allergens" sub="“Not supplied” and “none” are different. Only choose “None declared” when the packaging or supplier says so. Customers see the difference.">
        <div className="space-y-3 max-w-xl">
          <Field label="Allergen information" htmlFor="al"><Select id="al" value={v.allergen_mode} onChange={s('allergen_mode')}><option value="unknown">Not supplied (unknown)</option><option value="none">None declared</option><option value="list">Contains…</option></Select></Field>
          {v.allergen_mode === 'list' && <Field label="Allergens (comma separated)" htmlFor="al2" hint="e.g. fish, crustaceans, peanuts"><Input id="al2" value={v.allergens} onChange={s('allergens')} /></Field>}
        </div>
      </Card>
      <Card title="Countries" sub="Culinary tradition (where the dish or ingredient belongs) is not the same as where it was made. Don’t assume they match.">
        {tax.loading ? <Spinner className="h-20" /> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div><p className="font-medium text-sm mb-1">Culinary tradition</p><CheckList options={countries} value={culinary} onChange={setCulinary} /></div><div><p className="font-medium text-sm mb-1">Made in</p><CheckList options={countries} value={made} onChange={setMade} /></div></div>}
        <p className="text-xs text-gray-500 mt-2">Saved with the “Save changes” button above.</p>
      </Card>
      <Card title="Search aliases">
        <Alert tone="warn">Only <strong>verified</strong> aliases are searchable. Verify an alias only when it names the <em>same</em> product (a genuine alternative name or spelling). Never use an alias to link a different ingredient, especially where allergens or diets matter.</Alert>
        <Alert>{setVerified.error ?? addAlias.error}</Alert>
        <div className="mt-3"><DataTable rows={p.aliases} empty="No aliases yet." columns={[{ key: 'alias', header: 'Alias', render: (a) => <strong>{a.alias}</strong> }, { key: 'v', header: 'State', render: (a) => (a.verified ? <Badge tone="green">Verified, searchable</Badge> : <Badge tone="yellow">Unverified, hidden</Badge>) },
          { key: 'a', header: '', right: true, render: (a) => <span className="inline-flex gap-1"><Button size="sm" variant={a.verified ? 'secondary' : 'primary'} onClick={() => setVerified.run(a.id, !a.verified)}>{a.verified ? 'Un-verify' : 'Verify'}</Button><Button size="sm" variant="ghost" onClick={() => rmAlias.run(a.id)}>Delete</Button></span> }]} /></div>
        <div className="flex items-end gap-3 mt-3"><Field label="New alias" htmlFor="na" className="flex-1"><Input id="na" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. Gari" /></Field><Button busy={addAlias.busy} disabled={alias.trim().length < 2} onClick={() => addAlias.run()}>Add</Button></div>
      </Card>
      <Card title="Photos" sub="Use real photos of the actual product. Each needs a short description for screen readers.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{p.images.map((i) => <div key={i.id} className="space-y-1"><img src={i.url} alt={i.alt} className="rounded-lg aspect-[4/3] object-cover w-full" /><p className="text-xs">{i.alt}</p><Button size="sm" variant="ghost" onClick={() => rmImage.run(i.id)}>Remove</Button></div>)}</div>
        {!p.images.length && <p className="text-sm text-gray-500">No photos yet. Shoppers see an initials tile.</p>}
        <hr className="my-4" />
        <ImageUpload value={imgUrl} onChange={setImgUrl} label="Photo" />
        {imgUrl && <div className="mt-3 space-y-2 max-w-xl"><Field label="Description of the photo" htmlFor="ph"><Input id="ph" value={alt} onChange={(e) => setAlt(e.target.value)} /></Field><Alert>{addImage.error}</Alert><Button busy={addImage.busy} disabled={alt.length < 2} onClick={() => addImage.run()}>Attach photo</Button></div>}
      </Card>
      <Card title="Search engine text (optional)">
        <div className="space-y-3 max-w-2xl"><Field label="SEO title" htmlFor="st"><Input id="st" value={v.seo_title} onChange={s('seo_title')} /></Field><Field label="SEO description" htmlFor="sd"><Textarea id="sd" value={v.seo_description} onChange={s('seo_description')} /></Field></div>
      </Card>
      <div className="flex justify-end"><Button busy={save.busy} onClick={() => save.run()}>Save changes</Button></div>
    </>
  )
}
