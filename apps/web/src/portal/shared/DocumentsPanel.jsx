import { useCallback, useEffect, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { makeHttp } from '../http'

const { raw } = makeHttp('vendor')

const KINDS = [
  ['business_licence', 'Business licence'], ['gst_registration', 'GST registration'], ['food_premises_permit', 'Food premises permit'], ['food_handler_cert', 'Food handler certificate'],
  ['id', 'Government ID'], ['other', 'Other'],
]
const STATUS = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', verified: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' }

/** The business documents the team verifies. Files are private: only the team can open them. */
export default function DocumentsPanel() {
  const [docs, setDocs] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(() => raw('GET', '/vendor/documents').then(setDocs).catch(() => setDocs([])), [])
  useEffect(() => { load() }, [load])

  const upload = async (kind, file) => {
    if (!file) return
    setBusy(kind); setError('')
    try {
      const fd = new FormData(); fd.append('file', file)
      await raw('POST', `/vendor/documents?kind=${kind}`, fd, { isForm: true })
      await load()
    } catch (e) { setError(e.response?.data?.detail || e.message || 'Upload failed') } finally { setBusy('') }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2"><FileText className="h-4 w-4 sm:h-5 sm:w-5" /> Documents for verification</h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-4">JPEG, PNG or PDF, up to 5 MB each. Only the EAZyfoods team can open them.</p>
      {error && <p className="mb-3 text-sm text-red-700" role="alert">{error}</p>}
      <ul className="divide-y divide-gray-100">
        {KINDS.map(([kind, label]) => {
          const mine = docs.filter((d) => d.kind === kind)
          return (
            <li key={kind} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {mine.map((d) => (
                  <p key={d.id} className="text-xs text-gray-600 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS[d.status] || 'bg-gray-100 text-gray-700'}`}>{d.status}</span>
                    <span className="ml-2">{new Date(d.created_at).toLocaleDateString()}</span>
                    {d.review_note && <span className="ml-2 text-red-700">{d.review_note}</span>}
                  </p>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 self-start">
                <Upload className="h-4 w-4" /> {busy === kind ? 'Uploading…' : mine.length ? 'Upload another' : 'Upload'}
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" disabled={!!busy} aria-label={`Upload ${label}`} onChange={(e) => { upload(kind, e.target.files?.[0]); e.target.value = '' }} />
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
