import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, User, Mail, Phone, MapPin, ShoppingBag, DollarSign, Calendar, Ban, Shield, AlertTriangle } from 'lucide-react'

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomer()
    fetchCustomerOrders()
  }, [id])

  const fetchCustomer = async () => {
    setLoading(true)
    try {
      console.log('[CustomerDetail] ====== FETCHING CUSTOMER ======')
      console.log('[CustomerDetail] Customer ID:', id)
      console.log('[CustomerDetail] ID type:', typeof id)
      console.log('[CustomerDetail] Full URL will be: /admin/customers/' + id)
      
      // Check if we have a token
      const token = localStorage.getItem('admin_token')
      console.log('[CustomerDetail] Has token:', !!token)
      if (token) {
        console.log('[CustomerDetail] Token preview:', token.substring(0, 20) + '...')
      }
      
      const response = await api.get(`/admin/customers/${id}`)
      console.log('[CustomerDetail] ====== API RESPONSE RECEIVED ======')
      console.log('[CustomerDetail] Status:', response.status)
      console.log('[CustomerDetail] Headers:', response.headers)
      console.log('[CustomerDetail] Full response:', response)
      console.log('[CustomerDetail] Response data:', response.data)
      console.log('[CustomerDetail] Data type:', typeof response.data)
      console.log('[CustomerDetail] Is array:', Array.isArray(response.data))
      
      // Handle different response formats
      let customerData = response.data
      
      // If response.data is wrapped in another object
      if (response.data && response.data.data && typeof response.data.data === 'object') {
        customerData = response.data.data
        console.log('[CustomerDetail] Unwrapped nested data')
      }
      
      console.log('[CustomerDetail] Final customer data:', customerData)
      console.log('[CustomerDetail] Customer ID in data:', customerData?.id)
      console.log('[CustomerDetail] Customer email in data:', customerData?.email)
      
      if (!customerData) {
        console.error('[CustomerDetail] ERROR: No customer data received')
        throw new Error('No customer data received from API')
      }
      
      if (!customerData.id && !customerData.email) {
        console.error('[CustomerDetail] ERROR: Invalid customer data structure')
        console.error('[CustomerDetail] Data keys:', Object.keys(customerData))
        throw new Error('Invalid customer data: missing id or email')
      }
      
      console.log('[CustomerDetail] Setting customer state...')
      setCustomer(customerData)
      
      // Use orders from customer detail response if available, otherwise fetch separately
      if (customerData.recent_orders && Array.isArray(customerData.recent_orders)) {
        console.log('[CustomerDetail] Using orders from customer detail response:', customerData.recent_orders.length)
        setOrders(customerData.recent_orders)
      } else {
        console.log('[CustomerDetail] No orders in response, fetching separately...')
        fetchCustomerOrders()
      }
      
      console.log('[CustomerDetail] ====== SUCCESS ======')
    } catch (error) {
      console.error('[CustomerDetail] ====== ERROR OCCURRED ======')
      console.error('[CustomerDetail] Error object:', error)
      console.error('[CustomerDetail] Error name:', error.name)
      console.error('[CustomerDetail] Error message:', error.message)
      console.error('[CustomerDetail] Error stack:', error.stack)
      
      if (error.response) {
        console.error('[CustomerDetail] Error response exists')
        console.error('[CustomerDetail] Status:', error.response.status)
        console.error('[CustomerDetail] Status text:', error.response.statusText)
        console.error('[CustomerDetail] Headers:', error.response.headers)
        console.error('[CustomerDetail] Data:', error.response.data)
      } else if (error.request) {
        console.error('[CustomerDetail] Request was made but no response received')
        console.error('[CustomerDetail] Request:', error.request)
      } else {
        console.error('[CustomerDetail] Error setting up request:', error.message)
      }
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to load customer details'
      
      const statusCode = error.response?.status || 'Network Error'
      const fullError = `Failed to retrieve customer: ${errorMessage}\n\nStatus: ${statusCode}\nCustomer ID: ${id}\n\nCheck browser console for more details.`
      
      alert(fullError)
      setCustomer(null)
    } finally {
      setLoading(false)
      console.log('[CustomerDetail] ====== FETCH COMPLETE ======')
    }
  }

  const fetchCustomerOrders = async () => {
    try {
      console.log('[CustomerDetail] Fetching orders for customer:', id)
      const response = await api.get('/admin/orders', { params: { customer_id: id } })
      console.log('[CustomerDetail] Orders response:', response.data)
      const ordersData = Array.isArray(response.data) ? response.data : (response.data?.orders || [])
      setOrders(ordersData)
    } catch (error) {
      console.error('[CustomerDetail] Failed to fetch orders:', error)
      console.error('[CustomerDetail] Orders error response:', error.response?.data)
      setOrders([])
    }
  }

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this customer?')) return
    try {
      await api.put(`/admin/customers/${id}/suspend`)
      alert('Customer suspended successfully')
    } catch (error) {
      alert('Failed to suspend customer')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 max-w-md mx-auto">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-4">
            Unable to load customer details. Please check the customer ID and try again.
          </p>
          <p className="text-sm text-gray-500 mb-6">Customer ID: {id}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/customers')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Customers
            </button>
            <button
              onClick={() => {
                console.log('[CustomerDetail] Retrying fetch...')
                fetchCustomer()
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {customer.first_name || ''} {customer.last_name || ''}
              {!customer.first_name && !customer.last_name && customer.email && (
                <span className="text-gray-500">({customer.email})</span>
              )}
              {!customer.first_name && !customer.last_name && !customer.email && (
                <span className="text-gray-500">Customer #{customer.id?.substring(0, 8)}</span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">Customer Profile</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSuspend}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Suspend
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </p>
                <p className="font-medium text-gray-900">{customer.email || 'N/A'}</p>
                {customer.is_email_verified && (
                  <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </p>
                <p className="font-medium text-gray-900">{customer.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joined
                </p>
                <p className="font-medium text-gray-900">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses
              </h2>
              <div className="space-y-3">
                {customer.addresses.map((address) => (
                  <div key={address.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {address.street_address}
                        </p>
                        <p className="text-sm text-gray-500">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p className="text-sm text-gray-500">{address.country}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {address.type || 'shipping'}
                        </span>
                        {address.is_default && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order History */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order History
            </h2>
            {orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'delivered' || order.status === 'picked_up' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No orders yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <ShoppingBag className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{customer.order_count || 0}</p>
                <p className="text-sm text-gray-500">Total Orders</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  ${parseFloat(customer.total_spent || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Total Spent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail

