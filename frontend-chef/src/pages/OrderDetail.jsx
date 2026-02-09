import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, CheckCircle, XCircle, MapPin, Clock } from 'lucide-react'
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
      const response = await api.get(`/chef/orders/${id}`)
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
      if (action === 'accept') {
        await api.put(`/chef/orders/${id}/accept`)
      } else if (action === 'mark-ready') {
        await api.put(`/chef/orders/${id}/mark-ready`)
      } else if (action === 'cancel') {
        const reason = prompt('Please provide a cancellation reason:')
        if (reason) {
          await api.put(`/chef/orders/${id}/cancel`, null, { params: { cancellation_reason: reason } })
        }
      }
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
    if (order.status === 'accepted' || order.status === 'new') actions.push({ label: 'Mark Ready', action: 'mark-ready' })
    if (!['picked_up', 'delivered', 'cancelled'].includes(order.status)) {
      actions.push({ label: 'Cancel Order', action: 'cancel', danger: true })
    }
    return actions
  }

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
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/orders')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order {order.order_number}</h1>
          <p className="text-gray-600 mt-1">{formatDateTime(order.created_at)}</p>
        </div>
      </div>

      {/* Status Actions */}
      {getStatusActions().length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Actions</h2>
          <div className="flex flex-wrap gap-3">
            {getStatusActions().map((action) => (
              <button
                key={action.action}
                onClick={() => handleStatusChange(action.action)}
                disabled={processing}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.product_name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(item.product_price)} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium text-gray-900">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">{formatCurrency(order.shipping_amount)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600">-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_status}
                </span>
              </div>
              {order.ready_at && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Ready: {formatDateTime(order.ready_at)}
                </div>
              )}
            </div>
          </div>

          {order.special_instructions && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h2>
              <p className="text-sm text-gray-600">{order.special_instructions}</p>
            </div>
          )}

          {order.customer_notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Customer Notes</h2>
              <p className="text-sm text-gray-600">{order.customer_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail




