import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import api from '../services/api'
import { User, Mail, Phone, MapPin, Edit, Plus, Trash2, Package, CreditCard, Settings, Eye, EyeOff, Sparkles, TrendingUp, Users as UsersIcon } from 'lucide-react'
import PrivateRoute from '../components/PrivateRoute'
import PageBanner from '../components/PageBanner'
import { PageSkeleton } from '../components/SkeletonLoader'
import { Link } from 'react-router-dom'

const Profile = () => {
  const { user, token } = useAuth()
  const { deliveryAddress, updateAddress } = useLocation()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingAddress, setEditingAddress] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_default: false
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    if (token) {
      fetchProfileData()
    }
  }, [token])

  const fetchProfileData = async () => {
    try {
      const [profileRes, addressesRes, ordersRes] = await Promise.all([
        api.get('/customer/me'),
        api.get('/customer/addresses'),
        api.get('/customer/orders/?limit=5')
      ])
      // Handle different response formats
      const profileData = profileRes.data?.data || profileRes.data
      setProfile(profileData)
      setAddresses(Array.isArray(addressesRes.data) ? addressesRes.data : (addressesRes.data?.addresses || []))
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders || []))
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
      console.error('Error response:', error.response?.data)
      // Set profile from user context if API fails
      if (user) {
        setProfile({
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          phone: user.phone || ''
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAddress = async () => {
    try {
      if (editingAddress) {
        await api.put(`/customer/addresses/${editingAddress.id}`, addressForm)
      } else {
        await api.post('/customer/addresses', addressForm)
      }
      await fetchProfileData()
      setShowAddressForm(false)
      setEditingAddress(null)
      setAddressForm({
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        is_default: false
      })
    } catch (error) {
      console.error('Failed to save address:', error)
    }
  }

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      await api.delete(`/customer/addresses/${addressId}`)
      await fetchProfileData()
    } catch (error) {
      console.error('Failed to delete address:', error)
    }
  }

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await api.put(`/customer/addresses/${addressId}/set-default`)
      await fetchProfileData()
    } catch (error) {
      console.error('Failed to set default address:', error)
    }
  }

  if (loading) {
    return (
      <PrivateRoute>
        <PageSkeleton />
      </PrivateRoute>
    )
  }

  return (
    <PrivateRoute>
      <div className="w-full">
        {/* Banner Header with Ad Support */}
        <PageBanner
          title="Profile"
          subtitle="Manage your account settings and preferences"
          placement="profile_top_banner"
          defaultContent={
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <User className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  My Profile
                </h1>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
                Manage your account settings, delivery addresses, and preferences. Keep your information up to date!
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Account Settings</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Delivery Addresses</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Order History</span>
                </div>
              </div>
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 break-all">{profile?.email}</p>
              </div>
              
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'addresses'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Addresses
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Order History
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Settings
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Account Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-900">{profile?.phone || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-semibold text-gray-900">
                          {profile?.first_name} {profile?.last_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card text-center">
                    <Package className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    <p className="text-gray-600">Total Orders</p>
                  </div>
                  <div className="card text-center">
                    <MapPin className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{addresses.length}</p>
                    <p className="text-gray-600">Saved Addresses</p>
                  </div>
                  <div className="card text-center">
                    <CreditCard className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600">Payment Methods</p>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h3>
                  {orders.length === 0 ? (
                    <p className="text-gray-600">No orders yet</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <Link
                          key={order.id}
                          to={`/orders/${order.id}`}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-primary-600 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                ${parseFloat(order.total_amount).toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600 capitalize">
                                {order.status.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                      <Link to="/orders" className="block text-center text-primary-600 hover:text-primary-700 font-medium">
                        View All Orders →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Saved Addresses</h3>
                  <button
                    onClick={() => {
                      setEditingAddress(null)
                      setAddressForm({
                        street_address: '',
                        city: '',
                        state: '',
                        postal_code: '',
                        country: '',
                        is_default: false
                      })
                      setShowAddressForm(true)
                    }}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Address</span>
                  </button>
                </div>

                {showAddressForm && (
                  <div className="card">
                    <h4 className="text-lg font-semibold mb-4">
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </h4>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={addressForm.street_address}
                        onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
                        className="input"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="City"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Province"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Postal Code"
                          value={addressForm.postal_code}
                          onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Country"
                          value={addressForm.country}
                          onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                          className="input"
                        />
                      </div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={addressForm.is_default}
                          onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                        />
                        <span>Set as default address</span>
                      </label>
                      <div className="flex space-x-4">
                        <button onClick={handleSaveAddress} className="btn-primary flex-1">
                          Save Address
                        </button>
                        <button
                          onClick={() => {
                            setShowAddressForm(false)
                            setEditingAddress(null)
                          }}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map((address) => (
                    <div key={address.id} className="card">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          {address.is_default && (
                            <span className="inline-block bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-1 rounded mb-2">
                              Default
                            </span>
                          )}
                          <p className="font-semibold text-gray-900">{address.street_address}</p>
                          <p className="text-gray-600">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          <p className="text-gray-600">{address.country}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingAddress(address)
                              setAddressForm({
                                street_address: address.street_address,
                                city: address.city,
                                state: address.state,
                                postal_code: address.postal_code,
                                country: address.country,
                                is_default: address.is_default
                              })
                              setShowAddressForm(true)
                            }}
                            className="p-2 text-gray-600 hover:text-primary-600"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="p-2 text-gray-600 hover:text-red-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefaultAddress(address.id)}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Order History</h3>
                <Link to="/orders" className="btn-primary inline-block mb-6">
                  View All Orders
                </Link>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="block card hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ${parseFloat(order.total_amount).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {order.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Notifications
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span>Receive email updates about orders</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMS Notifications
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span>Receive SMS updates about orders</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marketing Emails
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span>Receive promotional emails and offers</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Current Password"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="New Password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <button className="btn-primary">Update Password</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </PrivateRoute>
  )
}

export default Profile

