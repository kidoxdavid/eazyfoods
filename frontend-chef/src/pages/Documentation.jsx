import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FileText, Eye, X } from 'lucide-react'

const resolveDocUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = api.defaults.baseURL || ''
  const origin = base.replace(/\/api\/v1\/?$/, '')
  return origin ? `${origin}${url.startsWith('/') ? url : `/${url}`}` : url
}

const Documentation = () => {
  const { user } = useAuth()
  const [docViewUrl, setDocViewUrl] = useState(null)

  const docUrl = user?.government_id_url || user?.chef_certification_url
  const docLabel = user?.government_id_url ? 'License / ID Document' : 'Chef Certification'

  return (
    <div className="space-y-4 sm:space-y-6 px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Documentation</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">View your submitted verification document (read-only)</p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          Documents for Verification
        </h2>
        {docUrl ? (
          <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">{docLabel}</div>
            <button
              type="button"
              onClick={() => setDocViewUrl(resolveDocUrl(docUrl))}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              <Eye className="h-4 w-4 flex-shrink-0" />
              View document
            </button>
            <p className="text-xs text-gray-500 mt-2">Documents cannot be deleted. Contact support if you need to update.</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm sm:text-base">No document on file. Submit your verification document during signup or contact support.</p>
        )}
      </div>

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
    </div>
  )
}

export default Documentation
