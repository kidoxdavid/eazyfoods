import { useEffect, useState } from 'react'
import api from '../services/api'
import { Megaphone, Image, Mail, TrendingUp, Eye, MousePointerClick, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [campaignsRes, adsRes, emailRes, analyticsRes] = await Promise.all([
        api.get('/admin/marketing/campaigns', { params: { limit: 1000 }, timeout: 10000 }).catch(() => ({ data: [] })),
        api.get('/admin/marketing/ads', { params: { limit: 1000 }, timeout: 10000 }).catch(() => ({ data: [] })),
        api.get('/admin/marketing/email-campaigns', { params: { limit: 1000 }, timeout: 10000 }).catch(() => ({ data: [] })),
        api.get('/admin/marketing/analytics', { timeout: 10000 }).catch(() => ({ data: {} }))
      ])
      
      const campaigns = Array.isArray(campaignsRes.data) ? campaignsRes.data : []
      const ads = Array.isArray(adsRes.data) ? adsRes.data : []
      const emails = Array.isArray(emailRes.data) ? emailRes.data : []
      const analytics = analyticsRes.data || {}
      
      setStats({
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalAds: ads.length,
        activeAds: ads.filter(a => a.status === 'active').length,
        pendingAds: ads.filter(a => a.approval_status === 'pending').length,
        totalEmails: emails.length,
        sentEmails: emails.filter(e => e.status === 'sent').length,
        totalImpressions: analytics.total_impressions || 0,
        totalClicks: analytics.total_clicks || 0,
        totalConversions: analytics.total_conversions || 0,
        ctr: analytics.ctr || 0,
        conversionRate: analytics.conversion_rate || 0
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
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
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Marketing Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Campaigns and performance</p>
      </div>

      {/* Stats Grid - match vendor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Campaigns</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">{stats?.totalCampaigns || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{stats?.activeCampaigns || 0} active</p>
            </div>
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-primary-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Ads</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">{stats?.totalAds || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{stats?.activeAds || 0} active, {stats?.pendingAds || 0} pending</p>
            </div>
            <Image className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Email Campaigns</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">{stats?.totalEmails || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{stats?.sentEmails || 0} sent</p>
            </div>
            <Mail className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Impressions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">
                {(stats?.totalImpressions || 0).toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-primary-600 mt-1 truncate">{stats?.ctr?.toFixed(2) || 0}% CTR</p>
            </div>
            <Eye className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-purple-500 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Pending Vendor Ads Alert */}
      {stats?.pendingAds > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Image className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-yellow-900">
                {stats.pendingAds} Vendor Ad{stats.pendingAds > 1 ? 's' : ''} Pending
              </h3>
              <p className="text-xs text-yellow-700 hidden sm:block">Review and approve vendor-created ads</p>
            </div>
          </div>
          <Link
            to="/ads?approval_status=pending"
            className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-xs sm:text-sm font-medium text-center flex-shrink-0"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Performance & Quick Actions - match vendor card style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Clicks</h3>
            <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {(stats?.totalClicks || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Conversions</h3>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {(stats?.totalConversions || 0).toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{stats?.conversionRate?.toFixed(2) || 0}% conversion rate</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/campaigns"
              className="block w-full text-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs sm:text-sm"
            >
              Create Campaign
            </Link>
            <Link
              to="/ads/new"
              className="block w-full text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
            >
              Design Ad
            </Link>
            <Link
              to="/email-campaigns/new"
              className="block w-full text-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
            >
              Send Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

