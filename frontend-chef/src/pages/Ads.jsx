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
      console.log('Fetching chef ads from /chef/marketing/ads')
      const response = await api.get('/chef/marketing/ads')
      console.log('Chef ads response:', response.data)
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
      await api.delete(`/chef/marketing/ads/${adId}`)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Ads</h1>
          <p className="text-gray-600 mt-1">Create and manage your marketing ads</p>
        </div>
        <Link
          to="/ads/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Ad
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {ads.map((ad) => (
          <div key={ad.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {ad.image_url && (
              <div className="aspect-[4/3] sm:aspect-square bg-gray-100 overflow-hidden">
                <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{ad.name}</h3>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${getApprovalStatusColor(ad.approval_status)}`}>
                    {ad.approval_status}
                  </span>
                </div>
              </div>

              {ad.title && (
                <p className="text-xs font-medium text-gray-900 mb-1.5 line-clamp-2">{ad.title}</p>
              )}

              <div className="space-y-1 text-[10px] sm:text-xs text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Placement:</span>
                  <span className="capitalize">{ad.placement?.replace('_', ' ')}</span>
                </div>
                {ad.approved_at && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>Approved: {formatDateTime(ad.approved_at)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{ad.impressions || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{ad.clicks || 0} clicks</span>
                  </div>
                </div>
              </div>

              {ad.approval_status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                  <div className="flex items-center gap-1.5 text-yellow-800">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">Waiting for approval</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {ad.approval_status === 'pending' && (
                  <Link
                    to={`/ads/${ad.id}/edit`}
                    className="flex-1 min-w-0 text-center px-2 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 text-[10px] sm:text-xs"
                  >
                    Edit
                  </Link>
                )}
                {ad.approval_status === 'approved' && ad.status === 'active' && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to pause this ad?')) return
                      try {
                        await api.put(`/chef/marketing/ads/${ad.id}/pause`)
                        alert('Ad paused successfully')
                        fetchAds()
                      } catch (error) {
                        alert(error.response?.data?.detail || 'Failed to pause ad')
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-[10px] sm:text-xs"
                  >
                    Pause
                  </button>
                )}
                {ad.approval_status === 'approved' && ad.status === 'paused' && (
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/chef/marketing/ads/${ad.id}/activate`)
                        alert('Ad activated successfully')
                        fetchAds()
                      } catch (error) {
                        alert(error.response?.data?.detail || 'Failed to activate ad')
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-[10px] sm:text-xs"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAd(ad.id)}
                  className="px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-[10px] sm:text-xs flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Image className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No ads found</p>
          <Link
            to="/ads/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Ad
          </Link>
        </div>
      )}
    </div>
  )
}

export default Ads

