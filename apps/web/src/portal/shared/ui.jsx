import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useToasts } from './hooks'

export const Spinner = ({ className = 'h-64' }) => <div className={`flex items-center justify-center ${className}`}><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" role="status" aria-label="Loading" /></div>

export const PageHeader = ({ title, sub, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="min-w-0"><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{title}</h1>{sub && <p className="text-xs sm:text-sm text-gray-600 mt-1">{sub}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2 flex-shrink-0">{actions}</div>}
  </div>
)

export const Card = ({ title, sub, actions, children, className = '' }) => (
  <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 ${className}`}>
    {(title || actions) && <div className="flex items-start justify-between gap-3 mb-3"><div>{title && <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>}{sub && <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{sub}</p>}</div>{actions}</div>}
    {children}
  </section>
)

export const Stat = ({ label, value, sub, icon: Icon, tone = 'text-primary-500' }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1"><p className="text-xs sm:text-sm font-medium text-gray-600">{label}</p><p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 break-words">{value}</p>{sub && <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{sub}</p>}</div>
      {Icon && <Icon className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ml-2 ${tone}`} />}
    </div>
  </div>
)

const TONES = { green: 'bg-green-100 text-green-800', blue: 'bg-blue-100 text-blue-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800', gray: 'bg-gray-100 text-gray-800', purple: 'bg-purple-100 text-purple-800', indigo: 'bg-indigo-100 text-indigo-800' }
export const Badge = ({ tone = 'gray', children }) => <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${TONES[tone] || TONES.gray}`}>{children}</span>
const STATUS_TONE = { active: 'green', approved: 'green', published: 'green', sent: 'green', paid: 'green', delivered: 'green', verified: 'green', enabled: 'green', succeeded: 'green', open: 'blue', scheduled: 'blue', sending: 'blue', pending: 'yellow', submitted: 'yellow', requested: 'yellow', applied: 'yellow', draft: 'gray', paused: 'yellow', completed: 'purple', closed: 'gray', rejected: 'red', failed: 'red', suspended: 'red', cancelled: 'red', hidden: 'gray' }
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'gray'}>{String(status ?? '').replace(/_/g, ' ')}</Badge>

const BTN = { primary: 'bg-primary-600 text-white hover:bg-primary-700', secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50', danger: 'bg-red-600 text-white hover:bg-red-700', ghost: 'text-gray-700 hover:bg-gray-100', success: 'bg-green-700 text-white hover:bg-green-800' }
export const Button = ({ variant = 'primary', size = 'md', busy, className = '', children, ...rest }) => (
  <button type="button" {...rest} disabled={busy || rest.disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${size === 'sm' ? 'px-3 py-1.5 text-xs sm:text-sm' : 'px-4 py-2 text-sm'} ${BTN[variant]} ${className}`}>{busy ? 'Working…' : children}</button>
)

export const inputCls = 'w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50'
export const Field = ({ label, hint, htmlFor, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
)
export const Input = (p) => <input {...p} className={`${inputCls} ${p.className || ''}`} />
export const Select = ({ children, ...p }) => <select {...p} className={`${inputCls} ${p.className || ''}`}>{children}</select>
export const Textarea = (p) => <textarea rows={4} {...p} className={`${inputCls} ${p.className || ''}`} />

export const Switch = ({ checked, onChange, label, hint }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0"><p className="text-sm font-medium text-gray-800">{label}</p>{hint && <p className="text-xs text-gray-500">{hint}</p>}</div>
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
)

export const Alert = ({ tone = 'error', children }) => {
  if (!children) return null
  const c = { error: 'bg-red-50 border-red-200 text-red-700', ok: 'bg-green-50 border-green-200 text-green-800', warn: 'bg-amber-50 border-amber-200 text-amber-900', info: 'bg-primary-50 border-primary-100 text-primary-800' }[tone]
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`px-3 py-2 rounded-lg text-sm border ${c}`}>{children}</div>
}

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="text-center py-10 bg-white rounded-lg border border-gray-200">{Icon && <Icon className="h-10 w-10 text-gray-400 mx-auto mb-2" />}<p className="text-gray-700 font-medium">{title}</p>{children && <div className="mt-2 text-sm text-gray-500">{children}</div>}</div>
)

/** Table on desktop; on phones every row becomes a card so nothing needs sideways scrolling. */
export function DataTable({ columns, rows, rowKey = (r) => r.id, empty = 'Nothing here yet.', onRow }) {
  if (!rows?.length) return <Empty title={empty} />
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50"><tr>{columns.map((c) => <th key={c.key} scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${c.right ? 'text-right' : 'text-left'}`}>{c.header}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{rows.map((r) => <tr key={rowKey(r)} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'hover:bg-gray-50 cursor-pointer' : ''}>{columns.map((c) => <td key={c.key} className={`px-4 py-3 ${c.right ? 'text-right' : ''} ${c.nowrap === false ? '' : 'whitespace-nowrap'}`}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-gray-100">
        {rows.map((r) => (
          <li key={rowKey(r)} onClick={onRow ? () => onRow(r) : undefined} className="p-4 space-y-1.5">
            {columns.map((c) => <div key={c.key} className="flex items-start justify-between gap-3 text-sm"><span className="text-gray-500 flex-shrink-0">{c.header}</span><span className="text-right min-w-0 break-words">{c.render ? c.render(r) : r[c.key]}</span></div>)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} rounded-t-xl sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-900">{title}</h3><button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  )
}

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist">
    {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${value === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}{t.badge > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{t.badge}</span>}</button>)}
  </div>
)

export const Toasts = () => {
  const items = useToasts()
  return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] space-y-2" aria-live="polite">{items.map((t) => <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg text-sm text-white ${t.tone === 'error' ? 'bg-red-700' : 'bg-gray-900'}`}>{t.text}</div>)}</div>
}

export const confirmThen = (message, fn) => () => { if (window.confirm(message)) fn() }

/** Picks a picture, uploads it (public image store) and reports the stored address. */
import { useState as _useState } from 'react'
import { upload as _upload, errText as _errText } from './client'
export function ImageUpload({ value, onChange, label = 'Picture' }) {
  const [busy, setBusy] = _useState(false)
  const [err, setErr] = _useState('')
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange((await _upload('/uploads/image', f)).url) } catch (x) { setErr(_errText(x)) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 overflow-hidden bg-gray-50">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500 text-center px-1">{busy ? 'Uploading…' : 'Add'}</span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label={label} onChange={pick} />
      </label>
      <div className="text-xs"><p className="text-gray-500">JPEG, PNG or WebP, up to 5 MB.</p>{value && <button type="button" onClick={() => onChange(null)} className="text-red-700 hover:underline">Remove</button>}{err && <p role="alert" className="text-red-700">{err}</p>}</div>
    </div>
  )
}

/** Short silent video (MP4 or WebM, up to 25 MB), stored on our side. */
export function VideoUpload({ value, onChange, label = 'Video' }) {
  const [busy, setBusy] = _useState(false)
  const [err, setErr] = _useState('')
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange((await _upload('/uploads/video', f)).url) } catch (x) { setErr(_errText(x)) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">{busy ? 'Uploading…' : value ? 'Replace video' : 'Add video'}
        <input type="file" accept="video/mp4,video/webm" className="hidden" aria-label={label} onChange={pick} /></label>
      {value && <><video src={value} muted className="h-16 rounded" aria-label={`${label} preview`} /><button type="button" onClick={() => onChange(null)} className="text-xs text-red-700 hover:underline">Remove</button></>}
      {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
    </div>
  )
}
