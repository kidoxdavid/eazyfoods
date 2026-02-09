import { useEffect, useState } from 'react'
import api from '../services/api'
import { Star, AlertTriangle, CheckCircle, XCircle, Eye, Download, CheckSquare, Square } from 'lucide-react'
import Pagination from '../components/Pagination'

const Reviews = () => {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedReviews, setSelectedReviews] = useState(new Set())
  const [bulkAction, setBulkAction] = useState('')

  useEffect(() => {
    fetchReviews()
    fetchStats()
  }, [ratingFilter, statusFilter, currentPage])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (ratingFilter !== 'all') params.rating_filter = parseInt(ratingFilter)
      if (statusFilter !== 'all') params.status_filter = statusFilter
      
      const response = await api.get('/admin/reviews', { params })
      const reviewsData = Array.isArray(response.data) ? response.data : []
      setReviews(reviewsData)
      setTotalPages(Math.ceil(reviewsData.length / 20) || 1)
      setSelectedReviews(new Set()) // Clear selection on page change
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      setReviews([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/reviews/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch review stats:', error)
    }
  }

  const handleModerate = async (reviewId, action) => {
    try {
      await api.put(`/admin/reviews/${reviewId}/moderate`, { action })
      alert(`Review ${action}ed successfully`)
      fetchReviews()
      fetchStats()
    } catch (error) {
      alert('Failed to moderate review')
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await api.delete(`/admin/reviews/${reviewId}`)
      alert('Review deleted successfully')
      fetchReviews()
      fetchStats()
    } catch (error) {
      alert('Failed to delete review')
    }
  }

  const handleSelectAll = () => {
    if (!Array.isArray(reviews)) return
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set())
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)))
    }
  }

  const handleSelectReview = (reviewId) => {
    const newSelected = new Set(selectedReviews)
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId)
    } else {
      newSelected.add(reviewId)
    }
    setSelectedReviews(newSelected)
  }

  const handleBulkModerate = async () => {
    if (selectedReviews.size === 0 || !bulkAction) {
      alert('Please select reviews and an action')
      return
    }

    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedReviews.size} review(s)?`)) return

    try {
      const promises = Array.from(selectedReviews).map(reviewId =>
        api.put(`/admin/reviews/${reviewId}/moderate`, { action: bulkAction })
      )
      await Promise.all(promises)
      alert(`Successfully ${bulkAction}ed ${selectedReviews.size} review(s)`)
      setSelectedReviews(new Set())
      setBulkAction('')
      fetchReviews()
      fetchStats()
    } catch (error) {
      alert('Failed to moderate reviews')
    }
  }

  const handleExport = () => {
    if (!Array.isArray(reviews)) return
    const csv = [
      ['Rating', 'Title', 'Comment', 'Vendor', 'Customer', 'Status', 'Date'],
      ...reviews.map(r => [
        r.rating,
        r.title || '',
        (r.comment || '').replace(/"/g, '""'),
        r.vendor_name || 'N/A',
        r.customer_name || 'Anonymous',
        r.is_abusive ? 'Abusive' : r.is_reported ? 'Reported' : 'Active',
        new Date(r.created_at).toLocaleDateString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
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
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-600 mt-1">Manage and moderate customer reviews</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_reviews}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Average Rating</p>
            <p className="text-2xl font-bold text-gray-900">{parseFloat(stats.average_rating).toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Reported</p>
            <p className="text-2xl font-bold text-red-600">{stats.reported_reviews}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Abusive</p>
            <p className="text-2xl font-bold text-red-600">{stats.abusive_reviews}</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-4">
        <div className="flex gap-4">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="abusive">Abusive</option>
          </select>
        </div>
        
        {selectedReviews.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">
              {selectedReviews.size} review(s) selected
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select action...</option>
              <option value="approve">Approve</option>
              <option value="mark_abusive">Mark as Abusive</option>
              <option value="remove_abusive">Remove Abusive Flag</option>
            </select>
            <button
              onClick={handleBulkModerate}
              disabled={!bulkAction}
              className="px-4 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedReviews(new Set())}
              className="px-4 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center"
                >
                  {selectedReviews.size === reviews.length && reviews.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(reviews) && reviews.map((review) => (
              <tr key={review.id} className={`hover:bg-gray-50 ${selectedReviews.has(review.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleSelectReview(review.id)}
                    className="flex items-center"
                  >
                    {selectedReviews.has(review.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{review.rating}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{review.title || 'No title'}</div>
                  <div className="text-sm text-gray-500 mt-1">{review.comment?.substring(0, 100)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{review.vendor_name || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{review.customer_name || 'Anonymous'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {review.is_abusive ? (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Abusive</span>
                  ) : review.is_reported ? (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Reported</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {review.is_reported && !review.is_abusive && (
                      <button
                        onClick={() => handleModerate(review.id, 'approve')}
                        className="text-green-600 hover:text-green-900"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {!review.is_abusive && (
                      <button
                        onClick={() => handleModerate(review.id, 'mark_abusive')}
                        className="text-red-600 hover:text-red-900"
                        title="Mark Abusive"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    )}
                    {review.is_abusive && (
                      <button
                        onClick={() => handleModerate(review.id, 'remove_abusive')}
                        className="text-green-600 hover:text-green-900"
                        title="Remove Abusive"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}

export default Reviews

