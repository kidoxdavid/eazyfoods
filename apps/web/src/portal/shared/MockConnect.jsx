import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { makeHttp } from '../http'

const { raw } = makeHttp('vendor')

/** While payments run in test mode: says so, and lets the person finish the simulated payout-account setup. onDone reloads the page's status. */
export default function MockConnect({ onDone }) {
  const [sp, setSp] = useSearchParams()
  const id = sp.get('mock_connect')
  const [test, setTest] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { raw('GET', '/vendor/payouts').then((r) => setTest(r.account?.provider === 'mock')).catch(() => {}) }, [])
  if (!test && !id) return null
  const finish = async () => {
    setBusy(true); setError('')
    try { await raw('POST', `/dev/connect/${id}/complete`, {}); await raw('POST', '/vendor/payout-account/refresh', {}); setSp({}); onDone?.() } catch (e) { setError(e.response?.data?.detail || e.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2">
      {test && <div className="px-3 py-2 text-xs sm:text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg" role="note"><strong>TEST MODE.</strong> Payouts here are simulated: no real money moves.</div>}
      {id && (
        <div className="px-3 py-2 text-sm bg-primary-50 border border-primary-200 rounded-lg flex flex-wrap items-center gap-3">
          <span><strong>Test onboarding.</strong> You are on the simulated onboarding page.</span>
          <button type="button" disabled={busy} onClick={finish} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">Finish test onboarding</button>
          {error && <span className="text-red-700">{error}</span>}
        </div>
      )}
    </div>
  )
}
