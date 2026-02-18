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
    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600 mt-0.5">Your delivery overview</p>
        </div>
      </div>

      {/* Stats Cards - compact on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">Total Deliveries</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate">{stats?.total_deliveries || 0}</p>
            </div>
            <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">Completed</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate">{stats?.completed_deliveries || 0}</p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">Total Earnings</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate">
                ${parseFloat(stats?.total_earnings || 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">Active</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate">{stats?.active_deliveries || 0}</p>
            </div>
            <Clock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-purple-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Quick Actions - compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/available-deliveries')}
              className="w-full px-3 py-2 sm:py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-between transition-colors text-xs sm:text-sm"
            >
              <span className="truncate">Available Deliveries</span>
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ml-2" />
            </button>
            <button
              onClick={() => navigate('/my-deliveries')}
              className="w-full px-3 py-2 sm:py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-between transition-colors text-xs sm:text-sm"
            >
              <span className="truncate">My Deliveries</span>
              <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ml-2" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Performance</h2>
          <div className="space-y-2">
            <div className="flex justify-between gap-2 text-xs sm:text-sm">
              <span className="text-gray-600">Avg Rating</span>
              <span className="font-medium">
                {stats?.average_rating ? `⭐ ${parseFloat(stats.average_rating).toFixed(1)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-xs sm:text-sm">
              <span className="text-gray-600">Completion</span>
              <span className="font-medium">
                {stats?.total_deliveries > 0
                  ? `${((stats.completed_deliveries / stats.total_deliveries) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <button
              onClick={() => navigate('/performance')}
              className="w-full mt-2 sm:mt-3 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              View Analytics
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Quick Links</h2>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/earnings')}
              className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors text-xs sm:text-sm"
            >
              <span className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                Earnings
              </span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            </button>
            <button
              onClick={() => navigate('/delivery-history')}
              className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors text-xs sm:text-sm"
            >
              <span className="flex items-center gap-2">
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                Delivery History
              </span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            </button>
            <button
              onClick={() => navigate('/ratings')}
              className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors text-xs sm:text-sm"
            >
              <span className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                Ratings & Reviews
              </span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

