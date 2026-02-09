import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Image, Plus, Eye, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { formatDateTime } from '../utils/format'

const Ads = () => {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAds()
  }, [])

  const fetchAds = async () => {
    setLoading(true)
    try {
      console.log('Fetching vendor ads from /vendor/marketing/ads')
      const response = await api.get('/vendor/marketing/ads')
      console.log('Vendor ads response:', response.data)
      const adsData = Array.isArray(response.data) ? response.data : []
      console.log(`Found ${adsData.length} ads`)
      setAds(adsData)
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const getApprovalStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDeleteAd = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/vendor/marketing/ads/${adId}`)
      alert('Ad deleted successfully')
      fetchAds() // Refresh the list
    } catch (error) {
      console.error('Failed to delete ad:', error)
      alert(error.response?.data?.detail || 'Failed to delete ad')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Ads</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Create and manage your marketing ads</p>
        </div>
        <Link
          to="/ads/new"
          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4" />
          Create Ad
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {ads.map((ad) => (
          <div key={ad.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {ad.image_url && (
              <div className="aspect-[16/9] max-h-24 sm:max-h-28 bg-gray-100 overflow-hidden">
                <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3 sm:p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 truncate">{ad.name}</h3>
                  <span className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full ${getApprovalStatusColor(ad.approval_status)}`}>
                    {ad.approval_status}
                  </span>
                </div>
              </div>

              {ad.title && (
                <p className="text-xs font-medium text-gray-900 mb-1 line-clamp-1">{ad.title}</p>
              )}

              <div className="space-y-1 text-xs text-gray-600 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Placement:</span>
                  <span className="capitalize">{ad.placement?.replace('_', ' ')}</span>
                </div>
                {ad.approved_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span className="truncate">Approved: {formatDateTime(ad.approved_at)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{ad.impressions || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{ad.clicks || 0} clicks</span>
                  </div>
                </div>
              </div>

              {ad.approval_status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5 mb-2">
                  <div className="flex items-center gap-1.5 text-yellow-800">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Awaiting approval</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {ad.approval_status === 'pending' && (
                  <Link
                    to={`/ads/${ad.id}/edit`}
                    className="text-center px-2 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs"
                  >
                    Edit Ad
                  </Link>
                )}
                {ad.approval_status === 'approved' && ad.status === 'active' && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to pause this ad?')) return
                      try {
                        await api.put(`/vendor/marketing/ads/${ad.id}/pause`)
                        alert('Ad paused successfully')
                        fetchAds()
                      } catch (error) {
                        alert(error.response?.data?.detail || 'Failed to pause ad')
                      }
                    }}
                    className="px-2 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
                  >
                    Pause
                  </button>
                )}
                {ad.approval_status === 'approved' && ad.status === 'paused' && (
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/vendor/marketing/ads/${ad.id}/activate`)
                        alert('Ad activated successfully')
                        fetchAds()
                      } catch (error) {
                        alert(error.response?.data?.detail || 'Failed to activate ad')
                      }
                    }}
                    className="px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAd(ad.id)}
                  className="px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ads.length === 0 && (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200">
          <Image className="h-16 w-16 sm:h-24 sm:w-24 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-2">No ads found</p>
          <Link
            to="/ads/new"
            className="inline-block px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Ad
          </Link>
        </div>
      )}
    </div>
  )
}

export default Ads

