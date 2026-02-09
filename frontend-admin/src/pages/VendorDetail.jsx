import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Store, Mail, Phone, MapPin, CheckCircle, XCircle, Package, ShoppingBag, DollarSign, Calendar, Percent, Users, CreditCard, Edit, Save } from 'lucide-react'

const VendorDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingCommission, setEditingCommission] = useState(false)
  const [commissionRate, setCommissionRate] = useState('')
  const [savingCommission, setSavingCommission] = useState(false)

  useEffect(() => {
    fetchVendor()
  }, [id])

  const fetchVendor = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/vendors/${id}`)
      const vendorData = response.data?.data || response.data
      if (!vendorData || !vendorData.id) {
        throw new Error('Invalid vendor data received')
      }
      setVendor(vendorData)
      setCommissionRate(vendorData.commission_rate || '')
    } catch (error) {
      console.error('Failed to fetch vendor:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load vendor details'
      alert(`Error: ${errorMessage}`)
      setVendor(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCommission = async () => {
    setSavingCommission(true)
    try {
      await api.put(`/admin/vendors/${id}/commission`, {
        commission_rate: parseFloat(commissionRate)
      })
      alert('Commission rate updated successfully')
      setEditingCommission(false)
      fetchVendor()
    } catch (error) {
      alert('Failed to update commission rate')
    } finally {
      setSavingCommission(false)
    }
  }

  const handleActivate = async () => {
    if (!confirm('Are you sure you want to activate this vendor?')) return
    try {
      await api.put(`/admin/vendors/${id}/activate`)
      alert('Vendor activated successfully')
      fetchVendor()
    } catch (error) {
      alert('Failed to activate vendor')
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this vendor?')) return
    try {
      await api.put(`/admin/vendors/${id}/deactivate`)
      alert('Vendor deactivated successfully')
      fetchVendor()
    } catch (error) {
      alert('Failed to deactivate vendor')
    }
  }

  const handleVerify = async () => {
    if (!confirm('Are you sure you want to verify this vendor?')) return
    try {
      await api.put(`/admin/vendors/${id}/verify`)
      alert('Vendor verified successfully')
      fetchVendor()
    } catch (error) {
      alert('Failed to verify vendor')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Vendor not found</p>
        <button
          onClick={() => navigate('/vendors')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Vendors
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.business_name}</h1>
            <p className="text-gray-600 mt-1">{vendor.business_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!vendor.is_active && (
            <button
              onClick={handleActivate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Activate
            </button>
          )}
          {vendor.is_active && (
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Deactivate
            </button>
          )}
          {vendor.verification_status !== 'verified' && (
            <button
              onClick={handleVerify}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Verify
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Business Name</p>
                <p className="font-medium text-gray-900">{vendor.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Business Type</p>
                <p className="font-medium text-gray-900">{vendor.business_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </p>
                <p className="font-medium text-gray-900">{vendor.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </p>
                <p className="font-medium text-gray-900">{vendor.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </p>
                <p className="font-medium text-gray-900">
                  {vendor.street_address}, {vendor.city}, {vendor.state} {vendor.postal_code}
                </p>
                {vendor.region && (
                  <p className="text-sm text-gray-500 mt-1">Region: {vendor.region}</p>
                )}
              </div>
              {vendor.description && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium text-gray-900">{vendor.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Package className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{vendor.product_count}</p>
                <p className="text-sm text-gray-500">Products</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <ShoppingBag className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{vendor.order_count}</p>
                <p className="text-sm text-gray-500">Orders</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">${parseFloat(vendor.total_revenue).toFixed(2)}</p>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
            </div>
          </div>

          {/* Commission Management */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Commission Rate
              </h2>
              {!editingCommission && (
                <button
                  onClick={() => setEditingCommission(true)}
                  className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
            {editingCommission ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCommission(false)
                      setCommissionRate(vendor.commission_rate || '')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCommission}
                    disabled={savingCommission}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingCommission ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {vendor.commission_rate ? `${vendor.commission_rate}%` : 'Not Set'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Commission rate for this vendor</p>
              </div>
            )}
          </div>

          {/* Payout History */}
          {vendor.payouts && vendor.payouts.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payout History
              </h2>
              <div className="space-y-3">
                {vendor.payouts.map((payout) => (
                  <div key={payout.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{payout.payout_number}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${parseFloat(payout.net_amount).toFixed(2)}</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Management */}
          {vendor.staff && vendor.staff.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members
              </h2>
              <div className="space-y-3">
                {vendor.staff.map((member) => (
                  <div key={member.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {member.role}
                        </span>
                        {member.is_active ? (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                        ) : (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Account Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vendor.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Verification Status</p>
                <div className="flex items-center gap-2">
                  {vendor.verification_status === 'verified' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-700">Pending</span>
                    </>
                  )}
                </div>
              </div>
              {vendor.verified_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Verified At
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(vendor.verified_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joined
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(vendor.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VendorDetail

