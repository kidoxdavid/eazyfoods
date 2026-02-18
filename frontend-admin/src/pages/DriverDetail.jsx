import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, CheckCircle, XCircle, Truck, MapPin, Phone, Mail, DollarSign, Package, FileText, ExternalLink, X } from 'lucide-react'

// Resolve relative upload URLs to full API URL (for viewing documents)
const resolveDocUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = api.defaults.baseURL || ''
  const origin = base.replace(/\/api\/v1\/?$/, '')
  return origin ? `${origin}${url.startsWith('/') ? url : `/${url}`}` : url
}

const DriverDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [docViewUrl, setDocViewUrl] = useState(null)

  useEffect(() => {
    fetchDriver()
  }, [id])

  const fetchDriver = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/drivers/${id}`)
      const driverData = response.data?.data || response.data
      if (!driverData || !driverData.id) {
        throw new Error('Invalid driver data received')
      }
      setDriver(driverData)
    } catch (error) {
      console.error('Failed to fetch driver:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load driver details'
      alert(`Error: ${errorMessage}`)
      setDriver(null)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (status) => {
    const notes = prompt(`Enter notes for ${status}:`)
    if (notes === null) return
    
    try {
      await api.put(`/admin/drivers/${id}/verify?verification_status=${status}&verification_notes=${encodeURIComponent(notes)}`)
      alert(`Driver ${status} successfully`)
      fetchDriver()
    } catch (error) {
      console.error('Failed to verify driver:', error)
      const errorMessage = error.response?.data?.detail || error.message || `Failed to ${status} driver`
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleToggleActive = async () => {
    try {
      await api.put(`/admin/drivers/${id}/toggle-active`)
      fetchDriver()
    } catch (error) {
      alert('Failed to update driver status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Driver not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/drivers')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {driver.first_name} {driver.last_name}
          </h1>
          <p className="text-gray-600 mt-1">Driver Details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{driver.email}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{driver.phone}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <div className="mt-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {driver.street_address}, {driver.city}, {driver.state} {driver.postal_code}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents for Verification */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents for Verification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Driver Licence</div>
                {driver.driver_license_url ? (
                  <>
                    <button type="button" onClick={() => setDocViewUrl(resolveDocUrl(driver.driver_license_url))} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      View document <ExternalLink className="h-4 w-4" />
                    </button>
                    {driver.driver_license_validity && (
                      <p className="text-xs text-gray-500 mt-1">Valid until: {new Date(driver.driver_license_validity).toLocaleDateString()}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not uploaded</p>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Vehicle Registration</div>
                {driver.vehicle_registration_url ? (
                  <>
                    <button type="button" onClick={() => setDocViewUrl(resolveDocUrl(driver.vehicle_registration_url))} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      View document <ExternalLink className="h-4 w-4" />
                    </button>
                    {driver.vehicle_registration_validity && (
                      <p className="text-xs text-gray-500 mt-1">Valid until: {new Date(driver.vehicle_registration_validity).toLocaleDateString()}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not uploaded</p>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Insurance</div>
                {driver.insurance_document_url ? (
                  <>
                    <button type="button" onClick={() => setDocViewUrl(resolveDocUrl(driver.insurance_document_url))} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      View document <ExternalLink className="h-4 w-4" />
                    </button>
                    {driver.insurance_validity && (
                      <p className="text-xs text-gray-500 mt-1">Valid until: {new Date(driver.insurance_validity).toLocaleDateString()}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not uploaded</p>
                )}
              </div>
            </div>
            {!driver.driver_license_url && !driver.vehicle_registration_url && !driver.insurance_document_url && (
              <p className="text-sm text-gray-500 mt-2">No documents submitted yet.</p>
            )}
          </div>

          {/* Vehicle Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Vehicle Type</label>
                <p className="text-sm text-gray-900 mt-1">{driver.vehicle_type || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">License Plate</label>
                <p className="text-sm text-gray-900 mt-1">{driver.license_plate || 'N/A'}</p>
              </div>
              {driver.vehicle_make && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Make</label>
                  <p className="text-sm text-gray-900 mt-1">{driver.vehicle_make}</p>
                </div>
              )}
              {driver.vehicle_model && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Model</label>
                  <p className="text-sm text-gray-900 mt-1">{driver.vehicle_model}</p>
                </div>
              )}
              {driver.vehicle_year && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Year</label>
                  <p className="text-sm text-gray-900 mt-1">{driver.vehicle_year}</p>
                </div>
              )}
              {driver.vehicle_color && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Color</label>
                  <p className="text-sm text-gray-900 mt-1">{driver.vehicle_color}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Actions</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Verification Status</label>
                <div className="mt-1">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    driver.verification_status === 'approved' ? 'bg-green-100 text-green-800' :
                    driver.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {driver.verification_status}
                  </span>
                </div>
                {driver.verification_notes && (
                  <p className="text-xs text-gray-500 mt-2">{driver.verification_notes}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Account Status</label>
                <div className="mt-1">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    driver.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              {driver.verification_status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleVerify('approved')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleVerify('rejected')}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
              <button
                onClick={handleToggleActive}
                className={`w-full px-4 py-2 rounded-lg font-medium ${
                  driver.is_active
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {driver.is_active ? 'Deactivate' : 'Activate'} Driver
              </button>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Deliveries</span>
                <span className="text-sm font-medium text-gray-900">{driver.total_deliveries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-gray-900">{driver.completed_deliveries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="text-sm font-medium text-gray-900">{driver.cancelled_deliveries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Rating</span>
                <span className="text-sm font-medium text-gray-900">
                  {driver.average_rating > 0 ? `⭐ ${parseFloat(driver.average_rating).toFixed(1)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Earnings
                </span>
                <span className="text-lg font-bold text-gray-900">
                  ${parseFloat(driver.total_earnings || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document view popup */}
      {docViewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDocViewUrl(null)}>
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Document Preview</span>
              <button onClick={() => setDocViewUrl(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4">
              {docViewUrl?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                <img src={docViewUrl} alt="Document" className="max-w-full h-auto" />
              ) : (
                <iframe src={docViewUrl} title="Document" className="w-full h-[70vh] border-0" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverDetail

