import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Calendar, ToggleLeft, ToggleRight } from 'lucide-react'

const DEFAULT_OCCASIONS = [
  { id: 'ramadan',          month: 3,  day: 1,  window: 21, emoji: '🌙', title: 'Ramadan Season',           sub: 'Stock up for Iftar & Suhoor',                   search: 'dates rice lamb chicken',   color: 'from-purple-600 to-indigo-700', enabled: true },
  { id: 'eid',              month: 4,  day: 10, window: 14, emoji: '🎊', title: 'Eid al-Fitr',               sub: 'Celebrate with family favourites',               search: 'lamb biryani sweets dates',  color: 'from-amber-500 to-orange-600',  enabled: true },
  { id: 'juneteenth',       month: 6,  day: 16, window: 21, emoji: '✊', title: 'Juneteenth',                sub: 'Celebrate with soul food essentials',            search: 'cornbread greens yams',      color: 'from-red-600 to-black',         enabled: true },
  { id: 'caribana',         month: 8,  day: 1,  window: 31, emoji: '🥁', title: 'Caribana Season',           sub: 'Caribbean & African flavours all month',         search: 'scotch bonnet plantain jerk', color: 'from-yellow-400 to-red-500',   enabled: true },
  { id: 'nigeria_ind',      month: 10, day: 1,  window: 14, emoji: '🦅', title: "Nigeria's Independence",    sub: 'Taste of home — shop Nigerian staples',          search: 'egusi ogbono stockfish',     color: 'from-green-600 to-green-800',   enabled: true },
  { id: 'kwanzaa',          month: 12, day: 26, window: 7,  emoji: '🕯️', title: 'Kwanzaa',                   sub: 'Shop for the seven-day celebration',             search: 'yam cassava greens',         color: 'from-red-700 to-black',         enabled: true },
  { id: 'gena',             month: 12, day: 25, window: 10, emoji: '⛪', title: 'Ethiopian Gena (Christmas)', sub: 'Traditional Doro Wat & Injera ingredients',     search: 'berbere injera lentils',     color: 'from-yellow-500 to-red-600',    enabled: true },
  { id: 'african_heritage', month: 2,  day: 1,  window: 28, emoji: '✊', title: 'African Heritage Month',    sub: 'Discover authentic African cuisine all month',   search: '',                           color: 'from-amber-600 to-orange-700',  enabled: true },
]

const GRADIENTS = [
  { label: 'Purple → Indigo',  value: 'from-purple-600 to-indigo-700' },
  { label: 'Amber → Orange',   value: 'from-amber-500 to-orange-600' },
  { label: 'Red → Black',      value: 'from-red-600 to-black' },
  { label: 'Yellow → Red',     value: 'from-yellow-400 to-red-500' },
  { label: 'Green (dark)',      value: 'from-green-600 to-green-800' },
  { label: 'Dark Red → Black', value: 'from-red-700 to-black' },
  { label: 'Yellow → Red 2',   value: 'from-yellow-500 to-red-600' },
  { label: 'Amber → Orange 2', value: 'from-amber-600 to-orange-700' },
  { label: 'Blue → Purple',    value: 'from-blue-600 to-purple-700' },
  { label: 'Teal → Green',     value: 'from-teal-500 to-green-600' },
  { label: 'Pink → Red',       value: 'from-pink-500 to-red-600' },
  { label: 'Indigo → Blue',    value: 'from-indigo-600 to-blue-700' },
  { label: 'Emerald → Teal',   value: 'from-emerald-500 to-teal-600' },
  { label: 'Rose → Orange',    value: 'from-rose-500 to-orange-500' },
  { label: 'Violet → Purple',  value: 'from-violet-600 to-purple-700' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const makeId = () => `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const newBlank = () => ({
  id: makeId(),
  month: new Date().getMonth() + 1,
  day: 1,
  window: 14,
  emoji: '🎉',
  title: '',
  sub: '',
  search: '',
  color: 'from-primary-600 to-primary-800',
  enabled: true,
  _isNew: true,
})

const BannerPreview = ({ o }) => (
  <div className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${o.color || 'from-gray-400 to-gray-600'} text-white shadow-lg`}>
    <span className="text-4xl flex-shrink-0">{o.emoji || '🎉'}</span>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-base leading-tight">{o.title || 'Occasion Title'}</p>
      <p className="text-white/85 text-xs mt-0.5">{o.sub || 'Subtitle appears here'}</p>
    </div>
    <span className="flex-shrink-0 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold">Shop Now →</span>
  </div>
)

const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-6 w-10 flex-shrink-0 items-center rounded-full transition-colors ${value ? 'bg-primary-600' : 'bg-gray-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
)

export default function CulturalOccasions() {
  const [globalEnabled, setGlobalEnabled] = useState(true)
  const [forceId, setForceId] = useState('')
  const [occasions, setOccasions] = useState(DEFAULT_OCCASIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/settings/marketing_occasions')
      const data = res.data?.settings || {}
      if (data.enabled !== undefined) setGlobalEnabled(data.enabled)
      if (data.force_occasion_id !== undefined) setForceId(data.force_occasion_id || '')
      if (Array.isArray(data.occasions) && data.occasions.length > 0) {
        const savedMap = Object.fromEntries(data.occasions.map(o => [o.id, o]))
        // Merge defaults with saved data; also keep any custom occasions not in defaults
        const defaultIds = new Set(DEFAULT_OCCASIONS.map(d => d.id))
        const merged = DEFAULT_OCCASIONS.map(d => savedMap[d.id] ? { ...d, ...savedMap[d.id] } : d)
        const extras = data.occasions.filter(o => !defaultIds.has(o.id))
        setOccasions([...merged, ...extras])
      }
    } catch (_) {}
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    setSavedMsg('')
    try {
      await api.put('/admin/settings/marketing_occasions', {
        settings: { enabled: globalEnabled, force_occasion_id: forceId || null, occasions }
      })
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 3000)
    } catch (e) {
      setSavedMsg('Error: ' + (e.response?.data?.detail || e.message))
    }
    setSaving(false)
  }

  const update = (id, field, value) => setOccasions(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o))

  const addNew = () => {
    const blank = newBlank()
    setOccasions(prev => [...prev, blank])
    setExpandedId(blank.id)
    setTimeout(() => document.getElementById(`occ-title-${blank.id}`)?.focus(), 100)
  }

  const confirmDelete = (id) => setDeleteConfirm(id)
  const doDelete = (id) => {
    setOccasions(prev => prev.filter(o => o.id !== id))
    if (expandedId === id) setExpandedId(null)
    if (previewId === id) setPreviewId(null)
    if (forceId === id) setForceId('')
    setDeleteConfirm(null)
  }

  const now = new Date()
  const autoActive = occasions.find(o => {
    if (!o.enabled) return false
    const oDate = new Date(now.getFullYear(), o.month - 1, o.day)
    const diff = (oDate - now) / 86400000
    return diff >= -3 && diff <= o.window
  })
  const previewOccasion = previewId
    ? occasions.find(o => o.id === previewId)
    : forceId
    ? occasions.find(o => o.id === forceId)
    : autoActive

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  )

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary-600" />
            Cultural Occasions Banner
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control the contextual banner on the customer home page. Activates automatically around cultural events — or force any occasion at any time.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 text-sm"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : savedMsg || 'Save Changes'}
        </button>
      </div>

      {/* Global settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Global Settings</h2>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <p className="font-medium text-gray-900 text-sm">Banner Enabled</p>
            <p className="text-xs text-gray-500">When off, no banner appears on the home page regardless of date</p>
          </div>
          <Toggle value={globalEnabled} onChange={setGlobalEnabled} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Force a Specific Occasion</label>
          <p className="text-xs text-gray-500 mb-2">Override date logic — always show this banner. Leave blank for auto date-based selection. Use this to test how a banner looks on the live site.</p>
          <select
            value={forceId}
            onChange={e => setForceId(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Auto (date-driven)</option>
            {occasions.map(o => <option key={o.id} value={o.id}>{o.emoji} {o.title || '(unnamed)'}</option>)}
          </select>
        </div>

        <div className={`rounded-lg p-3 text-sm ${!globalEnabled ? 'bg-gray-50 text-gray-500' : forceId ? 'bg-amber-50 text-amber-800 border border-amber-200' : autoActive ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {!globalEnabled
            ? 'Banner is disabled — not showing to customers'
            : forceId
            ? `Forced: ${occasions.find(o => o.id === forceId)?.emoji} ${occasions.find(o => o.id === forceId)?.title || forceId}`
            : autoActive
            ? `Auto-active today: ${autoActive.emoji} ${autoActive.title}`
            : 'No occasion active right now (none in date range)'}
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </h2>
        {!globalEnabled ? (
          <div className="flex items-center justify-center h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">Banner is disabled</p>
          </div>
        ) : previewOccasion ? (
          <BannerPreview o={previewOccasion} />
        ) : (
          <div className="flex items-center justify-center h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">No active occasion — click Preview on one below</p>
          </div>
        )}
        {previewId && (
          <button onClick={() => setPreviewId(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Clear preview</button>
        )}
      </div>

      {/* Occasions list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Occasions ({occasions.filter(o => o.enabled).length}/{occasions.length} enabled)
          </h2>
          <button
            onClick={addNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Occasion
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {occasions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Sparkles className="h-10 w-10 mb-3" />
              <p className="text-sm">No occasions yet. Click "Add Occasion" to create one.</p>
            </div>
          )}

          {occasions.map(o => (
            <div key={o.id}>
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer select-none"
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              >
                <Toggle value={!!o.enabled} onChange={v => update(o.id, 'enabled', v)} />
                <span className="text-2xl flex-shrink-0 w-8 text-center">{o.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${o.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {o.title || <span className="italic text-gray-400">Unnamed occasion</span>}
                    {o._isNew && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded font-medium">New</span>}
                  </p>
                  <p className="text-xs text-gray-400">{MONTHS[(o.month || 1) - 1]} {o.day} · {o.window} days</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPreviewId(previewId === o.id ? null : o.id) }}
                    title="Preview this banner"
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${previewId === o.id ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); confirmDelete(o.id) }}
                    title="Delete occasion"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {expandedId === o.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Delete confirm */}
              {deleteConfirm === o.id && (
                <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
                  <p className="text-sm text-red-700">Delete <strong>{o.title || 'this occasion'}</strong>? This cannot be undone.</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={() => doDelete(o.id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                  </div>
                </div>
              )}

              {/* Editor */}
              {expandedId === o.id && (
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-5 space-y-4">
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Preview</p>
                    <BannerPreview o={o} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Emoji</label>
                      <input
                        type="text"
                        value={o.emoji}
                        maxLength={4}
                        onChange={e => update(o.id, 'emoji', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 text-center text-xl"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gradient Color</label>
                      <select
                        value={o.color}
                        onChange={e => update(o.id, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        {GRADIENTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Banner Title</label>
                      <input
                        id={`occ-title-${o.id}`}
                        type="text"
                        value={o.title}
                        onChange={e => update(o.id, 'title', e.target.value)}
                        placeholder="e.g. Caribana Season"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={o.sub}
                        onChange={e => update(o.id, 'sub', e.target.value)}
                        placeholder="e.g. Caribbean & African flavours all month"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Product Search Keywords <span className="text-gray-400 font-normal">(space-separated — what the Shop Now button searches for)</span>
                      </label>
                      <input
                        type="text"
                        value={o.search}
                        onChange={e => update(o.id, 'search', e.target.value)}
                        placeholder="e.g. jerk plantain scotch bonnet"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Month</label>
                      <select
                        value={o.month}
                        onChange={e => update(o.id, 'month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Day</label>
                      <input
                        type="number" min={1} max={31}
                        value={o.day}
                        onChange={e => update(o.id, 'day', Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Show for (days)</label>
                      <input
                        type="number" min={1} max={365}
                        value={o.window}
                        onChange={e => update(o.id, 'window', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Enabled</label>
                        <Toggle value={!!o.enabled} onChange={v => update(o.id, 'enabled', v)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={addNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add Another Occasion
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 text-sm"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : savedMsg || 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}
