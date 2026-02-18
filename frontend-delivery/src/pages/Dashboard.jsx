import { useEffect, useState } from 'react'
import api from '../services/api'
import { Package, DollarSign, TrendingUp, Clock, MapPin, BarChart3, Star, History, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStats()
    fetchProfile()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/driver/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await api.get('/driver/me')
      setProfile(response.data)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1">Your delivery overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total Deliveries</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{stats?.total_deliveries || 0}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{stats?.completed_deliveries || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                ${parseFloat(stats?.total_earnings || 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Active Deliveries</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{stats?.active_deliveries || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/available-deliveries')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-between transition-colors text-sm sm:text-base"
            >
              <span className="truncate">View Available Deliveries</span>
              <MapPin className="h-5 w-5 flex-shrink-0 ml-2" />
            </button>
            <button
              onClick={() => navigate('/my-deliveries')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-between transition-colors text-sm sm:text-base"
            >
              <span className="truncate">My Deliveries</span>
              <Package className="h-5 w-5 flex-shrink-0 ml-2" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Performance</h2>
          <div className="space-y-3">
            <div className="flex justify-between gap-2 text-sm sm:text-base">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-medium">
                {stats?.average_rating ? `⭐ ${parseFloat(stats.average_rating).toFixed(1)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-sm sm:text-base">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium">
                {stats?.total_deliveries > 0
                  ? `${((stats.completed_deliveries / stats.total_deliveries) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <button
              onClick={() => navigate('/performance')}
              className="w-full mt-4 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              View Full Analytics
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick Links</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/earnings')}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Earnings
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/delivery-history')}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Delivery History
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/ratings')}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Ratings & Reviews
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

