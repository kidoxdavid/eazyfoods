import { useEffect, useState } from 'react'
import api from '../services/api'
import { Package, DollarSign, TrendingUp, Clock, MapPin, BarChart3, Star, History, ArrowRight, Power } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const navigate = useNavigate()
  const { refreshDriver } = useAuth()

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

  const toggleAvailability = async () => {
    if (availabilityLoading || !profile) return
    
    setAvailabilityLoading(true)
    try {
      const newAvailability = !profile.is_available
      await api.put('/driver/availability', null, {
        params: { is_available: newAvailability }
      })
      setProfile({ ...profile, is_available: newAvailability })
      // Refresh driver data in auth context
      if (refreshDriver) {
        await refreshDriver()
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      alert(error.response?.data?.detail || 'Failed to update availability. Please try again.')
    } finally {
      setAvailabilityLoading(false)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Your delivery overview</p>
        </div>
        
        {/* Availability Toggle */}
        {profile && (
          <div className="flex items-center space-x-3 sm:space-x-4 bg-white p-3 sm:p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center space-x-3">
              <Power className={`h-5 w-5 ${profile.is_available ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-gray-700">Availability Status</p>
                <p className={`text-xs ${profile.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                  {profile.is_available ? 'Available - Accepting delivery requests' : 'Unavailable - Not accepting delivery requests'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={availabilityLoading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                profile.is_available ? 'bg-primary-600' : 'bg-gray-200'
              } ${availabilityLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={profile.is_available}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  profile.is_available ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Deliveries</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_deliveries || 0}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.completed_deliveries || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${parseFloat(stats?.total_earnings || 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Deliveries</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.active_deliveries || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/available-deliveries')}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-between transition-colors"
            >
              <span>View Available Deliveries</span>
              <MapPin className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/my-deliveries')}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-between transition-colors"
            >
              <span>My Deliveries</span>
              <Package className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-medium">
                {stats?.average_rating ? `⭐ ${parseFloat(stats.average_rating).toFixed(1)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
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

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
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

