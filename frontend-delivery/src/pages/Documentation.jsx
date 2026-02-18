import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FileText, Eye, Clock, Upload, X } from 'lucide-react'

const resolveDocUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = api.defaults.baseURL || ''
  const origin = base.replace(/\/api\/v1\/?$/, '')
  return origin ? `${origin}${url.startsWith('/') ? url : `/${url}`}` : url
}

const Documentation = () => {
  const { driver, refreshDriver } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [docViewUrl, setDocViewUrl] = useState(null)
  const [resubmitting, setResubmitting] = useState(false)
  const [resubmitForm, setResubmitForm] = useState({
    driver_license_file: null,
    driver_license_validity: '',
    vehicle_registration_file: null,
    vehicle_registration_validity: '',
    insurance_file: null,
    insurance_validity: '',
  })

  useEffect(() => {
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    try {
      const res = await api.get('/driver/documents')
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch documents:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  const docs = [
    { label: 'Driver Licence', url: data?.driver_license_url, validity: data?.driver_license_validity },
    { label: 'Vehicle Registration', url: data?.vehicle_registration_url, validity: data?.vehicle_registration_validity },
    { label: 'Insurance', url: data?.insurance_document_url, validity: data?.insurance_validity },
  ]

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Documentation</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">View your submitted documents (read-only)</p>
      </div>

      {data?.verification_status === 'approved' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Approved Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {docs.map((doc) => (
              <div key={doc.label} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">{doc.label}</div>
                {doc.url ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDocViewUrl(resolveDocUrl(doc.url))}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View document
                    </button>
                    {doc.validity && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Valid until: {new Date(doc.validity).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not submitted</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Documents cannot be deleted. Contact support if you need to update them.</p>
        </div>
      ) : null}

      {/* Document view popup (same tab) */}
      {docViewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={() => setDocViewUrl(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b flex-shrink-0">
              <span className="font-medium text-sm sm:text-base">Document</span>
              <button type="button" onClick={() => setDocViewUrl(null)} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
              {/\.(pdf)$/i.test(docViewUrl) ? (
                <iframe src={docViewUrl} title="Document" className="w-full min-h-[50vh] sm:min-h-[70vh] border-0 rounded" />
              ) : (
                <img src={docViewUrl} alt="Document" className="max-w-full h-auto max-h-[75vh] sm:max-h-[70vh] object-contain mx-auto" />
              )}
            </div>
          </div>
        </div>
      )}

      {data?.verification_status !== 'approved' ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-2">Documents Under Review</h2>
            <p className="text-amber-800">
              {data?.verification_status === 'pending'
                ? 'Your documents have been submitted and are awaiting admin verification. Once approved, they will appear here.'
                : data?.verification_status === 'rejected'
                ? 'Your verification was rejected. Please contact support or resubmit documents below.'
                : 'You have not submitted documents yet. Complete your profile to submit required documents.'}
            </p>
          </div>

          {(driver?.document_expired || driver?.document_expiring_soon || data?.verification_status === 'rejected') && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Resubmit documents
              </h2>
              <p className="text-sm text-gray-600 mb-4">Upload new documents and set validity dates. All three are required.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {[
                  { key: 'driver_license', label: 'Driver licence', fileKey: 'driver_license_file', validityKey: 'driver_license_validity' },
                  { key: 'vehicle_registration', label: 'Vehicle registration', fileKey: 'vehicle_registration_file', validityKey: 'vehicle_registration_validity' },
                  { key: 'insurance', label: 'Insurance', fileKey: 'insurance_file', validityKey: 'insurance_validity' },
                ].map(({ key, label, fileKey, validityKey }) => (
                  <div key={key} className="border rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="block w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 mb-2" onChange={(e) => setResubmitForm((f) => ({ ...f, [fileKey]: e.target.files?.[0] || null }))} />
                    <input type="date" className="block w-full rounded border border-gray-300 px-2 py-1 text-sm" value={resubmitForm[validityKey]} onChange={(e) => setResubmitForm((f) => ({ ...f, [validityKey]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={resubmitting || !resubmitForm.driver_license_file || !resubmitForm.vehicle_registration_file || !resubmitForm.insurance_file || !resubmitForm.driver_license_validity || !resubmitForm.vehicle_registration_validity || !resubmitForm.insurance_validity}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  setResubmitting(true)
                  try {
                    const upload = async (file) => {
                      const fd = new FormData()
                      fd.append('file', file)
                      const r = await api.post('/uploads/driver-documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                      return r.data?.url || r.data?.file_url
                    }
                    const [licenseUrl, regUrl, insUrl] = await Promise.all([
                      upload(resubmitForm.driver_license_file),
                      upload(resubmitForm.vehicle_registration_file),
                      upload(resubmitForm.insurance_file),
                    ])
                    await api.put('/driver/documents', {
                      driver_license_url: licenseUrl,
                      driver_license_validity: resubmitForm.driver_license_validity,
                      vehicle_registration_url: regUrl,
                      vehicle_registration_validity: resubmitForm.vehicle_registration_validity,
                      insurance_document_url: insUrl,
                      insurance_validity: resubmitForm.insurance_validity,
                    })
                    alert('Documents submitted for verification. You will be notified once approved.')
                    setResubmitForm({ driver_license_file: null, driver_license_validity: '', vehicle_registration_file: null, vehicle_registration_validity: '', insurance_file: null, insurance_validity: '' })
                    fetchDocs()
                    refreshDriver()
                  } catch (err) {
                    alert(err.response?.data?.detail || err.message || 'Failed to resubmit')
                  } finally {
                    setResubmitting(false)
                  }
                }}
              >
                {resubmitting ? 'Submitting…' : 'Submit for verification'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Documentation
