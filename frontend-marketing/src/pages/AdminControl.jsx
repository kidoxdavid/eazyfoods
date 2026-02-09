import { useEffect, useState } from 'react'
import api from '../services/api'
import { Shield, CheckCircle, XCircle, Pause, Trash2, Settings as SettingsIcon, Play, Edit, Eye, Filter, Search, Download } from 'lucide-react'

const AdminControl = () => {
  const [overview, setOverview] = useState(null)
  const [pendingApprovals, setPendingApprovals] = useState(null)
  const [allCampaigns, setAllCampaigns] = useState([])
  const [allAds, setAllAds] = useState([])
  const [activeTab, setActiveTab] = useState('overview') // overview, campaigns, ads, settings
  const [loading, setLoading] = useState(true)
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [adFilter, setAdFilter] = useState('all')
  const [adApprovalFilter, setAdApprovalFilter] = useState('all')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [settings, setSettings] = useState({
    auto_approve_vendor_ads: false,
    auto_approve_chef_ads: false,
    require_approval_for_campaigns: true,
    require_approval_for_budgets: true,
    max_budget_per_campaign: 100000,
    max_daily_notifications: 10000,
    max_daily_emails: 10000,
    max_daily_sms: 5000
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/marketing/admin/settings')
      if (response.data) {
        setSettings(prev => ({ ...prev, ...response.data }))
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const saveSettings = async (settingsToSave) => {
    setSaving(true)
    try {
      await api.put('/admin/marketing/admin/settings', settingsToSave)
      alert('Settings saved successfully!')
      setShowApprovalModal(false)
      setShowBudgetModal(false)
      setShowNotificationModal(false)
      fetchSettings()
    } catch (error) {
      alert('Failed to save settings: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSaving(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [overviewRes, approvalsRes, campaignsRes, adsRes] = await Promise.all([
        api.get('/admin/marketing/admin/overview'),
        api.get('/admin/marketing/admin/pending-approvals'),
        api.get('/admin/marketing/admin/all-campaigns', { params: { limit: 1000, status_filter: campaignFilter !== 'all' ? campaignFilter : null } }),
        api.get('/admin/marketing/admin/all-ads', { 
          params: { 
            limit: 1000, 
            status_filter: adFilter !== 'all' ? adFilter : null,
            approval_filter: adApprovalFilter !== 'all' ? adApprovalFilter : null
          } 
        })
      ])
      setOverview(overviewRes.data || {})
      setPendingApprovals(approvalsRes.data || { ads: [], campaigns: [], budgets: [] })
      setAllCampaigns(campaignsRes.data?.campaigns || [])
      setAllAds(adsRes.data?.ads || [])
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
      // Set empty defaults on error
      setOverview({
        campaigns: { total: 0, active: 0, pending: 0 },
        ads: { total: 0, pending_approval: 0 },
        budgets: { total: 0, total_amount: 0, spent: 0, remaining: 0 },
        automation: { total: 0, active: 0 }
      })
      setPendingApprovals({ ads: [], campaigns: [], budgets: [] })
      setAllCampaigns([])
      setAllAds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'campaigns' || activeTab === 'ads') {
      fetchData()
    }
  }, [campaignFilter, adFilter, adApprovalFilter])

  const handleApproveAd = async (adId) => {
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-approve`)
      alert('Ad approved successfully')
      fetchData()
    } catch (error) {
      alert('Failed to approve ad')
    }
  }

  const handleRejectAd = async (adId) => {
    const reason = prompt('Enter rejection reason (optional):')
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-reject?reason=${encodeURIComponent(reason || '')}`)
      alert('Ad rejected')
      fetchData()
    } catch (error) {
      alert('Failed to reject ad')
    }
  }

  const handleApproveCampaign = async (campaignId) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-approve`)
      alert('Campaign approved successfully')
      fetchData()
    } catch (error) {
      alert('Failed to approve campaign')
    }
  }

  const handlePauseCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to pause this campaign?')) return
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-pause`)
      alert('Campaign paused')
      fetchData()
    } catch (error) {
      alert('Failed to pause campaign')
    }
  }

  const handleActivateCampaign = async (campaignId) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${campaignId}/admin-activate`)
      alert('Campaign activated')
      fetchData()
    } catch (error) {
      alert('Failed to activate campaign')
    }
  }

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return
    try {
      await api.delete(`/admin/marketing/admin/campaigns/${campaignId}/admin-delete`)
      alert('Campaign deleted')
      fetchData()
    } catch (error) {
      alert('Failed to delete campaign')
    }
  }

  const handlePauseAd = async (adId) => {
    if (!confirm('Are you sure you want to pause this ad?')) return
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-pause`)
      alert('Ad paused')
      fetchData()
    } catch (error) {
      alert('Failed to pause ad')
    }
  }

  const handleActivateAd = async (adId) => {
    try {
      await api.put(`/admin/marketing/admin/ads/${adId}/admin-activate`)
      alert('Ad activated')
      fetchData()
    } catch (error) {
      alert('Failed to activate ad')
    }
  }

  const handleDeleteAd = async (adId) => {
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) return
    try {
      await api.delete(`/admin/marketing/admin/ads/${adId}/admin-delete`)
      alert('Ad deleted')
      fetchData()
    } catch (error) {
      alert('Failed to delete ad')
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Control</h1>
          <p className="text-gray-600 mt-1">Superior control over all marketing activities</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Admin Mode</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview & Pending
          </button>
          <button
            onClick={() => {
              setActiveTab('campaigns')
              fetchData()
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Campaigns
          </button>
          <button
            onClick={() => {
              setActiveTab('ads')
              fetchData()
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ads'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Ads
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{overview?.campaigns?.total || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{overview?.campaigns?.pending || 0} pending</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Pending Ads</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{overview?.ads?.pending_approval || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${(overview?.budgets?.total_amount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ${(overview?.budgets?.spent || 0).toLocaleString()} spent
          </p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Active Automation</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{overview?.automation?.active || 0}</p>
        </div>
          </div>

          {/* Pending Approvals */}
          <div className="space-y-4">
        {/* Pending Ads */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Ad Approvals</h2>
          {pendingApprovals?.ads && pendingApprovals.ads.length > 0 ? (
            <div className="space-y-3">
              {pendingApprovals.ads.map((ad) => (
                <div key={ad.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{ad.name}</p>
                    <p className="text-sm text-gray-500">
                      {ad.created_by_type} • {new Date(ad.created_at).toLocaleDateString()}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No pending ad approvals</p>
            </div>
          )}
        </div>

        {/* Pending Campaigns */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Campaign Approvals</h2>
          {pendingApprovals?.campaigns && pendingApprovals.campaigns.length > 0 ? (
            <div className="space-y-3">
              {pendingApprovals.campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-sm text-gray-500">
                      Budget: ${(campaign.budget || 0).toLocaleString()} • {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveCampaign(campaign.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handlePauseCampaign(campaign.id)}
                      className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-1 text-sm"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No pending campaign approvals</p>
            </div>
          )}
        </div>

        {/* Pending Budgets */}
        {pendingApprovals?.budgets && pendingApprovals.budgets.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Budget Approvals</h2>
            <div className="space-y-3">
              {pendingApprovals.budgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{budget.name}</p>
                    <p className="text-sm text-gray-500">
                      Budget: ${(budget.total_budget || 0).toLocaleString()} • {new Date(budget.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // TODO: Implement budget approval
                        alert('Budget approval functionality coming soon')
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        </>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">All Campaigns</h2>
            <div className="flex items-center gap-2">
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No campaigns found</td>
                    </tr>
                  ) : (
                    allCampaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            campaign.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${(campaign.budget || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {campaign.status === 'active' ? (
                              <button
                                onClick={() => handlePauseCampaign(campaign.id)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Pause"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateCampaign(campaign.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Activate"
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">All Ads</h2>
            <div className="flex items-center gap-2">
              <select
                value={adFilter}
                onChange={(e) => setAdFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <select
                value={adApprovalFilter}
                onChange={(e) => setAdApprovalFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Approval</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAds.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No ads found</td>
                    </tr>
                  ) : (
                    allAds.map((ad) => (
                      <tr key={ad.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{ad.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ad.ad_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ad.status === 'active' ? 'bg-green-100 text-green-800' :
                            ad.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ad.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ad.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                            ad.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            ad.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ad.approval_status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ad.created_by_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(ad.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {ad.approval_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveAd(ad.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectAd(ad.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {ad.status === 'active' ? (
                              <button
                                onClick={() => handlePauseAd(ad.id)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Pause"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateAd(ad.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Activate"
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAd(ad.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Marketing Settings</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Approval Settings</h3>
                <p className="text-sm text-gray-600 mb-3">Configure automatic approval rules and requirements</p>
                <div className="text-sm text-gray-700 space-y-1 mb-3">
                  <p>• Auto-approve vendor ads: {settings.auto_approve_vendor_ads ? 'Enabled' : 'Disabled'}</p>
                  <p>• Auto-approve chef ads: {settings.auto_approve_chef_ads ? 'Enabled' : 'Disabled'}</p>
                  <p>• Require campaign approval: {settings.require_approval_for_campaigns ? 'Yes' : 'No'}</p>
                </div>
                <button 
                  onClick={() => setShowApprovalModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  Configure Settings
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Budget Limits</h3>
                <p className="text-sm text-gray-600 mb-3">Set maximum budget limits per campaign</p>
                <div className="text-sm text-gray-700 mb-3">
                  <p>• Max budget per campaign: ${settings.max_budget_per_campaign?.toLocaleString() || 'Not set'}</p>
                </div>
                <button 
                  onClick={() => setShowBudgetModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  Configure Limits
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Notification Limits</h3>
                <p className="text-sm text-gray-600 mb-3">Set daily notification sending limits</p>
                <div className="text-sm text-gray-700 space-y-1 mb-3">
                  <p>• Max daily notifications: {settings.max_daily_notifications?.toLocaleString() || 'Not set'}</p>
                  <p>• Max daily emails: {settings.max_daily_emails?.toLocaleString() || 'Not set'}</p>
                  <p>• Max daily SMS: {settings.max_daily_sms?.toLocaleString() || 'Not set'}</p>
                </div>
                <button 
                  onClick={() => setShowNotificationModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  Configure Limits
                </button>
              </div>
            </div>
          </div>

          {/* Approval Settings Modal */}
          {showApprovalModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowApprovalModal(false)}
            >
              <div 
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Approval Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.auto_approve_vendor_ads}
                      onChange={(e) => setSettings(prev => ({ ...prev, auto_approve_vendor_ads: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Auto-approve vendor ads</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.auto_approve_chef_ads}
                      onChange={(e) => setSettings(prev => ({ ...prev, auto_approve_chef_ads: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Auto-approve chef ads</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.require_approval_for_campaigns}
                      onChange={(e) => setSettings(prev => ({ ...prev, require_approval_for_campaigns: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Require approval for campaigns</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.require_approval_for_budgets}
                      onChange={(e) => setSettings(prev => ({ ...prev, require_approval_for_budgets: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Require approval for budgets</span>
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => saveSettings({
                      auto_approve_vendor_ads: settings.auto_approve_vendor_ads,
                      auto_approve_chef_ads: settings.auto_approve_chef_ads,
                      require_approval_for_campaigns: settings.require_approval_for_campaigns,
                      require_approval_for_budgets: settings.require_approval_for_budgets
                    })}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Budget Limits Modal */}
          {showBudgetModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowBudgetModal(false)}
            >
              <div 
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Budget Limits</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Budget Per Campaign ($)
                    </label>
                    <input
                      type="number"
                      value={settings.max_budget_per_campaign || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, max_budget_per_campaign: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="1000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => saveSettings({
                      max_budget_per_campaign: settings.max_budget_per_campaign
                    })}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowBudgetModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Limits Modal */}
          {showNotificationModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowNotificationModal(false)}
            >
              <div 
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Notification Limits</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Daily Notifications
                    </label>
                    <input
                      type="number"
                      value={settings.max_daily_notifications || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, max_daily_notifications: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Daily Emails
                    </label>
                    <input
                      type="number"
                      value={settings.max_daily_emails || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, max_daily_emails: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Daily SMS
                    </label>
                    <input
                      type="number"
                      value={settings.max_daily_sms || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, max_daily_sms: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => saveSettings({
                      max_daily_notifications: settings.max_daily_notifications,
                      max_daily_emails: settings.max_daily_emails,
                      max_daily_sms: settings.max_daily_sms
                    })}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowNotificationModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminControl

