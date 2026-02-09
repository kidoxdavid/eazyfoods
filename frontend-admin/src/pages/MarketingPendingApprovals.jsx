import { useEffect, useState } from 'react'
import api from '../services/api'
import { CheckCircle, XCircle, Pause, AlertCircle } from 'lucide-react'

const MarketingPendingApprovals = () => {
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPending()
  }, [])

  const fetchPending = async () => {
    try {
      const response = await api.get('/admin/marketing/admin/pending-approvals')
      setPending(response.data)
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveAd = async (adId) => {
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-approve`)
      alert('Ad approved successfully')
      fetchPending()
    } catch (error) {
      alert('Failed to approve ad: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleRejectAd = async (adId) => {
    const reason = prompt('Enter rejection reason (optional):')
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-reject?reason=${encodeURIComponent(reason || '')}`)
      alert('Ad rejected')
      fetchPending()
    } catch (error) {
      alert('Failed to reject ad: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleApproveCampaign = async (campaignId) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-approve`)
      alert('Campaign approved successfully')
      fetchPending()
    } catch (error) {
      alert('Failed to approve campaign: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handlePauseCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to pause this campaign?')) return
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-pause`)
      alert('Campaign paused')
      fetchPending()
    } catch (error) {
      alert('Failed to pause campaign: ' + (error.response?.data?.detail || error.message))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const hasPending = pending && (
    (pending.ads && pending.ads.length > 0) ||
    (pending.campaigns && pending.campaigns.length > 0) ||
    (pending.budgets && pending.budgets.length > 0)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-sm text-gray-600 mt-1">Review and approve marketing activities</p>
      </div>

      {!hasPending && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">All caught up!</p>
          <p className="text-gray-500 mt-1">There are no pending approvals at this time.</p>
        </div>
      )}

      {/* Pending Ads */}
      {pending?.ads && pending.ads.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Ad Approvals ({pending.ads.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pending.ads.map((ad) => (
              <div key={ad.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{ad.name}</p>
                  <p className="text-sm text-gray-500">
                    {ad.created_by_type === 'vendor' ? 'Vendor Ad' : 'Marketing Ad'} • 
                    Created {new Date(ad.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveAd(ad.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectAd(ad.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Campaigns */}
      {pending?.campaigns && pending.campaigns.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Campaign Approvals ({pending.campaigns.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pending.campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-500">
                    Budget: ${(campaign.budget || 0).toLocaleString()} • 
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveCampaign(campaign.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handlePauseCampaign(campaign.id)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 text-sm"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Budgets */}
      {pending?.budgets && pending.budgets.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Budget Approvals ({pending.budgets.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pending.budgets.map((budget) => (
              <div key={budget.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{budget.name}</p>
                  <p className="text-sm text-gray-500">
                    Budget: ${(budget.total_budget || 0).toLocaleString()} • 
                    Created {new Date(budget.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Review Budget
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MarketingPendingApprovals

