import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Circle } from 'lucide-react'
import { makeHttp } from '../http'

const { raw } = makeHttp('vendor')

/** Where each setup step is done, in the vendor portal and in the kitchen portal. */
const LINKS = {
  vendor: { business_details: '/profile', store_location: '/profile', hours: '/profile', regions: '/profile', fulfilment: '/profile', documents: '/documentation', payout: '/payouts', products: '/products/new' },
  chef: { business_details: '/profile', store_location: '/profile', hours: '/settings', regions: '/profile', fulfilment: '/profile', documents: '/documentation', payout: '/payouts', products: '/cuisines/new' },
}

/**
 * The real setup checklist from the server. Once the required steps are done the owner accepts the agreement and sends the application for review.
 * After approval the card disappears (optional steps stay in the menu pages).
 */
export default function OnboardingCard({ variant = 'vendor' }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(() => raw('GET', '/vendor/onboarding').then(setData).catch(() => setData(null)), [])
  useEffect(() => { load() }, [load])
  if (!data || data.vendor_status === 'approved') return null

  const links = LINKS[variant]
  const required = data.items.filter((i) => i.required)
  const missing = required.filter((i) => !i.done && i.key !== 'agreement')
  const agreement = data.items.find((i) => i.key === 'agreement')
  const submitted = data.vendor_status !== 'draft'
  const act = async (fn) => { setBusy(true); setError(''); try { await fn(); await load() } catch (e) { setError(e.response?.data?.detail || e.message) } finally { setBusy(false) } }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-4 sm:p-5 lg:p-6" role="region" aria-label="Application status">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{submitted ? 'Your application is being reviewed' : 'Finish setting up, then send your application'}</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {submitted ? 'The EAZyfoods team checks your details and documents. You will be told when you are approved; you can keep adding products meanwhile.'
              : 'Complete the required steps below. Our team reviews every application before a store or kitchen goes live.'}
          </p>
        </div>
        {!submitted && (
          <div className="flex flex-col sm:items-end gap-2">
            {agreement && !agreement.done && missing.length === 0 && (
              <button disabled={busy} onClick={() => act(() => raw('POST', '/vendor/agreement/accept', {}))} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">Accept the vendor agreement</button>
            )}
            {data.can_submit && (
              <button disabled={busy} onClick={() => act(() => raw('POST', '/vendor/submit', {}))} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">Submit for review</button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.items.map((i) => (
          <li key={i.key} className="flex items-start gap-2 text-sm">
            {i.done ? <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" /> : <Circle className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />}
            <div className="min-w-0">
              {links[i.key] && !i.done ? <Link to={links[i.key]} className="font-medium text-primary-700 hover:underline">{i.label}{i.required ? '' : ' (optional)'}</Link> : <span className={i.done ? 'text-gray-600' : 'font-medium text-gray-900'}>{i.label}{!i.required && !i.done ? ' (optional)' : ''}</span>}
              {!i.done && <p className="text-xs text-gray-500">{i.hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
