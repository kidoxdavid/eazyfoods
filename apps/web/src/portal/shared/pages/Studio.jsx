import { useState } from 'react'
import { Plus, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { useApi, useAction, toast } from '../hooks'
import { post, put, del } from '../client'
import { Alert, Badge, Button, Card, Field, ImageUpload, Input, Modal, PageHeader, Select, Spinner, Switch, Tabs, Textarea, VideoUpload } from '../ui'

const day = (s) => s.slice(0, 10)
const fmt = (s) => new Date(`${day(s)}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
const range = (t) => (t.repeats_yearly ? `${fmt(t.starts_on).replace(/, \d{4}/, '')} – ${fmt(t.ends_on).replace(/, \d{4}/, '')}, every year` : `${fmt(t.starts_on)} – ${fmt(t.ends_on)}`)
const KINDS = { festival: 'Festival', season: 'Season', holiday: 'Holiday', custom: 'Custom' }
const local = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

/** Festival and season themes, homepage banners and homepage layout. Changes go live on the shop straight away. */
export default function Studio() {
  const [tab, setTab] = useState('themes')
  return (
    <>
      <PageHeader title="Storefront Studio" sub="Festival and season themes, homepage banners and homepage layout. Changes go live on the shop straight away." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'themes', label: 'Themes' }, { id: 'banners', label: 'Banners' }, { id: 'layout', label: 'Homepage layout' }]} />
      {tab === 'themes' ? <Themes /> : tab === 'banners' ? <Banners /> : <HomeLayout />}
    </>
  )
}

function Themes() {
  const themes = useApi('/admin/themes')
  const active = useApi('/theme/active')
  const [kind, setKind] = useState('all')
  const [edit, setEdit] = useState(null)
  const setStatus = useAction(async (t, status) => { await post(`/admin/themes/${t.id}/status`, { status }); toast(status === 'on' ? `${t.name} is now forced on` : status === 'off' ? `${t.name} turned off` : `${t.name} follows its dates`); themes.reload(); active.reload() })
  if (!themes.data) return themes.error ? <Alert>{themes.error}</Alert> : <Spinner className="h-40" />
  const live = active.data?.theme?.slug
  const shown = themes.data.filter((t) => kind === 'all' || t.kind === kind)
  return (
    <>
      <Alert tone="info">Pick <strong>Auto</strong> and a theme switches on and off by its dates. <strong>On</strong> forces it now (only one theme can be forced). <strong>Off</strong> never shows it. Festivals that move each year (Easter, Eid, Ramadan, Diwali, Lunar New Year…) carry the next date only: check and update them yearly.</Alert>
      <Alert>{setStatus.error}</Alert>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="Filter themes">{['all', 'festival', 'season', 'holiday', 'custom'].map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`px-3 py-1.5 text-sm ${kind === k ? 'bg-primary-600 text-white' : 'bg-white hover:bg-gray-50'}`}>{k === 'all' ? 'All' : KINDS[k]}</button>)}</div>
        <Button onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> New theme</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {shown.map((t) => (
          <div key={t.id} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${live === t.slug ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}>
            <div className="h-20 flex items-center justify-between px-4 text-white" style={{ background: `linear-gradient(115deg, ${t.palette.hero_from}, ${t.palette.hero_to})` }}><span className="text-3xl" aria-hidden="true">{t.emoji}</span>{live === t.slug && <Badge tone="green">Live now</Badge>}</div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-gray-900">{t.name}</h3>
              <p className="text-xs text-gray-500">{KINDS[t.kind]} · {range(t)}</p>
              <div className="flex gap-1" aria-hidden="true">{[t.palette.primary, t.palette.deep, t.palette.tint, t.palette.glow].map((c) => <span key={c} className="h-4 w-4 rounded-full border border-gray-200" style={{ background: c }} />)}</div>
              {t.notes?.startsWith('MOVES') && <Badge tone="yellow">Dates move yearly</Badge>}
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label={`${t.name} mode`}>{['auto', 'on', 'off'].map((s) => <button key={s} type="button" aria-pressed={t.status === s} onClick={() => setStatus.run(t, s)} className={`px-3 py-1 text-xs ${t.status === s ? 'bg-primary-600 text-white' : 'bg-white hover:bg-gray-50'}`}>{s === 'auto' ? 'Auto' : s === 'on' ? 'On' : 'Off'}</button>)}</div>
              <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setEdit(t)}>Edit</Button><a className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-700 hover:underline" href={`/?preview_theme=${t.slug}`} target="_blank" rel="noopener noreferrer">Preview <ExternalLink className="h-3 w-3" /><span className="sr-only"> {t.name} (opens in a new tab)</span></a></div>
            </div>
          </div>
        ))}
      </div>
      {edit && <ThemeEditor key={edit === 'new' ? 'new' : edit.id} theme={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); themes.reload(); active.reload() }} />}
    </>
  )
}

const BLANK = { name: '', kind: 'custom', emoji: '🎉', motif: 'confetti', starts_on: new Date().toISOString().slice(0, 10), ends_on: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), repeats_yearly: false, priority: 50, status: 'auto',
  palette: { primary: '#1f5b3a', deep: '#15412a', tint: '#dcefe2', glow: '#72c795', hero_from: '#0b3a24', hero_to: '#1d7a4c' }, headline: '', subtitle: '', cta_label: 'Start shopping', cta_link: '/search', banner_text: '', notes: '' }
const COLOURS = [['primary', 'Main colour'], ['deep', 'Darker shade'], ['tint', 'Light background'], ['glow', 'Dark-mode colour'], ['hero_from', 'Banner start'], ['hero_to', 'Banner end']]

function ThemeEditor({ theme, onClose, onSaved }) {
  const [v, setV] = useState(theme ? { ...theme, starts_on: day(theme.starts_on), ends_on: day(theme.ends_on) } : BLANK)
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const setP = (k) => (e) => setV({ ...v, palette: { ...v.palette, [k]: e.target.value } })
  const body = () => { const { id, slug, is_preset, ...rest } = v; void id; void slug; void is_preset; return rest }
  const save = useAction(async () => { if (theme) await put(`/admin/themes/${theme.id}`, body()); else await post('/admin/themes', body()); toast('Theme saved'); onSaved() })
  const remove = useAction(async () => { await del(`/admin/themes/${theme.id}`); toast('Theme deleted'); onSaved() })
  const p = v.palette
  return (
    <Modal wide title={theme ? `Edit ${theme.name}` : 'New theme'} onClose={onClose}>
      <div className="space-y-3">
        <Alert>{save.error || remove.error}</Alert>
        <div className="rounded-lg p-4 text-white" style={{ background: `linear-gradient(115deg, ${p.hero_from}, ${p.hero_to})` }} aria-label="Preview of the homepage banner">
          <p className="text-xs opacity-90">{v.emoji} {v.name || 'Theme name'}</p><p className="text-lg font-bold">{v.headline || 'Your headline'}</p><p className="text-sm opacity-90">{v.subtitle}</p><span className="inline-block mt-2 px-3 py-1 text-sm rounded-full bg-white/20">{v.cta_label || 'Button'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name" htmlFor="t1"><Input id="t1" value={v.name} onChange={s('name')} maxLength={60} /></Field>
          <Field label="Type" htmlFor="t2"><Select id="t2" value={v.kind} onChange={s('kind')}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Emoji" htmlFor="t3"><Input id="t3" value={v.emoji} onChange={s('emoji')} maxLength={8} /></Field>
          <Field label="Falling decoration" htmlFor="t4"><Select id="t4" value={v.motif} onChange={s('motif')}><option value="none">None</option><option value="confetti">Confetti</option><option value="snow">Snow</option><option value="leaves">Leaves</option><option value="stars">Stars</option></Select></Field>
          <Field label="Starts" htmlFor="t5"><Input id="t5" type="date" value={v.starts_on} onChange={s('starts_on')} /></Field>
          <Field label="Ends (inclusive)" htmlFor="t6"><Input id="t6" type="date" value={v.ends_on} onChange={s('ends_on')} /></Field>
          <Field label="Priority (0–100)" htmlFor="t7" hint="If two themes overlap, the higher number shows."><Input id="t7" type="number" min={0} max={100} value={v.priority} onChange={(e) => setV({ ...v, priority: Number(e.target.value) })} /></Field>
          <Field label="Mode" htmlFor="t8"><Select id="t8" value={v.status} onChange={s('status')}><option value="auto">Auto (by dates)</option><option value="on">Force on now</option><option value="off">Off</option></Select></Field>
        </div>
        <Switch checked={v.repeats_yearly} label="Repeats every year on the same dates" onChange={(x) => setV({ ...v, repeats_yearly: x })} />
        <div>
          <h4 className="font-medium text-gray-900">Colours</h4>
          <p className="text-xs text-gray-500 mb-2">The shop’s green becomes your main colour while this theme is live. Pick colours that read clearly: dark enough for white text, and a light version for dark mode.</p>
          <div className="flex flex-wrap gap-3">{COLOURS.map(([k, l]) => <label key={k} className="text-xs text-gray-700 flex flex-col items-start gap-1">{l}<input type="color" value={p[k]} onChange={setP(k)} aria-label={l} className="h-9 w-16 rounded border border-gray-300" /></label>)}</div>
        </div>
        <Field label="Headline" htmlFor="t9"><Input id="t9" value={v.headline} onChange={s('headline')} maxLength={90} /></Field>
        <Field label="Sub-headline" htmlFor="t10"><Textarea id="t10" rows={2} value={v.subtitle} onChange={s('subtitle')} maxLength={220} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Button text" htmlFor="t11"><Input id="t11" value={v.cta_label} onChange={s('cta_label')} maxLength={40} /></Field>
          <Field label="Button link" htmlFor="t12" hint="A page on this site, e.g. /deals or /search?region=west-africa"><Input id="t12" value={v.cta_link} onChange={s('cta_link')} /></Field>
        </div>
        <Field label="Top-of-shop message" htmlFor="t13" hint="Shown in a coloured strip above the header. Only make claims you can stand behind."><Input id="t13" value={v.banner_text} onChange={s('banner_text')} maxLength={160} /></Field>
        <Field label="Notes for your team" htmlFor="t14"><Textarea id="t14" rows={2} value={v.notes} onChange={s('notes')} maxLength={400} /></Field>
        <div className="flex justify-end gap-2">
          {theme && !theme.is_preset && <Button variant="danger" busy={remove.busy} onClick={() => window.confirm('Delete this theme?') && remove.run()}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button busy={save.busy} disabled={v.name.length < 2 || v.headline.length < 2} onClick={() => save.run()}>Save theme</Button>
        </div>
      </div>
    </Modal>
  )
}

const BLANK_B = { title: '', subtitle: '', cta_label: 'Shop now', cta_link: '/deals', image_url: null, video_url: null, from_color: '#0b3a24', to_color: '#1d7a4c', status: 'draft', starts_at: '', ends_at: '' }
const swap = (rows, a, b) => { const ids = rows.map((r) => r.id); [ids[a], ids[b]] = [ids[b], ids[a]]; return ids }

function Banners() {
  const { data: rows, reload, error } = useApi('/admin/banners')
  const [edit, setEdit] = useState(null)
  const reorder = useAction(async (ids) => { await post('/admin/banners/order', { ids }); reload() })
  if (!rows) return error ? <Alert>{error}</Alert> : <Spinner className="h-40" />
  return (
    <>
      <Alert tone="info">Live banners appear as slides at the start of the homepage carousel, after the active theme. Use them for sales events, new vendors or announcements.</Alert>
      <div className="flex justify-end"><Button onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> New banner</Button></div>
      {!rows.length && <Card><p className="text-sm text-gray-500">No banners yet.</p></Card>}
      <div className="space-y-2">
        {rows.map((b, i) => (
          <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
            <span className="h-8 w-12 rounded flex-shrink-0" style={{ background: `linear-gradient(115deg, ${b.from_color}, ${b.to_color})` }} aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{b.title}</p><p className="text-xs text-gray-500 truncate">{b.cta_link}{b.ends_at ? ` · until ${new Date(b.ends_at).toLocaleDateString('en-CA')}` : ''}</p></div>
            <Badge tone={b.status === 'live' ? 'green' : 'gray'}>{b.status === 'live' ? 'Live' : 'Draft'}</Badge>
            <Button size="sm" variant="ghost" aria-label={`Move ${b.title} up`} disabled={i === 0} onClick={() => reorder.run(swap(rows, i, i - 1))}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" aria-label={`Move ${b.title} down`} disabled={i === rows.length - 1} onClick={() => reorder.run(swap(rows, i, i + 1))}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="sm" variant="secondary" onClick={() => setEdit(b)}>Edit</Button>
          </div>
        ))}
      </div>
      {edit && <BannerEditor key={edit === 'new' ? 'new' : edit.id} b={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={(m) => { toast(m); setEdit(null); reload() }} />}
    </>
  )
}

function BannerEditor({ b, onClose, onSaved }) {
  const [v, setV] = useState(b ? { ...b, starts_at: local(b.starts_at), ends_at: local(b.ends_at) } : BLANK_B)
  const s = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const payload = () => ({ title: v.title, subtitle: v.subtitle, cta_label: v.cta_label, cta_link: v.cta_link, image_url: v.image_url, video_url: v.video_url, from_color: v.from_color, to_color: v.to_color, status: v.status,
    starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null, ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null })
  const save = useAction(async () => { if (b) await put(`/admin/banners/${b.id}`, payload()); else await post('/admin/banners', payload()); onSaved('Banner saved') })
  const remove = useAction(async () => { await del(`/admin/banners/${b.id}`); onSaved('Banner deleted') })
  return (
    <Modal wide title={b ? 'Edit banner' : 'New banner'} onClose={onClose}>
      <div className="space-y-3">
        <Alert>{save.error || remove.error}</Alert>
        <div className="rounded-lg p-4 text-white" style={{ background: `linear-gradient(115deg, ${v.from_color}, ${v.to_color})` }}><p className="text-lg font-bold">{v.title || 'Banner title'}</p><p className="text-sm opacity-90">{v.subtitle}</p><span className="inline-block mt-2 px-3 py-1 text-sm rounded-full bg-white/20">{v.cta_label || 'Button'}</span></div>
        <Field label="Title" htmlFor="b1"><Input id="b1" value={v.title} onChange={s('title')} maxLength={90} /></Field>
        <Field label="Sub-headline" htmlFor="b2"><Textarea id="b2" rows={2} value={v.subtitle} onChange={s('subtitle')} maxLength={220} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Button text" htmlFor="b3"><Input id="b3" value={v.cta_label} onChange={s('cta_label')} maxLength={40} /></Field>
          <Field label="Button link" htmlFor="b4" hint="A page on this site, starting with /"><Input id="b4" value={v.cta_link} onChange={s('cta_link')} /></Field>
          <Field label="Show from (optional)" htmlFor="b5"><Input id="b5" type="datetime-local" value={v.starts_at} onChange={s('starts_at')} /></Field>
          <Field label="Hide after (optional)" htmlFor="b6"><Input id="b6" type="datetime-local" value={v.ends_at} onChange={s('ends_at')} /></Field>
          <Field label="Status" htmlFor="b7"><Select id="b7" value={v.status} onChange={s('status')}><option value="draft">Draft (hidden)</option><option value="live">Live</option></Select></Field>
        </div>
        <div className="flex gap-3"><label className="text-xs text-gray-700 flex flex-col gap-1">Start colour<input type="color" value={v.from_color} onChange={s('from_color')} aria-label="Start colour" className="h-9 w-16 rounded border border-gray-300" /></label><label className="text-xs text-gray-700 flex flex-col gap-1">End colour<input type="color" value={v.to_color} onChange={s('to_color')} aria-label="End colour" className="h-9 w-16 rounded border border-gray-300" /></label></div>
        <p className="text-xs text-gray-500">Text on a banner is white, so choose dark colours.</p>
        <div><p className="text-sm font-medium text-gray-700 mb-1">Background picture (optional)</p><ImageUpload value={v.image_url} onChange={(u) => setV({ ...v, image_url: u })} label="Banner picture" /></div>
        <div><p className="text-sm font-medium text-gray-700 mb-1">Background video (optional)</p><VideoUpload value={v.video_url} onChange={(u) => setV({ ...v, video_url: u })} label="Banner video" /></div>
        {v.video_url && <p className="text-xs text-gray-500">The picture above is shown while the video loads, and to visitors who have reduced motion or data saving turned on, so add one. Videos have no sound. Make sure the words stay readable over the footage: a dark overlay is added automatically.</p>}
        <div className="flex justify-end gap-2">
          {b && <Button variant="danger" busy={remove.busy} onClick={() => window.confirm('Delete this banner?') && remove.run()}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button busy={save.busy} disabled={v.title.length < 2 || !/^\//.test(v.cta_link)} onClick={() => save.run()}>Save banner</Button>
        </div>
      </div>
    </Modal>
  )
}

const LABELS = { regions: 'Shop-by-region tiles', deals: 'Today’s deals', departments: 'Shop by department', collections_a: 'Featured collections (first two)', new: 'New arrivals', collections_b: 'Featured collections (next two)', stores: 'Stores near you', kitchens: 'Home chefs', recipes: 'Recipes', trust: 'Trust strip (stores, delivery, help)' }

function HomeLayout() {
  const { data, error } = useApi('/content/home')
  if (!data) return error ? <Alert>{error}</Alert> : <Spinner className="h-40" />
  return <LayoutForm initial={data.home_layout?.sections ?? Object.keys(LABELS).map((id) => ({ id, enabled: true }))} />
}
function LayoutForm({ initial }) {
  const [rows, setRows] = useState(() => [...initial, ...Object.keys(LABELS).filter((id) => !initial.some((r) => r.id === id)).map((id) => ({ id, enabled: true }))])
  const move = (i, j) => setRows((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n })
  const save = useAction(async () => { await put('/admin/layout', { sections: rows }); toast('Homepage layout saved') })
  return (
    <>
      <Alert tone="info">Reorder or hide the sections below the carousel. The carousel itself is controlled by Themes and Banners.</Alert>
      <Alert>{save.error}</Alert>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className={`bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 ${r.enabled ? '' : 'opacity-60'}`}>
            <button type="button" role="switch" aria-checked={r.enabled} aria-label={`Show ${LABELS[r.id]}`} onClick={() => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, enabled: !y.enabled } : y)))} className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${r.enabled ? 'bg-green-600' : 'bg-gray-300'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${r.enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
            <span className="flex-1 text-sm">{LABELS[r.id]}</span>
            <Button size="sm" variant="ghost" aria-label={`Move ${LABELS[r.id]} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" aria-label={`Move ${LABELS[r.id]} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end"><Button busy={save.busy} onClick={() => save.run()}>Save layout</Button></div>
    </>
  )
}
