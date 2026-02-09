import { useEffect, useState } from 'react'
import api from '../services/api'
import { Save, CreditCard, Globe } from 'lucide-react'

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    service_radius_km: 10.0,
    minimum_order_amount: 0.00,
    service_fee: 0.00,
    estimated_prep_time_minutes: 60,
    accepts_online_payment: true,
    accepts_cash_on_delivery: true,
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/chef/profile')
      const data = response.data
      setProfile(data)
      
      // Initialize form data with profile data
      setFormData({
        service_radius_km: data.service_radius_km || 10.0,
        minimum_order_amount: data.minimum_order_amount || 0.00,
        service_fee: data.service_fee || 0.00,
        estimated_prep_time_minutes: data.estimated_prep_time_minutes || 60,
        accepts_online_payment: data.accepts_online_payment !== undefined ? data.accepts_online_payment : true,
        accepts_cash_on_delivery: data.accepts_cash_on_delivery !== undefined ? data.accepts_cash_on_delivery : true,
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      alert('Failed to load settings. Please try again.')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const updateData = {
        ...formData,
        service_radius_km: formData.service_radius_km ? parseFloat(formData.service_radius_km) : null,
        minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : null,
        service_fee: formData.service_fee ? parseFloat(formData.service_fee) : null,
        estimated_prep_time_minutes: formData.estimated_prep_time_minutes ? parseInt(formData.estimated_prep_time_minutes) : null,
      }
      
      await api.put('/chef/profile', updateData)
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
        {/* Service Settings */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Service Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Radius (km)
              </label>
              <input
                type="number"
                step="0.1"
                name="service_radius_km"
                value={formData.service_radius_km}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">How far you're willing to travel</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="minimum_order_amount"
                value={formData.minimum_order_amount}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Fee ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="service_fee"
                value={formData.service_fee}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Prep Time (minutes)
              </label>
              <input
                type="number"
                name="estimated_prep_time_minutes"
                value={formData.estimated_prep_time_minutes}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Accept Online Payment</span>
                <p className="text-xs text-gray-500">Allow customers to pay online</p>
              </div>
              <input
                type="checkbox"
                name="accepts_online_payment"
                checked={formData.accepts_online_payment}
                onChange={handleChange}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Accept Cash on Delivery</span>
                <p className="text-xs text-gray-500">Allow customers to pay with cash on delivery</p>
              </div>
              <input
                type="checkbox"
                name="accepts_cash_on_delivery"
                checked={formData.accepts_cash_on_delivery}
                onChange={handleChange}
                className="rounded"
              />
            </label>
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

