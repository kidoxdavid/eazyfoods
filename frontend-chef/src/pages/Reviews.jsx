import { useEffect, useState } from 'react'
import api from '../services/api'
import { Star, MessageSquare, Send, Calendar } from 'lucide-react'

const Reviews = () => {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState(null)
  const [responseText, setResponseText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await api.get('/chef/reviews')
      setReviews(response.data || [])
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (reviewId) => {
    if (!responseText.trim()) return
    
    setSaving(true)
    try {
      await api.post(`/chef/reviews/${reviewId}/respond`, {
        response: responseText
      })
      setResponseText('')
      setRespondingTo(null)
      fetchReviews() // Refresh reviews
      alert('Response added successfully!')
    } catch (error) {
      console.error('Failed to respond to review:', error)
      alert('Failed to add response. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
          <div className="text-sm text-gray-600">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No reviews yet</p>
            <p className="text-sm text-gray-500">Reviews from customers will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {review.rating}/5
                      </span>
                      {review.title && (
                        <span className="text-sm font-medium text-gray-700">
                          {review.title}
                        </span>
                      )}
                    </div>
                    
                    {review.cuisine_quality && (
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                        <span>Cuisine: {review.cuisine_quality}/5</span>
                        {review.service_quality && <span>Service: {review.service_quality}/5</span>}
                        {review.value_for_money && <span>Value: {review.value_for_money}/5</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>

                <p className="text-gray-900 mb-3">{review.comment}</p>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <span>—</span>
                  <span className="font-medium">{review.customer_name || 'Anonymous'}</span>
                </div>

                {review.chef_response ? (
                  <div className="bg-primary-50 rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-primary-700">Your Response</span>
                      {review.chef_response_at && (
                        <span className="text-xs text-primary-600">
                          {new Date(review.chef_response_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary-900">{review.chef_response}</p>
                  </div>
                ) : (
                  respondingTo === review.id ? (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write your response..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespond(review.id)}
                          disabled={saving || !responseText.trim()}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          <Send className="h-4 w-4" />
                          {saving ? 'Sending...' : 'Send Response'}
                        </button>
                        <button
                          onClick={() => {
                            setRespondingTo(null)
                            setResponseText('')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingTo(review.id)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Respond to Review
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Reviews
