import { useEffect, useState } from 'react'
import { Save, ExternalLink } from 'lucide-react'
import { raw, useStore } from './useStore'

/** Make the public store page yours: colour, words, links and featured products. Saved changes are live straight away. */
export default function Storefront() {
  const store = useStore()
  const [f, setF] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (store) raw('GET', `/vendor/stores/${store.id}/branding`).then(setF).catch((e) => setMsg({ tone: 'error', text: e.response?.data?.detail || 'Could not load the storefront.' })) }, [store])
  if (!f) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggle = (slug) => set('featured_slugs', f.featured_slugs.includes(slug) ? f.featured_slugs.filter((s) => s !== slug) : f.featured_slugs.length < 8 ? [...f.featured_slugs, slug] : f.featured_slugs)
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await raw('PUT', `/vendor/stores/${store.id}/branding`, { accent: f.accent, tagline: f.tagline || null, story: f.story || null, announcement: f.announcement || null, featured_slugs: f.featured_slugs, website: f.website || null, instagram: f.instagram || null, facebook: f.facebook || null })
      setMsg({ tone: 'ok', text: 'Storefront saved. It is live now.' })
    } catch (err) { setMsg({ tone: 'error', text: err.response?.data?.detail || 'Could not save.' }) } finally { setSaving(false) }
  }
  const acc = f.accents.find((a) => a.key === f.accent)
  const input = 'w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500'
  const card = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6'
  return (
    <form onSubmit={save} className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Storefront</h1><p className="text-xs sm:text-sm text-gray-600 mt-1">Make your public page yours: colour, story, announcement and featured items.</p></div>
        {store?.orderable && <a href={`/${store.kind === 'kitchen' ? 'k' : 's'}/${store.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline"><ExternalLink className="h-4 w-4" /> View my page</a>}
      </div>
      {msg && <div role={msg.tone === 'error' ? 'alert' : 'status'} className={`px-3 py-2 rounded-lg text-sm border ${msg.tone === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>{msg.text}</div>}
      <div className={card}>
        <h2 className="text-lg font-semibold text-gray-900">Brand colour</h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-3">Your page, buttons and highlights use this colour. Every option is checked to be easy to read in light and dark mode.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Brand colour">
          {[{ key: null, label: 'EAZyfoods green', primary: '#1f5b3a' }, ...f.accents].map((a) => (
            <button type="button" key={a.key ?? 'default'} aria-pressed={f.accent === a.key} onClick={() => set('accent', a.key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${f.accent === a.key ? 'border-primary-600 ring-2 ring-primary-200 bg-primary-50' : 'border-gray-300 hover:bg-gray-50'}`}>
              <span className="h-4 w-4 rounded-full border border-gray-200" style={{ background: a.primary }} aria-hidden="true" />{a.label}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="font-semibold" style={{ color: (acc ?? { primary: '#1f5b3a' }).primary }}>{store?.name}</p>
          {f.tagline && <p className="text-sm text-gray-600">{f.tagline}</p>}
          {f.announcement && <div className="mt-2 text-sm px-3 py-2 rounded-lg" style={{ background: (acc ?? { tint: '#dcefe2' }).tint }}>{f.announcement}</div>}
        </div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Words</h2>
        <div className="grid grid-cols-1 gap-4">
          <div><label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-1">Tagline</label><input id="tagline" className={input} maxLength={80} value={f.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} /><p className="text-xs text-gray-500 mt-1">One short line under your name.</p></div>
          <div><label htmlFor="announcement" className="block text-sm font-medium text-gray-700 mb-1">Announcement</label><input id="announcement" className={input} maxLength={140} value={f.announcement ?? ''} onChange={(e) => set('announcement', e.target.value)} /><p className="text-xs text-gray-500 mt-1">A highlighted note at the top, e.g. holiday hours. Only say what is true.</p></div>
          <div><label htmlFor="story" className="block text-sm font-medium text-gray-700 mb-1">Our story</label><textarea id="story" rows={4} className={input} maxLength={1200} value={f.story ?? ''} onChange={(e) => set('story', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[['website', 'Website'], ['instagram', 'Instagram'], ['facebook', 'Facebook']].map(([k, l]) => (
              <div key={k}><label htmlFor={k} className="block text-sm font-medium text-gray-700 mb-1">{l}</label><input id={k} type="text" inputMode="url" placeholder="https://" className={input} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></div>
            ))}
          </div>
        </div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-semibold text-gray-900">Featured <span className="text-sm font-normal text-gray-500">({f.featured_slugs.length}/8)</span></h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-3">Shown first on your page.</p>
        {f.products.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" role="group" aria-label="Featured">
            {f.products.map((p) => (
              <label key={p.slug} className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2">
                <input type="checkbox" checked={f.featured_slugs.includes(p.slug)} onChange={() => toggle(p.slug)} disabled={!f.featured_slugs.includes(p.slug) && f.featured_slugs.length >= 8} />{p.name}
              </label>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">Add products or dishes first.</p>}
      </div>
      <div className="flex justify-end"><button type="submit" disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"><Save className="h-5 w-5" />{saving ? 'Saving…' : 'Save storefront'}</button></div>
    </form>
  )
}
