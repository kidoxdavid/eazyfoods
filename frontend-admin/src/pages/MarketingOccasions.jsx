import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save, Eye, EyeOff, ToggleLeft, ToggleRight, Calendar, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

const DEFAULT_OCCASIONS = [
  { id: 'ramadan',       month: 3,  day: 1,  window: 21, emoji: '🌙', title: 'Ramadan Season',          sub: 'Stock up for Iftar & Suhoor',                  search: 'dates rice lamb chicken',  color: 'from-purple-600 to-indigo-700',  enabled: true },
  { id: 'eid',           month: 4,  day: 10, window: 14, emoji: '🎊', title: 'Eid al-Fitr',              sub: 'Celebrate with family favourites',              search: 'lamb biryani sweets dates', color: 'from-amber-500 to-orange-600',   enabled: true },
  { id: 'juneteenth',    month: 6,  day: 16, window: 21, emoji: '✊', title: 'Juneteenth',               sub: 'Celebrate with soul food essentials',           search: 'cornbread greens yams',     color: 'from-red-600 to-black',          enabled: true },
  { id: 'caribana',      month: 8,  day: 1,  window: 31, emoji: '🥁', title: 'Caribana Season',          sub: 'Caribbean & African flavours all month',        search: 'scotch bonnet plantain jerk',color: 'from-yellow-400 to-red-500',    enabled: true },
  { id: 'nigeria_ind',   month: 10, day: 1,  window: 14, emoji: '🦅', title: "Nigeria's Independence",   sub: 'Taste of home — shop Nigerian staples',         search: 'egusi ogbono stockfish',    color: 'from-green-600 to-green-800',   enabled: true },
  { id: 'kwanzaa',       month: 12, day: 26, window: 7,  emoji: '🕯️', title: 'Kwanzaa',                  sub: 'Shop for the seven-day celebration',            search: 'yam cassava greens',        color: 'from-red-700 to-black',          enabled: true },
  { id: 'gena',          month: 12, day: 25, window: 10, emoji: '⛪', title: 'Ethiopian Gena (Christmas)',sub: 'Traditional Doro Wat & Injera ingredients',    search: 'berbere injera lentils',    color: 'from-yellow-500 to-red-600',    enabled: true },
  { id: 'african_heritage', month: 2, day: 1, window: 28, emoji: '✊', title: 'African Heritage Month',  sub: 'Discover authentic African cuisine all month', search: '',                          color: 'from-amber-600 to-orange-700',   enabled: true },
]

const GRADIENT_OPTIONS = [
  { label: 'Purple → Indigo', value: 'from-purple-600 to-indigo-700' },
  { label: 'Amber → Orange',  value: 'from-amber-500 to-orange-600' },
  { label: 'Red → Black',     value: 'from-red-600 to-black' },
  { label: 'Yellow → Red',    value: 'from-yellow-400 to-red-500' },
  { label: 'Green (dark)',     value: 'from-green-600 to-green-800' },
  { label: 'Red → Black 2',   value: 'from-red-700 to-black' },
  { label: 'Yellow → Red 2',  value: 'from-yellow-500 to-red-600' },
  { label: 'Amber → Orange 2',value: 'from-amber-600 to-orange-700' },
  { label: 'Blue → Purple',   value: 'from-blue-600 to-purple-700' },
  { label: 'Teal → Green',    value: 'from-teal-500 to-green-600' },
  { label: 'Pink → Red',      value: 'from-pink-500 to-red-600' },
  { label: 'Indigo → Blue',   value: 'from-indigo-600 to-blue-700' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const BannerPreview = ({ occasion }) => (
  <div className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${occasion.color} text-white shadow-lg`}>
    <span className="text-4xl flex-shrink-0">{occasion.emoji}</span>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-base leading-tight">{occasion.title || 'Occasion Title'}</p>
      <p className="text-white/85 text-xs mt-0.5">{occasion.sub || 'Occasion subtitle appears here'}</p>
    </div>
    <span className="flex-shrink-0 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
      Shop Now →
    </span>
  </div>
)

const MarketingOccasions = () => {
  const [globalEnabled, setGlobalEnabled] = useState(true)
  const [forceId, setForceId] = useState('')
  const [occasions, setOccasions] = useState(DEFAULT_OCCASIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [previewId, setPreviewId] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/settings/marketing_occasions')
      const data = res.data?.settings || {}
      if (data.enabled !== undefined) setGlobalEnabled(data.enabled)
      if (data.force_occasion_id !== undefined) setForceId(data.force_occasion_id || '')
      if (Array.isArray(data.occasions) && data.occasions.length > 0) {
        // Merge saved occasions with defaults so new defaults always appear
        const savedMap = Object.fromEntries(data.occasions.map(o => [o.id, o]))
        setOccasions(DEFAULT_OCCASIONS.map(d => savedMap[d.id] ? { ...d, ...savedMap[d.id] } : d))
      }
    } catch (_) {
      // First time — use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await api.put('/admin/settings/marketing_occasions', {
        settings: { enabled: globalEnabled, force_occasion_id: forceId || null, occasions }
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  const updateOccasion = (id, field, value) => {
    setOccasions(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o))
  }

  const activePreview = previewId ? occasions.find(o => o.id === previewId) : null
  const autoActive = (() => {
    const now = new Date()
    return occasions.find(o => {
      const oDate = new Date(now.getFullYear(), o.month - 1, o.day)
      const diff = (oDate - now) / 86400000
      return diff >= -3 && diff <= o.window && o.enabled
    })
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary-600" />
              Cultural Occasions Banner
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Control the contextual banner that appears on the customer home page around cultural events
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Global controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Global Settings</h2>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-medium text-gray-900">Banner Enabled</p>
            <p className="text-sm text-gray-500">Show the cultural occasions banner on the customer home page</p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalEnabled(v => !v)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${globalEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${globalEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Force a specific occasion (override date logic)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Leave blank to let the banner auto-activate based on the date. Select an occasion to always show it regardless of date (great for testing or promotions).
          </p>
          <select
            value={forceId}
            onChange={e => setForceId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Auto (date-driven)</option>
            {occasions.map(o => (
              <option key={o.id} value={o.id}>{o.emoji} {o.title}</option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">Currently active banner</p>
          <p className="text-xs text-blue-700 mt-0.5">
            {!globalEnabled
              ? 'Banner is disabled — not showing to customers'
              : forceId
              ? `Forced: ${occasions.find(o => o.id === forceId)?.title || forceId}`
              : autoActive
              ? `Auto-active: ${autoActive.emoji} ${autoActive.title}`
              : 'No occasion currently active (none in date range)'}
          </p>
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-500" />
          Preview
        </h2>
        <p className="text-xs text-gray-500 mb-4">Click "Preview" on any occasion below to see it here, or the active one is shown by default.</p>
        {(() => {
          const previewOccasion = activePreview || (forceId ? occasions.find(o => o.id === forceId) : autoActive)
          if (!globalEnabled) {
            return (
              <div className="flex items-center justify-center h-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">Banner is disabled</p>
              </div>
            )
          }
          if (!previewOccasion) {
            return (
              <div className="flex items-center justify-center h-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">No occasion selected — select one below to preview</p>
              </div>
            )
          }
          return <BannerPreview occasion={previewOccasion} />
        })()}
      </div>

      {/* Per-occasion controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            Occasions ({occasions.filter(o => o.enabled).length} of {occasions.length} enabled)
          </h2>
          <p className="text-xs text-gray-500">Click an occasion to expand and edit</p>
        </div>

        <div className="divide-y divide-gray-100">
          {occasions.map(occasion => (
            <div key={occasion.id}>
              {/* Row header */}
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === occasion.id ? null : occasion.id)}
              >
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); updateOccasion(occasion.id, 'enabled', !occasion.enabled) }}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors flex-shrink-0 ${occasion.enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${occasion.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className="text-2xl flex-shrink-0">{occasion.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{occasion.title}</p>
                  <p className="text-xs text-gray-500">{MONTHS[occasion.month - 1]} {occasion.day} · {occasion.window}-day window</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPreviewId(previewId === occasion.id ? null : occasion.id) }}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 border transition-colors ${previewId === occasion.id ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  {expandedId === occasion.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded editor */}
              {expandedId === occasion.id && (
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-5 space-y-4">
                  {/* Live mini-preview */}
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-600 mb-2">Live preview</p>
                    <BannerPreview occasion={occasion} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Emoji</label>
                      <input
                        type="text"
                        value={occasion.emoji}
                        onChange={e => updateOccasion(occasion.id, 'emoji', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Gradient Color</label>
                      <select
                        value={occasion.color}
                        onChange={e => updateOccasion(occasion.id, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        {GRADIENT_OPTIONS.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Banner Title</label>
                      <input
                        type="text"
                        value={occasion.title}
                        onChange={e => updateOccasion(occasion.id, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={occasion.sub}
                        onChange={e => updateOccasion(occasion.id, 'sub', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product Search Terms <span className="text-gray-400 font-normal">(space-separated keywords for the Shop Now link)</span>
                      </label>
                      <input
                        type="text"
                        value={occasion.search}
                        onChange={e => updateOccasion(occasion.id, 'search', e.target.value)}
                        placeholder="e.g. dates rice lamb chicken"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Month</label>
                      <select
                        value={occasion.month}
                        onChange={e => updateOccasion(occasion.id, 'month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Day</label>
                      <input
                        type="number"
                        min={1} max={31}
                        value={occasion.day}
                        onChange={e => updateOccasion(occasion.id, 'day', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Show for (days after start)
                      </label>
                      <input
                        type="number"
                        min={1} max={90}
                        value={occasion.window}
                        onChange={e => updateOccasion(occasion.id, 'window', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}

export default MarketingOccasions
