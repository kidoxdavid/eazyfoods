import { useEffect, useState } from 'react'
import api from '../services/api'
import { Save, MapPin, Clock, Truck, Image as ImageIcon, Building2 } from 'lucide-react'

const Profile = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vendor, setVendor] = useState(null)
  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    description: '',
    store_profile_image_url: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Canada',
    latitude: '',
    longitude: '',
    delivery_radius_km: 5.0,
    pickup_available: true,
    delivery_available: true,
    region: '',
    operating_hours: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '21:00' },
      sunday: { open: '10:00', close: '20:00' }
    }
  })

  useEffect(() => {
    fetchVendor()
  }, [])

  const fetchVendor = async () => {
    try {
      const response = await api.get('/vendors/me')
      const data = response.data
      setVendor(data)
      
      // Initialize form data with vendor data
      setFormData({
        business_name: data.business_name || '',
        phone: data.phone || '',
        description: data.description || '',
        store_profile_image_url: data.store_profile_image_url || '',
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || 'Canada',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        delivery_radius_km: data.delivery_radius_km || 5.0,
        pickup_available: data.pickup_available !== undefined ? data.pickup_available : true,
        delivery_available: data.delivery_available !== undefined ? data.delivery_available : true,
        region: data.region || '',
        operating_hours: data.operating_hours || {
          monday: { open: '09:00', close: '21:00' },
          tuesday: { open: '09:00', close: '21:00' },
          wednesday: { open: '09:00', close: '21:00' },
          thursday: { open: '09:00', close: '21:00' },
          friday: { open: '09:00', close: '21:00' },
          saturday: { open: '09:00', close: '21:00' },
          sunday: { open: '10:00', close: '20:00' }
        }
      })
    } catch (error) {
      console.error('Failed to fetch vendor:', error)
      alert('Failed to load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleOperatingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value
        }
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Prepare update data
      const updateData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        delivery_radius_km: formData.delivery_radius_km ? parseFloat(formData.delivery_radius_km) : null
      }
      
      await api.put('/vendors/me', updateData)
      alert('Profile updated successfully!')
      fetchVendor() // Refresh data
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert(error.response?.data?.detail || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Store Profile</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your store information that customers see</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Store Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="input"
                placeholder="Describe your store..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Store Profile Image URL
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="url"
                  name="store_profile_image_url"
                  value={formData.store_profile_image_url}
                  onChange={handleChange}
                  className="input flex-1"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.store_profile_image_url && (
                  <img
                    src={formData.store_profile_image_url}
                    alt="Store preview"
                    className="h-16 w-16 object-cover rounded-lg border border-gray-300"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Store Address</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                name="street_address"
                value={formData.street_address}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Postal Code *
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                African Region *
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="">Select Region</option>
                <option value="West African">West African</option>
                <option value="East African">East African</option>
                <option value="North African">North African</option>
                <option value="Central African">Central African</option>
                <option value="South African">South African</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Latitude (for location services)
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                className="input"
                placeholder="e.g., 40.7128"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Longitude (for location services)
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                className="input"
                placeholder="e.g., -74.0060"
              />
            </div>
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Truck className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Delivery & Pickup Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                step="0.1"
                name="delivery_radius_km"
                value={formData.delivery_radius_km}
                onChange={handleChange}
                min="0"
                className="input"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="delivery_available"
                  checked={formData.delivery_available}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Delivery Available</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="pickup_available"
                  checked={formData.pickup_available}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Pickup Available</span>
              </label>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Operating Hours</h2>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            {days.map((day) => (
              <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-full sm:w-24">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={formData.operating_hours[day]?.open || '09:00'}
                    onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                    className="input flex-1 text-sm sm:text-base"
                  />
                  <span className="text-xs sm:text-sm text-gray-500">to</span>
                  <input
                    type="time"
                    value={formData.operating_hours[day]?.close || '21:00'}
                    onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                    className="input flex-1 text-sm sm:text-base"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 sm:py-3 text-sm sm:text-base"
          >
            <Save className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default Profile

