import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import api from '../services/api'
import { Package, MapPin, Clock, CheckCircle, Star, Truck, User, Phone, Car } from 'lucide-react'
import { formatDateTime } from '../utils/format'
import PrivateRoute from '../components/PrivateRoute'
import DeliveryTracker from '../components/DeliveryTracker'
import { OrderDetailSkeleton } from '../components/SkeletonLoader'

const OrderDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/customer/orders/${id}`)
      setOrder(response.data)
      // If delivery exists and is delivered but not rated, show rating form
      if (response.data.delivery && response.data.delivery.status === 'delivered' && !response.data.delivery.customer_rating) {
        setShowRatingForm(true)
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    if (!order.delivery || !order.delivery.id) return

    setSubmittingRating(true)
    try {
      await api.post(`/customer/deliveries/${order.delivery.id}/rate`, {
        rating,
        feedback: feedback || null
      })
      // Refresh order to get updated rating
      await fetchOrder()
      setShowRatingForm(false)
      setRating(5)
      setFeedback('')
      alert('Thank you for rating the driver!')
    } catch (error) {
      console.error('Failed to submit rating:', error)
      alert(error.response?.data?.detail || 'Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  const renderStars = (ratingValue, interactive = false, onChange = null) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < ratingValue ? 'text-yellow-400 fill-current' : 'text-gray-300'
        } ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
        onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
      />
    ))
  }

  const getStatusSteps = (status) => {
    const steps = [
      { key: 'new', label: 'Order Placed', completed: true },
      { key: 'accepted', label: 'Accepted', completed: ['accepted', 'picking', 'ready', 'picked_up', 'delivered'].includes(status) },
      { key: 'picking', label: 'Picking', completed: ['picking', 'ready', 'picked_up', 'delivered'].includes(status) },
      { key: 'ready', label: 'Ready', completed: ['ready', 'picked_up', 'delivered'].includes(status) },
      { key: 'delivered', label: 'Delivered', completed: ['picked_up', 'delivered'].includes(status) }
    ]
    return steps
  }

  if (loading) {
    return (
      <PrivateRoute>
        <OrderDetailSkeleton />
      </PrivateRoute>
    )
  }

  if (!order) {
    return (
      <PrivateRoute>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Package className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600">This order isn't available — but your African grocery orders are safe with us! 📦</p>
            <p className="text-gray-600 mb-4">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link to="/orders" className="btn-primary inline-block">
              View My Orders
            </Link>
          </div>
        </div>
      </PrivateRoute>
    )
  }

  const statusSteps = getStatusSteps(order.status)
  const orderPlaced = location.state?.orderPlaced || false

  return (
    <PrivateRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {orderPlaced && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Order Placed Successfully!</h3>
                <p className="text-green-700">Your order #{order.order_number} has been confirmed.</p>
              </div>
            </div>
          </div>
        )}
        
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Orders
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Order #{order.order_number}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Placed on {formatDateTime(order.created_at)}
          </p>
        </div>

        {/* Order Status Timeline */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Status</h2>
          <div className="space-y-4">
            {statusSteps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <Clock className="h-6 w-6" />
                  )}
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${
                    step.completed ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items */}
        <div className="card mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-gray-200 last:border-0">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{item.product_name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </p>
                  {(order.status === 'delivered' || order.status === 'picked_up') && item.product_id && (
                    <Link
                      to={`/products/${item.product_id}?review=true&order_id=${order.id}`}
                      className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium px-2 sm:px-3 py-1 border border-primary-600 rounded-lg hover:bg-primary-50 whitespace-nowrap"
                    >
                      Review Product
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="card mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600">Subtotal</span>
              <span>${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600">Tax</span>
              <span>${parseFloat(order.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600">Shipping</span>
              <span>${parseFloat(order.shipping_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-primary-600">${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="card mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Delivery Information</h2>
          <div className="space-y-2">
            <div className="flex items-center text-sm sm:text-base text-gray-600">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              <span className="capitalize">{order.delivery_method}</span>
            </div>
            {order.delivery_method === 'delivery' && (
              <div className="flex items-center text-sm sm:text-base text-gray-600">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                <span>Delivery address will be shown here</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Delivery Tracking */}
        {order.delivery && order.delivery.id && 
         ['accepted', 'picked_up', 'in_transit'].includes(order.delivery.status) && (
          <div className="card mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Track Your Delivery</h2>
            <DeliveryTracker deliveryId={order.delivery.id} />
          </div>
        )}

        {/* Driver Information & Rating */}
        {order.delivery && order.delivery.driver_id && (
          <div className="card">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Driver Information</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="space-y-2">
                    {order.delivery.driver_name && (
                      <div className="flex items-center text-sm sm:text-base text-gray-900">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                        <span className="font-medium truncate">{order.delivery.driver_name}</span>
                      </div>
                    )}
                    {order.delivery.driver_phone && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                        <span className="break-all">{order.delivery.driver_phone}</span>
                      </div>
                    )}
                    {order.delivery.driver_vehicle && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <Car className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{order.delivery.driver_vehicle}</span>
                      </div>
                    )}
                    {order.delivery.actual_delivery_time && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                        <span className="break-words">Delivered on {formatDateTime(order.delivery.actual_delivery_time)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating Section */}
              {order.delivery.status === 'delivered' && (
                <div className="pt-4 border-t border-gray-200">
                  {order.delivery.customer_rating ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Your Rating</h3>
                      <div className="flex items-center space-x-2 mb-2">
                        {renderStars(order.delivery.customer_rating)}
                        <span className="text-sm text-gray-600">{order.delivery.customer_rating} out of 5</span>
                      </div>
                      {order.delivery.customer_feedback && (
                        <p className="text-sm text-gray-700 mt-2">{order.delivery.customer_feedback}</p>
                      )}
                    </div>
                  ) : showRatingForm ? (
                    <form onSubmit={handleSubmitRating}>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Rate Your Driver</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                        <div className="flex items-center space-x-2">
                          {renderStars(rating, true, setRating)}
                          <span className="text-sm text-gray-600 ml-2">{rating} out of 5</span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (optional)</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Share your experience with the driver..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRatingForm(false)
                            setRating(5)
                            setFeedback('')
                          }}
                          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingRating}
                          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          {submittingRating ? 'Submitting...' : 'Submit Rating'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowRatingForm(true)}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Rate Driver
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PrivateRoute>
  )
}

export default OrderDetail

