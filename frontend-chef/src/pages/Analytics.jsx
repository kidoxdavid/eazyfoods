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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Track your performance and engagement</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Ad Views</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_views.toLocaleString()}</p>
            </div>
            <Eye className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_clicks.toLocaleString()}</p>
            </div>
            <MousePointerClick className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Click-Through Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{clickThroughRate}%</p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : 'N/A'}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stats.total_reviews} reviews</p>
            </div>
            <Star className="h-12 w-12 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ad Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Ads</span>
              <span className="text-2xl font-bold text-gray-900">{stats.active_ads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Impressions</span>
              <span className="text-2xl font-bold text-gray-900">{stats.total_views.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Clicks</span>
              <span className="text-2xl font-bold text-gray-900">{stats.total_clicks.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Reviews</span>
              <span className="text-2xl font-bold text-gray-900">{stats.total_reviews}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Rating</span>
              <span className="text-2xl font-bold text-gray-900">
                {stats.average_rating > 0 ? `${stats.average_rating.toFixed(1)} ⭐` : 'No ratings yet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Create engaging ads to increase your visibility and attract more customers. 
          Respond to reviews promptly to build trust and improve your rating.
        </p>
      </div>
    </div>
  )
}

export default Analytics

