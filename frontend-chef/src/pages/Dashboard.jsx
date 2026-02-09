import { useEffect, useState } from 'react'
import api from '../services/api'
import { ChefHat, Star, Users, Clock, DollarSign, TrendingUp, AlertCircle, CheckCircle, Power } from 'lucide-react'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [profileRes, reviewsRes] = await Promise.all([
        api.get('/chef/profile'),
        api.get('/chef/reviews')
      ])
      setProfile(profileRes.data)
      setReviews(reviewsRes.data || [])
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.chef_name || 'Chef'}!
            </h1>
            <p className="text-gray-600">
              {profile?.verification_status === 'verified' 
                ? 'Your account is verified and active'
                : 'Your account is pending verification'}
            </p>
          </div>
          {/* Availability Toggle */}
          {profile && (
            <div className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center space-x-3">
                <Power className={`h-5 w-5 ${profile.is_available ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-700">Availability Status</p>
                  <p className={`text-xs ${profile.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                    {profile.is_available ? 'Available - Accepting orders' : 'Unavailable - Not accepting orders'}
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Verification Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.verification_status === 'verified' ? (
                  <span className="text-green-600">Verified</span>
                ) : (
                  <span className="text-yellow-600">Pending</span>
                )}
              </p>
            </div>
            <ChefHat className={`h-10 w-10 ${
              profile?.verification_status === 'verified' ? 'text-green-600' : 'text-yellow-600'
            }`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
              </p>
              {averageRating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-xs text-gray-600">({totalReviews} reviews)</span>
                </div>
              )}
            </div>
            <Star className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Prep Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.estimated_prep_time_minutes || 60} min
              </p>
            </div>
            <Clock className="h-10 w-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Service Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
          </div>
          <div className="space-y-2 text-sm">
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

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <ChefHat className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cuisines</h3>
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

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <Link
              to="/profile"
              className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center text-sm"
            >
              Edit Profile
            </Link>
            <Link
              to="/gallery"
              className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-sm"
            >
              Manage Gallery
            </Link>
            <Link
              to="/reviews"
              className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-sm"
            >
              View All Reviews
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
            <Link
              to="/reviews"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {review.customer_name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.title && (
                  <p className="text-sm font-medium text-gray-900 mb-1">{review.title}</p>
                )}
                <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
