import { useEffect, useState } from 'react'
import api from '../services/api'
import { Shield, CheckCircle, XCircle, Pause, Play, Edit, Trash2, Settings, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

const MarketingControl = () => {
  const [campaigns, setCampaigns] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('campaigns')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [campaignsRes, adsRes] = await Promise.all([
        api.get('/admin/marketing/campaigns', { params: { limit: 1000 } }),
        api.get('/admin/marketing/ads', { params: { limit: 1000 } })
      ])
      setCampaigns(campaignsRes.data || [])
      setAds(adsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveAd = async (adId) => {
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-approve`)
      alert('Ad approved successfully')
      fetchData()
    } catch (error) {
      alert('Failed to approve ad: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleRejectAd = async (adId) => {
    const reason = prompt('Enter rejection reason (optional):')
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-reject?reason=${encodeURIComponent(reason || '')}`)
      alert('Ad rejected')
      fetchData()
    } catch (error) {
      alert('Failed to reject ad: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handlePauseCampaign = async (campaignId) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-pause`)
      alert('Campaign paused')
      fetchData()
    } catch (error) {
      alert('Failed to pause campaign: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleApproveCampaign = async (campaignId) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-approve`)
      alert('Campaign approved')
      fetchData()
    } catch (error) {
      alert('Failed to approve campaign: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return
    try {
      await api.delete(`/admin/marketing/admin/campaigns/${campaignId}/admin-delete`)
      alert('Campaign deleted')
      fetchData()
    } catch (error) {
      alert('Failed to delete campaign: ' + (error.response?.data?.detail || error.message))
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
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused')
  const pendingCampaigns = campaigns.filter(c => c.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Control</h1>
          <p className="text-sm text-gray-600 mt-1">Full administrative control over all marketing activities</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Admin Control Mode</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
              { id: 'ads', label: 'Ads', count: ads.length },
              { id: 'pending', label: 'Pending Approvals', count: pendingAds.length + pendingCampaigns.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCampaigns.length}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Paused</p>
                  <p className="text-2xl font-bold text-gray-900">{pausedCampaigns.length}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCampaigns.length}</p>
                </div>
              </div>

              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          campaign.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {campaign.campaign_type} • Budget: ${(campaign.budget || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === 'pending' && (
                        <button
                          onClick={() => handleApproveCampaign(campaign.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                      )}
                      {campaign.status === 'active' && (
                        <button
                          onClick={() => handlePauseCampaign(campaign.id)}
                          className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-1 text-sm"
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => handleApproveCampaign(campaign.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                        >
                          <Play className="h-4 w-4" />
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Total: {ads.length} ads</p>
                <Link
                  to="/marketing/pending-approvals"
                  className="text-sm text-primary-600 hover:underline"
                >
                  View Pending Approvals →
                </Link>
              </div>

              <div className="space-y-3">
                {ads.map((ad) => (
                  <div key={ad.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{ad.name}</h3>
                        {ad.vendor_id && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Vendor Ad
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          ad.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                          ad.approval_status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ad.approval_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {ad.ad_type} • {ad.placement} • Status: {ad.status}
                      </p>
                    </div>
                    {ad.approval_status === 'pending' && ad.vendor_id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveAd(ad.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectAd(ad.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Approvals Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {pendingAds.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Pending Ad Approvals ({pendingAds.length})</h3>
                  <div className="space-y-2">
                    {pendingAds.map((ad) => (
                      <div key={ad.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-gray-900">{ad.name}</p>
                          <p className="text-xs text-gray-500">Vendor ad • {ad.ad_type}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveAd(ad.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectAd(ad.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingCampaigns.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Pending Campaign Approvals ({pendingCampaigns.length})</h3>
                  <div className="space-y-2">
                    {pendingCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-gray-900">{campaign.name}</p>
                          <p className="text-xs text-gray-500">{campaign.campaign_type} • ${(campaign.budget || 0).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleApproveCampaign(campaign.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingAds.length === 0 && pendingCampaigns.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">All caught up! No pending approvals.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MarketingControl

