import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import api from '../services/api'
import { Package, MapPin, Clock, CheckCircle, Star, Truck, User, Phone, Car, Camera } from 'lucide-react'
import { formatDateTime } from '../utils/format'
import { resolveImageUrl } from '../utils/imageUtils'
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
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {orderPlaced && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-green-900">Order Placed Successfully!</h3>
                <p className="text-xs text-green-700">Order #{order.order_number} confirmed.</p>
              </div>
            </div>
          </div>
        )}
        
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 mb-3 inline-block text-sm">
          ← Back to Orders
        </Link>

        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            Order #{order.order_number}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {formatDateTime(order.created_at)}
          </p>
        </div>

        {/* Order Status Timeline - compact */}
        <div className="card mb-4 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Order Status</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {statusSteps.map((step) => (
              <div key={step.key} className="flex items-center gap-2">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step.completed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <p className={`text-xs font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items - compact */}
        <div className="card mb-4 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h2>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <p className="font-medium text-gray-900 text-sm">${parseFloat(item.subtotal).toFixed(2)}</p>
                  {(order.status === 'delivered' || order.status === 'picked_up') && item.product_id && (
                    <Link
                      to={`/products/${item.product_id}?review=true&order_id=${order.id}`}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                    >
                      Review
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary + Delivery in one row on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Order Summary</h2>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>${parseFloat(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>${parseFloat(order.tax_amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>${parseFloat(order.shipping_amount).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                <span>Total</span><span className="text-primary-600">${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Fulfillment</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="h-4 w-4 flex-shrink-0" />
              <span className="capitalize">{order.delivery_method}</span>
            </div>
            {order.delivery_method === 'delivery' && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Address shown at checkout</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Delivery Tracking */}
        {order.delivery && order.delivery.id && 
         ['accepted', 'picked_up', 'in_transit'].includes(order.delivery.status) && (
          <div className="card mb-4 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Track Delivery</h2>
            <DeliveryTracker deliveryId={order.delivery.id} />
          </div>
        )}

        {/* Driver Information & Rating */}
        {order.delivery && order.delivery.driver_id && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Driver</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                  <Truck className="h-4 w-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0 text-xs sm:text-sm">
                  {order.delivery.driver_name && (
                    <div className="flex items-center gap-1.5 text-gray-900">
                      <User className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium truncate">{order.delivery.driver_name}</span>
                    </div>
                  )}
                  {order.delivery.driver_phone && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="break-all">{order.delivery.driver_phone}</span>
                    </div>
                  )}
                  {order.delivery.driver_vehicle && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Car className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{order.delivery.driver_vehicle}</span>
                    </div>
                  )}
                  {order.delivery.actual_delivery_time && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Delivered {formatDateTime(order.delivery.actual_delivery_time)}</span>
                    </div>
                  )}
                  {order.delivery.status === 'delivered' && order.delivery.delivery_photo_url && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5" />
                        Proof of delivery
                      </p>
                      <a
                        href={resolveImageUrl(order.delivery.delivery_photo_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-[200px] hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={resolveImageUrl(order.delivery.delivery_photo_url)}
                          alt="Delivery proof"
                          className="w-full h-auto object-cover max-h-48"
                        />
                      </a>
                      <p className="text-[10px] text-gray-500 mt-1">Photo taken by driver at delivery</p>
                    </div>
                  )}
                </div>
              </div>
              {order.delivery.status === 'delivered' && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  {order.delivery.customer_rating ? (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Your rating</p>
                      <div className="flex items-center gap-1.5">
                        {renderStars(order.delivery.customer_rating)}
                        <span className="text-xs text-gray-600">{order.delivery.customer_rating}/5</span>
                      </div>
                      {order.delivery.customer_feedback && (
                        <p className="text-xs text-gray-600 mt-1">{order.delivery.customer_feedback}</p>
                      )}
                    </div>
                  ) : showRatingForm ? (
                    <form onSubmit={handleSubmitRating} className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Rate driver</p>
                      <div className="flex items-center gap-2">
                        {renderStars(rating, true, setRating)}
                        <span className="text-xs text-gray-600">{rating}/5</span>
                      </div>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Feedback (optional)"
                        rows={2}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setShowRatingForm(false); setRating(5); setFeedback('') }} className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                        <button type="submit" disabled={submittingRating} className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{submittingRating ? 'Submitting...' : 'Submit'}</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowRatingForm(true)} className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">Rate driver</button>
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

