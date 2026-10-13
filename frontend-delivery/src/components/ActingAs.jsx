import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import api from '../services/api'

const STORAGE_KEY = 'acting_as'

/**
 * Login-free mode: choose which account this portal acts as. The id is sent on every request as the
 * matching X-<Role>-Id header (see services/api.js); with no choice the API uses the oldest active account.
 */
const ActingAs = ({ role, label }) => {
  const [options, setOptions] = useState([])
  const current = (() => { try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' } })()

  useEffect(() => {
    let cancelled = false
    api.get(`/identities/${role}`)
      .then((res) => { if (!cancelled && Array.isArray(res.data)) setOptions(res.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [role])

  if (options.length < 2) return null // nothing to switch between

  const change = (e) => {
    try {
      if (e.target.value) localStorage.setItem(STORAGE_KEY, e.target.value)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* storage unavailable */ }
    window.location.reload()
  }

  return (
    <div className="mb-3 px-1">
      <label htmlFor="acting-as" className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <Users className="h-3.5 w-3.5" /> Acting as
      </label>
      <select id="acting-as" value={current} onChange={change} className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
        <option value="">{label || 'Default account'}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}{o.status && o.status !== 'active' ? ` (${o.status})` : ''}</option>)}
      </select>
    </div>
  )
}

export default ActingAs
