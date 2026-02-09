import { useEffect, useState } from 'react'
import api from '../services/api'
import { Megaphone, Image, Mail, Users, DollarSign, TrendingUp, AlertCircle, Shield, Settings, BarChart3, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

const Marketing = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [overviewRes, campaignsRes, adsRes, budgetsRes] = await Promise.all([
        api.get('/admin/marketing/admin/overview'),
        api.get('/admin/marketing/campaigns', { params: { limit: 100 } }),
        api.get('/admin/marketing/ads', { params: { limit: 100 } }),
        api.get('/admin/marketing/budgets', { params: { limit: 100 } })
      ])
      
      setStats({
        overview: overviewRes.data,
        campaigns: campaignsRes.data || [],
        ads: adsRes.data || [],
        budgets: budgetsRes.data || []
      })
    } catch (error) {
      console.error('Failed to fetch marketing stats:', error)
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

  const overview = stats?.overview || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing Overview</h1>
        <p className="text-sm text-gray-600 mt-1">Manage all marketing activities and campaigns</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.campaigns?.total || 0}</p>
              <p className="text-xs text-gray-600 mt-1">
                {overview.campaigns?.active || 0} active, {overview.campaigns?.pending || 0} pending
              </p>
            </div>
            <Megaphone className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Ad Approvals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.ads?.pending_approval || 0}</p>
              {overview.ads?.pending_approval > 0 && (
                <Link to="/marketing/pending-approvals" className="text-xs text-primary-600 hover:underline mt-1 block">
                  Review now →
                </Link>
              )}
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${(overview.budgets?.total_amount || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                ${(overview.budgets?.spent || 0).toLocaleString()} spent
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Automation</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.automation?.active || 0}</p>
              <p className="text-xs text-gray-600 mt-1">of {overview.automation?.total || 0} workflows</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Control Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link
            to="/marketing/control"
            className="p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:bg-red-100 text-center transition-colors"
          >
            <Shield className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Full Control</p>
            <p className="text-xs text-gray-500">Manage all</p>
          </Link>
          <Link
            to="/marketing/campaigns"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <Megaphone className="h-6 w-6 text-primary-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Campaigns</p>
            <p className="text-xs text-gray-500">{overview.campaigns?.total || 0} total</p>
          </Link>
          <Link
            to="/marketing/ads"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <AlertCircle className="h-6 w-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ads</p>
            <p className="text-xs text-gray-500">{overview.ads?.pending_approval || 0} pending</p>
          </Link>
          <Link
            to="/marketing/budgets"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Budgets</p>
            <p className="text-xs text-gray-500">Manage</p>
          </Link>
          <Link
            to="/marketing/pending-approvals"
            className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 text-center transition-colors"
          >
            <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Approvals</p>
            <p className="text-xs text-gray-500">{overview.ads?.pending_approval || 0} pending</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h2>
        {stats?.campaigns && stats.campaigns.length > 0 ? (
          <div className="space-y-3">
            {stats.campaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-500">
                    {campaign.campaign_type} • {campaign.status}
                  </p>
                </div>
                <Link
                  to={`/marketing/campaigns/${campaign.id}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No campaigns yet</p>
        )}
      </div>
    </div>
  )
}

export default Marketing

