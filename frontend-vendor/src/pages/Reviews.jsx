import { useEffect, useState } from 'react'
import api from '../services/api'
import { Star, MessageSquare, Flag } from 'lucide-react'
import { formatDateTime } from '../utils/format'

const Reviews = () => {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState('all')
  const [selectedReview, setSelectedReview] = useState(null)
  const [responseText, setResponseText] = useState('')

  useEffect(() => {
    fetchData()
  }, [ratingFilter])

  const fetchData = async () => {
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        api.get(`/reviews/?${ratingFilter !== 'all' ? `rating_filter=${ratingFilter}` : ''}`),
        api.get('/reviews/stats/summary')
      ])
      setReviews(reviewsRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (reviewId) => {
    if (!responseText.trim()) return
    
    try {
      await api.put(`/reviews/${reviewId}/respond`, { vendor_response: responseText })
      alert('Response submitted successfully!')
      setSelectedReview(null)
      setResponseText('')
      fetchData()
    } catch (error) {
      console.error('Failed to submit response:', error)
      alert(error.response?.data?.detail || 'Failed to submit response. Please try again.')
    }
  }

  const handleReport = async (reviewId) => {
    const reason = prompt('Why are you reporting this review?')
    if (!reason) return
    
    try {
      await api.post(`/reviews/${reviewId}/report`, null, { params: { reason } })
      alert('Review reported successfully')
      fetchData()
    } catch (error) {
      alert('Failed to report review')
    }
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
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
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">View and respond to customer feedback</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Average Rating</p>
            <div className="flex items-center mt-2">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 fill-current" />
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 ml-2">
                {stats.average_rating.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Total Reviews</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_reviews}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Rating Distribution</p>
            <div className="mt-2 space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center text-xs sm:text-sm">
                  <span className="w-6 sm:w-8">{rating}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${(stats.rating_distribution[rating] / stats.total_reviews) * 100 || 0}%`
                      }}
                    />
                  </div>
                  <span className="w-6 sm:w-8 text-right">{stats.rating_distribution[rating] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 5, 4, 3, 2, 1].map((rating) => (
          <button
            key={rating}
            onClick={() => setRatingFilter(rating.toString())}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
              ratingFilter === rating.toString()
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {rating === 'all' ? 'All' : `${rating}★`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        {reviews.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Star className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600">No reviews yet</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-2 sm:mb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2 flex-wrap">
                  <div className="flex items-center">{renderStars(review.rating)}</div>
                  {review.is_verified_purchase && (
                    <span className="px-2 py-1 text-[10px] sm:text-xs bg-green-100 text-green-800 rounded-full">
                      Verified Purchase
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-gray-500">{formatDateTime(review.created_at)}</span>
              </div>
              
              {review.product_name && (
                <p className="text-xs sm:text-sm text-primary-600 font-medium mb-2">
                  Product: {review.product_name}
                </p>
              )}
              
              {review.title && (
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{review.title}</h3>
              )}
              
              <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">{review.comment}</p>
              
              {review.vendor_response ? (
                <div className="bg-primary-50 border-l-4 border-primary-500 p-3 sm:p-4 rounded mb-2">
                  <p className="text-xs sm:text-sm font-medium text-primary-900 mb-1">Your Response:</p>
                  <p className="text-xs sm:text-sm text-primary-800">{review.vendor_response}</p>
                  <p className="text-[10px] sm:text-xs text-primary-600 mt-2">
                    {formatDateTime(review.vendor_response_at)}
                  </p>
                </div>
              ) : (
                selectedReview === review.id ? (
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-2">
                    <textarea
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg mb-2"
                      placeholder="Write your response..."
                    />
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedReview(null)
                          setResponseText('')
                        }}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRespond(review.id)}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Submit Response
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedReview(review.id)}
                      className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Respond
                    </button>
                    <button
                      onClick={() => handleReport(review.id)}
                      className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Flag className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Report
                    </button>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Reviews

