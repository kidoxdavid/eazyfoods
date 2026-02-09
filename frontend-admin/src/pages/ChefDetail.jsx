import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, CheckCircle, XCircle, ChefHat, MapPin, Star, Mail, Phone } from 'lucide-react'

const ChefDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [chef, setChef] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChef()
  }, [id])

  const fetchChef = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/chefs/${id}`)
      setChef(response.data)
    } catch (error) {
      console.error('Failed to fetch chef:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!confirm('Are you sure you want to verify this chef?')) return
    try {
      await api.put(`/admin/chefs/${id}/verify`)
      fetchChef()
      alert('Chef verified successfully')
    } catch (error) {
      alert('Failed to verify chef')
    }
  }

  const handleReject = async () => {
    const notes = prompt('Enter rejection reason (optional):')
    if (notes === null) return
    try {
      await api.put(`/admin/chefs/${id}/reject`, { notes })
      fetchChef()
      alert('Chef application rejected')
    } catch (error) {
      alert('Failed to reject chef')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!chef) {
    return <div>Chef not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/chefs')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {chef.chef_name || `${chef.first_name} ${chef.last_name}`}
          </h1>
          <p className="text-gray-600 mt-1">Chef Details</p>
        </div>
      </div>

      {/* Actions */}
      {chef.verification_status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-yellow-800">This chef is pending verification</p>
          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Verify
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <XCircle className="h-5 w-5" />
              Reject
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Chef Name</label>
                <p className="text-gray-900">{chef.chef_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900">{chef.first_name} {chef.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {chef.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {chef.phone}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Bio</label>
                <p className="text-gray-900">{chef.bio || 'No bio provided'}</p>
              </div>
            </div>
          </div>

          {/* Cuisines */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cuisines</h2>
            <div className="flex flex-wrap gap-2">
              {chef.cuisines?.map((cuisine, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full font-medium"
                >
                  {cuisine}
                </span>
              ))}
            </div>
            {chef.cuisine_description && (
              <p className="mt-4 text-gray-700">{chef.cuisine_description}</p>
            )}
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Address</h2>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-900">{chef.street_address}</p>
                <p className="text-gray-600">
                  {chef.city}, {chef.state} {chef.postal_code}
                </p>
                <p className="text-gray-600">{chef.country}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Verification</label>
                <p className="text-gray-900 capitalize">{chef.verification_status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Active</label>
                <p className="text-gray-900">{chef.is_active ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Available</label>
                <p className="text-gray-900">{chef.is_available ? 'Yes' : 'No'}</p>
              </div>
              {chef.verified_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Verified At</label>
                  <p className="text-gray-900">
                    {new Date(chef.verified_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ratings */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Ratings
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {chef.average_rating?.toFixed(1) || 'N/A'}
                </p>
                <p className="text-sm text-gray-500">
                  {chef.total_reviews} {chef.total_reviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          </div>

          {/* Service Details */}
          {chef.service_radius_km && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Service Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Service Radius:</span> {chef.service_radius_km}km</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChefDetail

