import { useEffect, useState } from 'react'
import api from '../services/api'
import { ChefHat, Star, Users, Clock, DollarSign, TrendingUp, AlertCircle, CheckCircle, Power, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

const ONBOARDING_KEY = 'chef_onboarding_dismissed'

const Dashboard = () => {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY))

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [profileRes, reviewsRes, statsRes] = await Promise.all([
        api.get('/chef/profile'),
        api.get('/chef/reviews'),
        api.get('/chef/dashboard/stats').catch(() => ({ data: null }))
      ])
      setProfile(profileRes.data)
      setReviews(reviewsRes.data || [])
      setStats(statsRes?.data || null)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async () => {
    if (availabilityLoading) return
    
    setAvailabilityLoading(true)
    try {
      const newAvailability = !profile.is_available
      await api.put('/chef/profile', {
        is_available: newAvailability
      })
      setProfile({ ...profile, is_available: newAvailability })
      alert(`You are now ${newAvailability ? 'available' : 'unavailable'}. ${newAvailability ? 'Customers can book your services.' : 'You will not receive new orders.'}`)
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      alert(error.response?.data?.detail || 'Failed to update availability. Please try again.')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const recentReviews = reviews.slice(0, 3)
  const averageRating = profile?.average_rating || 0
  const totalReviews = profile?.total_reviews || 0

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Optional onboarding checklist */}
      {showOnboarding && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-primary-900">Getting started</h3>
            <ul className="mt-2 text-sm text-primary-800 space-y-1">
              <li>• Complete your profile and add cuisines</li>
              <li>• Set your schedule in Settings</li>
              <li>• Turn on Availability when you&apos;re ready to accept orders</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(ONBOARDING_KEY, '1')
              setShowOnboarding(false)
            }}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
              Welcome back, {profile?.chef_name || 'Chef'}!
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600">
              {profile?.verification_status === 'verified' 
                ? 'Your account is verified and active'
                : 'Your account is pending verification'}
            </p>
          </div>
          {/* Availability Toggle */}
          {profile && (
            <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 bg-gray-50 sm:bg-white p-3 sm:p-4 rounded-lg border border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <Power className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${profile.is_available ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-700">Availability</p>
                  <p className={`text-[10px] sm:text-xs truncate ${profile.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                    {profile.is_available ? 'Accepting orders' : 'Not accepting'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleAvailability}
                disabled={availabilityLoading}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  profile.is_available ? 'bg-primary-600' : 'bg-gray-200'
                } ${availabilityLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={profile.is_available}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.is_available ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Today&apos;s Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.today_orders ?? 0}</p>
                </div>
                <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-primary-500 flex-shrink-0" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Pending Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.pending_orders ?? 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500 flex-shrink-0" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Today&apos;s Revenue</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    ${Number(stats.today_revenue ?? 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-green-500 flex-shrink-0" />
              </div>
            </div>
          </>
        )}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Verification Status</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {profile?.verification_status === 'verified' ? (
                  <span className="text-green-600">Verified</span>
                ) : (
                  <span className="text-yellow-600">Pending</span>
                )}
              </p>
            </div>
            <ChefHat className={`h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 ${
              profile?.verification_status === 'verified' ? 'text-green-600' : 'text-yellow-600'
            }`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Average Rating</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
              </p>
              {averageRating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                  <span className="text-xs text-gray-600">({totalReviews} reviews)</span>
                </div>
              )}
            </div>
            <Star className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Reviews</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{totalReviews}</p>
            </div>
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Prep Time</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {profile?.estimated_prep_time_minutes || 60} min
              </p>
            </div>
            <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-green-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Service Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Pricing</h3>
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Min Order:</span>
              <span className="font-medium">${parseFloat(profile?.minimum_order_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee:</span>
              <span className="font-medium">${parseFloat(profile?.service_fee || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Radius:</span>
              <span className="font-medium">{profile?.service_radius_km || 10} km</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Cuisines</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.cuisines && profile.cuisines.length > 0 ? (
              profile.cuisines.slice(0, 4).map((cuisine, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                >
                  {cuisine}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">No cuisines added</span>
            )}
            {profile?.cuisines && profile.cuisines.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{profile.cuisines.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <Link
              to="/profile"
              className="block w-full px-3 sm:px-4 py-2.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center text-xs sm:text-sm"
            >
              Edit Profile
            </Link>
            <Link
              to="/gallery"
              className="block w-full px-3 sm:px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-xs sm:text-sm"
            >
              Manage Gallery
            </Link>
            <Link
              to="/reviews"
              className="block w-full px-3 sm:px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-xs sm:text-sm"
            >
              View All Reviews
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Recent Reviews</h2>
            <Link
              to="/reviews"
              className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 flex-shrink-0"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {recentReviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-3 sm:pb-4 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                          i < review.rating
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                    {review.customer_name || 'Anonymous'}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.title && (
                  <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1 truncate">{review.title}</p>
                )}
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
