import { useEffect, useState } from 'react'
import api from '../services/api'
import { Save, MapPin, Bell, CreditCard } from 'lucide-react'

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    delivery_radius_km: 10.0,
    preferred_delivery_zones: [],
    bank_account_name: '',
    bank_account_number: '',
    bank_routing_number: '',
    bank_name: '',
  })
  const [newZone, setNewZone] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/driver/me')
      const data = response.data
      setProfile(data)
      
      // Initialize form data with profile data
      setFormData({
        delivery_radius_km: data.delivery_radius_km || 10.0,
        preferred_delivery_zones: data.preferred_delivery_zones || [],
        bank_account_name: data.bank_account_name || '',
        bank_account_number: data.bank_account_number || '',
        bank_routing_number: data.bank_routing_number || '',
        bank_name: data.bank_name || '',
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      alert('Failed to load settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddZone = () => {
    if (newZone.trim() && !formData.preferred_delivery_zones.includes(newZone.trim())) {
      setFormData(prev => ({
        ...prev,
        preferred_delivery_zones: [...prev.preferred_delivery_zones, newZone.trim()]
      }))
      setNewZone('')
    }
  }

  const handleRemoveZone = (zone) => {
    setFormData(prev => ({
      ...prev,
      preferred_delivery_zones: prev.preferred_delivery_zones.filter(z => z !== zone)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const updateData = {
        delivery_radius_km: formData.delivery_radius_km ? parseFloat(formData.delivery_radius_km) : null,
        preferred_delivery_zones: formData.preferred_delivery_zones.length > 0 ? formData.preferred_delivery_zones : null,
        bank_account_name: formData.bank_account_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_routing_number: formData.bank_routing_number || null,
        bank_name: formData.bank_name || null,
      }
      
      await api.put('/driver/me', updateData)
      alert('Settings updated successfully!')
      fetchProfile() // Refresh data
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert(error.response?.data?.detail || 'Failed to update settings. Please try again.')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Delivery Settings */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Delivery Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                step="0.1"
                name="delivery_radius_km"
                value={formData.delivery_radius_km}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum distance you're willing to travel for deliveries</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Delivery Zones
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddZone())}
                placeholder="Enter city or area name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddZone}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            {formData.preferred_delivery_zones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.preferred_delivery_zones.map((zone, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {zone}
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(zone)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Bank Account Information</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Add your bank account details to receive payouts</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                name="bank_account_name"
                value={formData.bank_account_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number
              </label>
              <input
                type="text"
                name="bank_routing_number"
                value={formData.bank_routing_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings




