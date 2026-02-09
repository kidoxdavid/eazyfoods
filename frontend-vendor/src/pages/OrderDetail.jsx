import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, CheckCircle, XCircle, Truck, MapPin, Clock, User } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../utils/format'

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`)
      setOrder(response.data)
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this order?`)) return

    setProcessing(true)
    try {
      await api.put(`/orders/${id}/${action.replace(' ', '-')}`)
      fetchOrder()
    } catch (error) {
      alert('Failed to update order status')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusActions = () => {
    if (!order) return []
    const actions = []
    if (order.status === 'new') actions.push({ label: 'Accept Order', action: 'accept' })
    if (order.status === 'accepted') actions.push({ label: 'Start Picking', action: 'start-picking' })
    if (order.status === 'picking') actions.push({ label: 'Mark Ready', action: 'mark-ready' })
    // Delivery orders: after "Mark Ready" only the driver updates status (accept → picked_up → delivered)
    if (order.status === 'ready' && order.delivery_method !== 'delivery') {
      actions.push({ label: 'Complete Order', action: 'complete' })
    }
    if (!['picked_up', 'delivered', 'cancelled'].includes(order.status)) {
      actions.push({ label: 'Cancel Order', action: 'cancel', danger: true })
    }
    return actions
  }

  const isDeliveryAwaitingDriver = order?.delivery_method === 'delivery' && order?.status === 'ready' && !order?.driver_id

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) {
    return <div>Order not found</div>
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={() => navigate('/orders')}
          className="text-gray-600 hover:text-gray-900 p-1"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Order {order.order_number}</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{formatDateTime(order.created_at)}</p>
        </div>
      </div>

      {/* Delivery: status updated by driver */}
      {isDeliveryAwaitingDriver && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Delivery in progress</h2>
          <p className="text-sm text-blue-800 mb-3">
            This order will appear in <strong>Available deliveries</strong> in the Driver portal. A driver can accept or reject it. Status (accepted → picked up → delivered) is updated only by the driver.
          </p>
          <Link
            to="/orders?tab=delivery"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <Truck className="h-4 w-4" />
            View Orders (Delivery tab)
          </Link>
        </div>
      )}
      {order.delivery_method === 'delivery' && order.status === 'ready' && order.driver_id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
          <p className="text-sm text-blue-800">
            A driver has been assigned. Status will update when they mark <strong>Picked up</strong> and <strong>Delivered</strong> in the Driver portal.
          </p>
          <Link to="/orders?tab=delivery" className="text-sm font-medium text-primary-600 hover:text-primary-800 mt-2 inline-block">View Orders (Delivery tab)</Link>
        </div>
      )}

      {/* Status Actions */}
      {getStatusActions().length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Order Actions</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {getStatusActions().map((action) => (
              <button
                key={action.action}
                onClick={() => handleStatusChange(action.action)}
                disabled={processing}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                  action.danger
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                } disabled:opacity-50`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Order Items</h2>
          <div className="space-y-3 sm:space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{item.product_name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatCurrency(item.product_price)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm sm:text-base font-medium text-gray-900 flex-shrink-0">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">{formatCurrency(order.shipping_amount)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600">-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Order Information</h2>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Status</p>
                <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">{order.status}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Payment Status</p>
                <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">{order.payment_status}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Delivery Method</p>
                <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">{order.delivery_method}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payout Information</h2>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Gross Sales</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{formatCurrency(order.gross_sales)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Commission ({order.commission_rate}%)</p>
                <p className="text-sm sm:text-base font-medium text-red-600">-{formatCurrency(order.commission_amount)}</p>
                {order.vendor_commission_rate != null && (
                  <p className="text-xs text-gray-500 mt-0.5">Your current rate (Admin): {order.vendor_commission_rate}%</p>
                )}
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600">Net Payout</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{formatCurrency(order.net_payout)}</p>
              </div>
            </div>
          </div>

          {order.special_instructions && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Special Instructions</h2>
              <p className="text-xs sm:text-sm text-gray-600">{order.special_instructions}</p>
            </div>
          )}

          {/* Delivery Information */}
          {order.delivery_method === 'delivery' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                Delivery Information
              </h2>
              {order.driver ? (
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Driver</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900">{order.driver.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">{order.driver.phone}</p>
                    {order.driver.vehicle_type && (
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {order.driver.vehicle_type} {order.driver.license_plate ? `(${order.driver.license_plate})` : ''}
                      </p>
                    )}
                  </div>
                  {order.delivery && (
                    <>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">Delivery Status</p>
                        <span className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                          order.delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                          order.delivery.status === 'picked_up' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.delivery.status.replace('_', ' ')}
                        </span>
                      </div>
                      {order.delivery.estimated_pickup_time && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            Est. Pickup
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-900">
                            {new Date(order.delivery.estimated_pickup_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {order.delivery.estimated_delivery_time && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            Est. Delivery
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-900">
                            {new Date(order.delivery.estimated_delivery_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {order.delivery.distance_km && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            Distance
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-900">
                            {parseFloat(order.delivery.distance_km).toFixed(1)} km
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : order.status === 'ready' ? (
                <div className="text-center py-3 sm:py-4">
                  <p className="text-xs sm:text-sm text-gray-600">Waiting for driver assignment</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">A driver will be assigned when they accept this delivery</p>
                </div>
              ) : (
                <div className="text-center py-3 sm:py-4">
                  <p className="text-xs sm:text-sm text-gray-600">Order not ready for delivery yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail

