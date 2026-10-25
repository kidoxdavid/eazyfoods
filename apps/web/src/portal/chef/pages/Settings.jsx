import { useEffect, useState } from 'react'
import api from '../services/api'
import { Save, Globe, Clock, CalendarX, CalendarClock } from 'lucide-react'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    minimum_order_amount: 0.00,
    offers_pickup: false,
    offers_delivery: false,
    preorders_enabled: false,
    preorder_lead_minutes: 120,
    preorder_max_days: 7,
    slot_minutes: 60,
    slot_capacity: 5,
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
        minimum_order_amount: data.minimum_order_amount || 0.00,
        offers_pickup: !!data.offers_pickup,
        offers_delivery: !!data.offers_delivery,
        preorders_enabled: !!data.preorders_enabled,
        preorder_lead_minutes: data.preorder_lead_minutes || 120,
        preorder_max_days: data.preorder_max_days || 7,
        slot_minutes: data.slot_minutes || 60,
        slot_capacity: data.slot_capacity || 5,
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
        minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : null,
        preorder_lead_minutes: parseInt(formData.preorder_lead_minutes) || 120,
        preorder_max_days: parseInt(formData.preorder_max_days) || 7,
        slot_minutes: parseInt(formData.slot_minutes) || 60,
        slot_capacity: parseInt(formData.slot_capacity) || 5,
        offers_pickup: !!formData.offers_pickup,
        offers_delivery: !!formData.offers_delivery,
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
        {/* Order Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <Globe className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Order Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            

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

            <label className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-gray-700">Offer pickup</span>
              <input type="checkbox" name="offers_pickup" checked={formData.offers_pickup} onChange={handleChange} className="rounded" />
            </label>
            <label className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-gray-700">Offer delivery</span>
              <input type="checkbox" name="offers_delivery" checked={formData.offers_delivery} onChange={handleChange} className="rounded" />
            </label>

            

            
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

        {/* Pre-orders: customers book a pickup or delivery time slot */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <CalendarClock className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Pre-orders</h2>
          </div>
          <label className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Let customers book a time slot</span>
              <p className="text-xs text-gray-500">Customers can order ahead for a day and time you choose.</p>
            </div>
            <button type="button" role="switch" aria-checked={!!formData.preorders_enabled} aria-label="Let customers book a time slot"
              onClick={() => setFormData((prev) => ({ ...prev, preorders_enabled: !prev.preorders_enabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.preorders_enabled ? 'bg-green-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${formData.preorders_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
          {formData.preorders_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="preorder_lead_minutes" className="block text-sm font-medium text-gray-700 mb-1">Notice needed (minutes)</label>
                <input id="preorder_lead_minutes" type="number" min="30" max="2880" name="preorder_lead_minutes" value={formData.preorder_lead_minutes} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label htmlFor="preorder_max_days" className="block text-sm font-medium text-gray-700 mb-1">How many days ahead</label>
                <input id="preorder_max_days" type="number" min="1" max="14" name="preorder_max_days" value={formData.preorder_max_days} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label htmlFor="slot_minutes" className="block text-sm font-medium text-gray-700 mb-1">Slot length</label>
                <select id="slot_minutes" name="slot_minutes" value={formData.slot_minutes} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                  {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="slot_capacity" className="block text-sm font-medium text-gray-700 mb-1">Orders per slot</label>
                <input id="slot_capacity" type="number" min="1" max="50" name="slot_capacity" value={formData.slot_capacity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          )}
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

