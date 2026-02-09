import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Image, Plus, Eye, MousePointerClick, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { formatDateTime } from '../utils/format'

const Ads = () => {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [approvalFilter, setApprovalFilter] = useState('all')

  useEffect(() => {
    fetchAds()
  }, [statusFilter, approvalFilter])

  const fetchAds = async () => {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      // For expired and scheduled, we'll filter on frontend since backend calculates status dynamically
      if (statusFilter !== 'all' && statusFilter !== 'expired' && statusFilter !== 'scheduled') {
        params.status_filter = statusFilter
      }
      if (approvalFilter !== 'all') params.approval_status = approvalFilter
      // If filtering for pending approval, show vendor ads pending review
      if (approvalFilter === 'pending') {
        params.pending_vendor_ads = true
      }
      
      const response = await api.get('/admin/marketing/ads', { params })
      let adsData = response.data || []
      
      // Filter by expired or scheduled status on frontend
      if (statusFilter === 'expired' || statusFilter === 'scheduled') {
        const now = new Date()
        adsData = adsData.filter(ad => {
          if (statusFilter === 'expired') {
            return ad.end_date && new Date(ad.end_date) < now
          } else if (statusFilter === 'scheduled') {
            return ad.start_date && new Date(ad.start_date) > now
          }
          return true
        })
      }
      
      setAds(adsData)
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (adId) => {
    try {
      await api.put(`/admin/marketing/ads/${adId}/approve`)
      alert('Ad approved successfully')
      fetchAds()
    } catch (error) {
      alert('Failed to approve ad')
    }
  }

  const handleReject = async (adId) => {
    try {
      await api.put(`/admin/marketing/ads/${adId}/reject`)
      alert('Ad rejected')
      fetchAds()
    } catch (error) {
      alert('Failed to reject ad')
    }
  }

  const handleDelete = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return
    }
    try {
      await api.delete(`/admin/marketing/ads/${adId}`)
      alert('Ad deleted successfully')
      fetchAds()
    } catch (error) {
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
          <h1 className="text-3xl font-bold text-gray-900">Ads</h1>
          <p className="text-gray-600 mt-1">Manage and design marketing ads. Approve vendor-created ads by filtering for "Pending Approval".</p>
        </div>
        <Link
          to="/ads/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Ad
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div>
          <label className="text-sm text-gray-600 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Approval:</label>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All</option>
            <option value="pending">Pending Approval (Vendor Ads)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Ads Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {ads.map((ad) => (
          <div key={ad.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {ad.image_url && (
              <div className="aspect-[16/9] max-h-24 sm:max-h-28 bg-gray-100 overflow-hidden">
                <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">{ad.name}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      // Calculate actual status based on dates
                      const now = new Date()
                      let displayStatus = ad.status
                      let statusColor = 'bg-gray-100 text-gray-800'
                      
                      if (ad.end_date && new Date(ad.end_date) < now) {
                        displayStatus = 'expired'
                        statusColor = 'bg-red-100 text-red-800'
                      } else if (ad.start_date && new Date(ad.start_date) > now) {
                        if (displayStatus === 'active') {
                          displayStatus = 'scheduled'
                          statusColor = 'bg-blue-100 text-blue-800'
                        }
                      } else if (ad.status === 'active') {
                        statusColor = 'bg-green-100 text-green-800'
                      } else if (ad.status === 'paused') {
                        statusColor = 'bg-yellow-100 text-yellow-800'
                      }
                      
                      return (
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusColor}`}>
                          {displayStatus}
                        </span>
                      )
                    })()}
                    {ad.approval_status === 'pending' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-800">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Source Information */}
              <div className="mb-1.5 space-y-0.5">
                <div className="flex flex-wrap gap-1">
                  {ad.vendor_id && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800 rounded">
                      Vendor
                    </span>
                  )}
                  {ad.chef_id && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-800 rounded">
                      Chef
                    </span>
                  )}
                  {!ad.vendor_id && !ad.chef_id && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-800 rounded">
                      Admin
                    </span>
                  )}
                </div>
                {(ad.vendor_name || ad.chef_name) && (
                  <div className="text-[10px] text-gray-600 truncate">
                    <span className="font-medium">Source: </span>
                    {ad.vendor_name && (
                      <span className="text-blue-700 font-semibold">{ad.vendor_name}</span>
                    )}
                    {ad.chef_name && (
                      <span className="text-purple-700 font-semibold">{ad.chef_name}</span>
                    )}
                  </div>
                )}
                {ad.created_by_type && !ad.vendor_name && !ad.chef_name && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Created by: </span>
                    <span className="capitalize">{ad.created_by_type}</span>
                  </div>
                )}
              </div>
              {ad.title && (
                <p className="text-xs font-medium text-gray-900 mb-1 line-clamp-1">{ad.title}</p>
              )}
              {ad.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{ad.description}</p>
              )}

              <div className="space-y-1 text-xs text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Placement:</span>
                  <span className="capitalize">{ad.placement}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{ad.impressions || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MousePointerClick className="h-4 w-4" />
                    <span>{ad.clicks || 0}</span>
                  </div>
                  {ad.impressions > 0 && (
                    <span className="text-primary-600">
                      {(ad.clicks / ad.impressions * 100).toFixed(2)}% CTR
                    </span>
                  )}
                </div>
              </div>

              {ad.approval_status === 'pending' && ad.vendor_id && (
                <div className="mb-2">
                  <p className="text-[10px] text-gray-500 mb-1.5">Awaiting approval:</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleApprove(ad.id)}
                      className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-1 text-xs"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(ad.id)}
                      className="flex-1 px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1 text-xs"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-1.5">
                {!(ad.approval_status === 'pending' && ad.vendor_id) && (
                  <Link
                    to={`/ads/${ad.id}/edit`}
                    className="flex-1 text-center px-2 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs"
                  >
                    Edit
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(ad.id)}
                  className="px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center justify-center gap-1"
                  title="Delete ad"
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

