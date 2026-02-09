import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, DollarSign, Package, User, Store, Calendar, CreditCard, RefreshCw, XCircle, CheckCircle } from 'lucide-react'

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/orders/${id}`)
      const orderData = response.data?.data || response.data
      if (!orderData || !orderData.id) {
        throw new Error('Invalid order data received')
      }
      setOrder(orderData)
    } catch (error) {
      console.error('Failed to fetch order:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load order details'
      alert(`Error: ${errorMessage}`)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      alert('Please provide a refund reason')
      return
    }

    setProcessing(true)
    try {
      await api.put(`/admin/orders/${id}/refund`, {
        reason: refundReason,
        amount: order.total_amount
      })
      alert('Order refunded successfully')
      setShowRefundModal(false)
      setRefundReason('')
      fetchOrder()
    } catch (error) {
      alert('Failed to refund order')
    } finally {
      setProcessing(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      alert('Please select a status')
      return
    }

    setProcessing(true)
    try {
      await api.put(`/admin/orders/${id}/status`, {
        status: newStatus
      })
      alert('Order status updated successfully')
      setNewStatus('')
      fetchOrder()
    } catch (error) {
      alert('Failed to update order status')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Orders
        </button>
      </div>
    )
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    accepted: 'bg-yellow-100 text-yellow-800',
    picking: 'bg-orange-100 text-orange-800',
    ready: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    picked_up: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-1">Order #{order.order_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.payment_status !== 'refunded' && order.status !== 'cancelled' && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refund Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${parseFloat(item.product_price).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Subtotal: ${parseFloat(item.subtotal).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-medium text-gray-900">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivery Method</p>
                <p className="font-medium text-gray-900 capitalize">{order.delivery_method}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium text-gray-900">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {new Date(order.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Current Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Payment Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                  order.payment_status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_status.toUpperCase()}
                </span>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Update Status</p>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select new status</option>
                  <option value="new">New</option>
                  <option value="accepted">Accepted</option>
                  <option value="picking">Picking</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {newStatus && (
                  <button
                    onClick={handleStatusUpdate}
                    disabled={processing}
                    className="mt-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {processing ? 'Updating...' : 'Update Status'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">${parseFloat(order.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">${parseFloat(order.shipping_amount).toFixed(2)}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${parseFloat(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>Total</span>
                <span>${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Vendor Info */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Parties</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Vendor
                </p>
                <p className="font-medium text-gray-900">{order.vendor_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </p>
                <p className="font-medium text-gray-900">{order.customer_name}</p>
                {order.customer_email && (
                  <p className="text-sm text-gray-500">{order.customer_email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Refund Order</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to refund this order? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Reason
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Enter reason for refund..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRefundModal(false)
                  setRefundReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={processing || !refundReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail

