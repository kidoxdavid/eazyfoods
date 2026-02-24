import { useEffect, useState } from 'react'
import api from '../services/api'
import { BarChart3, Eye, MousePointerClick, Star, TrendingUp, Users, DollarSign, UtensilsCrossed } from 'lucide-react'

const defaultStart = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}
const defaultEnd = () => new Date().toISOString().slice(0, 10)

const Analytics = () => {
  const [stats, setStats] = useState({
    total_views: 0,
    total_clicks: 0,
    average_rating: 0,
    total_reviews: 0,
    active_ads: 0
  })
  const [summary, setSummary] = useState(null)
  const [startDate, setStartDate] = useState(defaultStart())
  const [endDate, setEndDate] = useState(defaultEnd())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (!startDate || !endDate) return
    api.get('/chef/analytics/summary', { params: { start_date: startDate, end_date: endDate } })
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null))
  }, [startDate, endDate])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const [adsResponse, profileResponse] = await Promise.all([
        api.get('/chef/marketing/ads').catch(() => ({ data: [] })),
        api.get('/chef/profile')
      ])
      const ads = Array.isArray(adsResponse.data) ? adsResponse.data : []
      const profile = profileResponse.data
      const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0)
      const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0)
      const activeAds = ads.filter(ad => ad.status === 'active' && ad.approval_status === 'approved').length
      setStats({
        total_views: totalImpressions,
        total_clicks: totalClicks,
        average_rating: profile.average_rating || 0,
        total_reviews: profile.total_reviews || 0,
        active_ads: activeAds
      })
      const res = await api.get('/chef/analytics/summary', { params: { start_date: startDate, end_date: endDate } }).catch(() => ({ data: null }))
      setSummary(res?.data || null)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
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

  const clickThroughRate = stats.total_views > 0 
    ? ((stats.total_clicks / stats.total_views) * 100).toFixed(2)
    : 0

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Track your performance and engagement</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-500">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      {summary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders & Revenue ({summary.period_start} – {summary.period_end})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Orders</p>
              <p className="text-xl font-bold text-gray-900">{summary.total_orders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Revenue</p>
              <p className="text-xl font-bold text-gray-900">${Number(summary.total_revenue || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Net payout</p>
              <p className="text-xl font-bold text-gray-900">${Number(summary.net_payout || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Avg order</p>
              <p className="text-xl font-bold text-gray-900">${Number(summary.average_order_value || 0).toFixed(2)}</p>
            </div>
          </div>
          {summary.by_cuisine && summary.by_cuisine.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">By cuisine</h3>
              <ul className="space-y-1 text-sm">
                {summary.by_cuisine.map((c) => (
                  <li key={c.cuisine_id || c.cuisine_name} className="flex justify-between">
                    <span>{c.cuisine_name}</span>
                    <span>${Number(c.revenue || 0).toFixed(2)} ({c.order_lines} lines)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Ad Views</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{stats.total_views.toLocaleString()}</p>
            </div>
            <Eye className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Clicks</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{stats.total_clicks.toLocaleString()}</p>
            </div>
            <MousePointerClick className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Click-Through Rate</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{clickThroughRate}%</p>
            </div>
            <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-purple-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Average Rating</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : 'N/A'}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.total_reviews} reviews</p>
            </div>
            <Star className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Ad Performance</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Active Ads</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{stats.active_ads}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Total Impressions</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.total_views.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Total Clicks</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.total_clicks.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Review Summary</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Total Reviews</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total_reviews}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Average Rating</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.average_rating > 0 ? `${stats.average_rating.toFixed(1)} ⭐` : 'No ratings yet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Create engaging ads to increase your visibility and attract more customers. 
          Respond to reviews promptly to build trust and improve your rating.
        </p>
      </div>
    </div>
  )
}

export default Analytics

