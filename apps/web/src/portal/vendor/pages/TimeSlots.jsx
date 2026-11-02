import { useEffect, useState } from 'react'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { makeHttp } from '../../http'

const { raw } = makeHttp('vendor')

/** Time slots: let customers choose a time window for pickup or delivery ("tomorrow 4–5 pm"), and close days off. */
const TimeSlots = () => {
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [day, setDay] = useState('')
  const [why, setWhy] = useState('')

  useEffect(() => { raw('GET', '/vendor/stores').then((s) => { setStores(s); if (s[0]) setStoreId(s[0].id) }).catch((e) => setErr(e.message)) }, [])
  useEffect(() => {
    if (!storeId) return
    setForm(null); setMsg(''); setErr('')
    raw('GET', `/vendor/stores/${storeId}/schedule`).then((d) => setForm({ ...d, closures: d.closures || [] })).catch((e) => setErr(e.message))
  }, [storeId])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(''); setErr('')
    try {
      await raw('PUT', `/vendor/stores/${storeId}/schedule`, {
        preorders_enabled: !!form.preorders_enabled, preorder_lead_minutes: Number(form.preorder_lead_minutes), preorder_max_days: Number(form.preorder_max_days),
        slot_minutes: Number(form.slot_minutes), slot_capacity: Number(form.slot_capacity), closures: form.closures,
      })
      setMsg('Saved. Customers see the new times straight away.')
    } catch (er) { setErr(er.response?.data?.detail || er.message || 'Could not save.') } finally { setSaving(false) }
  }
  const addClosure = () => { if (!day) return; if (form.closures.some((c) => c.on_date === day)) return; set('closures', [...form.closures, { on_date: day, reason: why.trim() || null }].sort((a, b) => a.on_date.localeCompare(b.on_date))); setDay(''); setWhy('') }

  const input = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500'
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2"><CalendarClock className="h-6 w-6 text-primary-600" /> Time slots</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Let customers pick a time window for pickup or delivery, for example tomorrow between 4 and 5 pm. Each window has a limit on how many orders it takes.</p>
      </div>
      {stores.length > 1 && (
        <div><label htmlFor="slot-store" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Store</label>
          <select id="slot-store" value={storeId} onChange={(e) => setStoreId(e.target.value)} className={input}>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>)}
      {err && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{err}</div>}
      {form && (
        <form onSubmit={save} className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-900">
              <input type="checkbox" checked={!!form.preorders_enabled} onChange={(e) => set('preorders_enabled', e.target.checked)} />
              Offer time slots to customers
            </label>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${form.preorders_enabled ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!form.preorders_enabled}>
              <div><label htmlFor="slot-lead" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Shortest notice (minutes)</label>
                <input id="slot-lead" type="number" min={30} max={2880} step={15} value={form.preorder_lead_minutes} onChange={(e) => set('preorder_lead_minutes', e.target.value)} className={input} /></div>
              <div><label htmlFor="slot-days" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Book up to (days ahead)</label>
                <input id="slot-days" type="number" min={1} max={14} value={form.preorder_max_days} onChange={(e) => set('preorder_max_days', e.target.value)} className={input} /></div>
              <div><label htmlFor="slot-len" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Length of each window</label>
                <select id="slot-len" value={form.slot_minutes} onChange={(e) => set('slot_minutes', e.target.value)} className={input}>{[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></div>
              <div><label htmlFor="slot-cap" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Orders per window</label>
                <input id="slot-cap" type="number" min={1} max={50} value={form.slot_capacity} onChange={(e) => set('slot_capacity', e.target.value)} className={input} /></div>
            </div>
            <p className="text-xs text-gray-500">Windows follow your opening hours (Profile). Your time zone is {form.timezone}.</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Days closed</h2>
            <p className="text-xs text-gray-500">No windows are offered on these days.</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[9rem]"><label htmlFor="slot-day" className="block text-xs font-medium text-gray-700 mb-1">Date</label><input id="slot-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className={input} /></div>
              <div className="flex-1 min-w-[9rem]"><label htmlFor="slot-why" className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label><input id="slot-why" value={why} maxLength={80} onChange={(e) => setWhy(e.target.value)} className={input} /></div>
              <button type="button" onClick={addClosure} className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50"><Plus className="h-4 w-4" /> Add</button>
            </div>
            {form.closures.length > 0 && (
              <ul className="divide-y divide-gray-100">{form.closures.map((c) => (
                <li key={c.on_date} className="flex items-center justify-between gap-2 py-2 text-sm"><span><strong>{c.on_date}</strong>{c.reason ? <span className="text-gray-500"> · {c.reason}</span> : null}</span>
                  <button type="button" aria-label={`Remove ${c.on_date}`} onClick={() => set('closures', form.closures.filter((x) => x.on_date !== c.on_date))} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="h-4 w-4" /></button></li>))}</ul>)}
          </div>
          {msg && <div role="status" className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm">{msg}</div>}
          <div className="flex justify-end"><button type="submit" disabled={saving} className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 text-sm font-medium">{saving ? 'Saving…' : 'Save time slots'}</button></div>
        </form>)}
    </div>
  )
}

export default TimeSlots
