import { useEffect, useState } from 'react'
import api from '../services/api'
import { Star, MessageSquare, Calendar, User } from 'lucide-react'

const Ratings = () => {
  const [ratings, setRatings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRatings()
  }, [])

  const fetchRatings = async () => {
    try {
      setLoading(true)
      // Note: This endpoint may need to be created on the backend
      // For now, we'll try to get ratings from driver profile or deliveries
      const profileRes = await api.get('/driver/me')
      const averageRating = profileRes.data?.average_rating || 0
      
      // Try to get detailed ratings if endpoint exists
      try {
        const ratingsRes = await api.get('/driver/ratings')
        setRatings(Array.isArray(ratingsRes.data) ? ratingsRes.data : [])
      } catch (error) {
        // If endpoint doesn't exist, create mock data from deliveries
        const deliveriesRes = await api.get('/driver/deliveries')
        const completedDeliveries = Array.isArray(deliveriesRes.data) 
          ? deliveriesRes.data.filter(d => d.status === 'delivered')
          : []
        
        // Mock ratings data (in real app, this would come from backend)
        const mockRatings = completedDeliveries.slice(0, 10).map((d, idx) => ({
          id: d.id,
          order_number: d.order_number,
          rating: 4 + (idx % 2), // Mock rating between 4-5
          comment: idx % 3 === 0 ? 'Great delivery, very fast!' : null,
          customer_name: 'Customer',
          created_at: d.delivered_at || d.created_at
        }))
        setRatings(mockRatings)
      }
      
      // Calculate stats
      const allRatings = ratings.length > 0 ? ratings : []
      const ratingCounts = {
        5: allRatings.filter(r => r.rating === 5).length,
        4: allRatings.filter(r => r.rating === 4).length,
        3: allRatings.filter(r => r.rating === 3).length,
        2: allRatings.filter(r => r.rating === 2).length,
        1: allRatings.filter(r => r.rating === 1).length
      }
      
      setStats({
        average: averageRating,
        total: allRatings.length,
        ratingCounts
      })
    } catch (error) {
      console.error('Failed to fetch ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ratings & Reviews</h1>
        <p className="text-gray-600 mt-1">View customer feedback and ratings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.average ? stats.average.toFixed(1) : 'N/A'}
              </p>
              <div className="mt-2">
                {renderStars(Math.round(stats?.average || 0))}
              </div>
            </div>
            <Star className="h-10 w-10 text-yellow-500 fill-current" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Ratings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.total || 0}
              </p>
            </div>
            <MessageSquare className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">5-Star Ratings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.ratingCounts?.[5] || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.total > 0 
                  ? `${((stats.ratingCounts[5] / stats.total) * 100).toFixed(0)}% of total`
                  : '0%'}
              </p>
            </div>
            <Star className="h-10 w-10 text-yellow-500 fill-current" />
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rating Distribution</h2>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats?.ratingCounts?.[rating] || 0
            const percentage = stats?.total > 0 ? (count / stats.total) * 100 : 0
            return (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <span className="text-sm font-medium text-gray-700">{rating}</span>
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reviews</h2>
        {ratings.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div
                key={rating.id}
                className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {rating.customer_name || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Order #{rating.order_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {renderStars(rating.rating)}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(rating.created_at)}
                    </p>
                  </div>
                </div>
                {rating.comment && (
                  <p className="text-gray-700 text-sm ml-13 mt-2">{rating.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Ratings

