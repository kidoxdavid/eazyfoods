import { useEffect, useState } from 'react'
import api from '../services/api'
import { BarChart3, Eye, MousePointerClick, Star, TrendingUp, Users } from 'lucide-react'

const Analytics = () => {
  const [stats, setStats] = useState({
    total_views: 0,
    total_clicks: 0,
    average_rating: 0,
    total_reviews: 0,
    active_ads: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch ads to calculate impressions and clicks
      const adsResponse = await api.get('/chef/marketing/ads')
      const ads = Array.isArray(adsResponse.data) ? adsResponse.data : []
      
      // Fetch profile to get reviews data
      const profileResponse = await api.get('/chef/profile')
      const profile = profileResponse.data
      
      // Calculate stats
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
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Track your performance and engagement</p>
      </div>

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

