import { useEffect, useState } from 'react'
import api from '../services/api'
import { Save, CreditCard, Globe, Clock, CalendarX } from 'lucide-react'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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
    operating_hours: null,
    blocked_dates: [],
  })
  const [newBlockedDate, setNewBlockedDate] = useState('')

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
        operating_hours: data.operating_hours || null,
        blocked_dates: Array.isArray(data.blocked_dates) ? [...data.blocked_dates] : [],
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
        operating_hours: formData.operating_hours || null,
        blocked_dates: formData.blocked_dates || [],
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Service Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
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

        {/* Operating hours & blocked dates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <Clock className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Schedule</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Set weekly hours (e.g. 09:00-17:00). Leave empty for no restriction. Add dates when you&apos;re not available.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <label className="capitalize w-10 text-sm text-gray-700">{day}</label>
                <input
                  type="text"
                  placeholder="09:00-17:00"
                  value={(formData.operating_hours && formData.operating_hours[day] && formData.operating_hours[day][0]) || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim()
                    setFormData(prev => ({
                      ...prev,
                      operating_hours: {
                        ...(prev.operating_hours || {}),
                        [day]: val ? [val] : [],
                      },
                    }))
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <CalendarX className="h-5 w-5 text-primary-600" />
            <h3 className="text-base font-medium text-gray-900">Blocked dates</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {(formData.blocked_dates || []).map((d) => (
              <span key={d} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                {d}
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, blocked_dates: (prev.blocked_dates || []).filter(x => x !== d) }))} className="text-gray-500 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (newBlockedDate) {
                  setFormData(prev => ({ ...prev, blocked_dates: [...(prev.blocked_dates || []), newBlockedDate].sort() }))
                  setNewBlockedDate('')
                }
              }}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300"
            >
              Add date
            </button>
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

