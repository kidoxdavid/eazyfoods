import { useEffect, useState } from 'react'
import api from '../services/api'
import { Image, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const MarketingAds = () => {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [approvalFilter, setApprovalFilter] = useState('pending')

  useEffect(() => {
    fetchAds()
  }, [approvalFilter])

  const fetchAds = async () => {
    try {
      const params = { limit: 1000, pending_vendor_ads: true }
      if (approvalFilter !== 'all') params.approval_status = approvalFilter
      const response = await api.get('/admin/marketing/ads', { params })
      setAds(response.data || [])
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.put(`/admin/marketing/ads/${id}/approve`)
      alert('Ad approved successfully')
      fetchAds()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to approve ad'
      alert(`Failed to approve ad: ${errorMessage}`)
      console.error('Error approving ad:', error)
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason (optional):')
    try {
      await api.put(`/admin/marketing/ads/${id}/reject`)
      alert('Ad rejected')
      fetchAds()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to reject ad'
      alert(`Failed to reject ad: ${errorMessage}`)
      console.error('Error rejecting ad:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const pendingAds = ads.filter(ad => ad.approval_status === 'pending' && ad.vendor_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Ads Control</h1>
          <p className="text-sm text-gray-600 mt-1">Approve and manage vendor-created ads</p>
        </div>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setApprovalFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                approvalFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {pendingAds.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">
              {pendingAds.length} vendor ad{pendingAds.length > 1 ? 's' : ''} pending approval
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map((ad) => (
          <div key={ad.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {ad.image_url && (
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{ad.name}</h3>
                {ad.vendor_id && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Vendor
                  </span>
                )}
              </div>
              {ad.title && <p className="text-sm text-gray-600 mb-2">{ad.title}</p>}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{ad.ad_type} • {ad.placement}</span>
                <span className={`px-2 py-0.5 rounded-full ${
                  ad.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                  ad.approval_status === 'pending' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {ad.approval_status}
                </span>
              </div>
              {ad.approval_status === 'pending' && ad.vendor_id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(ad.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-1 text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(ad.id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-1 text-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {ads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Image className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No ads found</p>
        </div>
      )}
    </div>
  )
}

export default MarketingAds

