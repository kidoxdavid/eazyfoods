import { useEffect, useState } from 'react'
import api from '../services/api'
import { Settings as SettingsIcon, Save, Mail, Bell, Globe, Shield, Zap } from 'lucide-react'

const Settings = () => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    email_settings: {
      from_name: 'eazyfoods',
      from_email: 'noreply@eazyfoods.com',
      reply_to: 'support@eazyfoods.com'
    },
    notification_settings: {
      sms_enabled: true,
      push_enabled: true,
      email_notifications: true
    },
    general_settings: {
      timezone: 'America/Toronto',
      date_format: 'MM/DD/YYYY',
      currency: 'USD'
    },
    approval_settings: {
      auto_approve_vendor_ads: false,
      require_approval_for_campaigns: true,
      require_approval_for_budgets: true
    }
  })

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/admin/settings')
      if (response.data) {
        setSettings(prev => ({
          ...prev,
          approval_settings: {
            auto_approve_vendor_ads: response.data.auto_approve_vendor_ads || false,
            require_approval_for_campaigns: response.data.require_approval_for_campaigns !== undefined ? response.data.require_approval_for_campaigns : true,
            require_approval_for_budgets: response.data.require_approval_for_budgets !== undefined ? response.data.require_approval_for_budgets : true
          }
        }))
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to API
      await api.put('/admin/marketing/admin/settings', {
        auto_approve_vendor_ads: settings.approval_settings.auto_approve_vendor_ads,
        auto_approve_chef_ads: settings.approval_settings.auto_approve_chef_ads || false,
        require_approval_for_campaigns: settings.approval_settings.require_approval_for_campaigns,
        require_approval_for_budgets: settings.approval_settings.require_approval_for_budgets,
        max_budget_per_campaign: 100000.0,
        max_daily_notifications: 10000,
        max_daily_emails: 10000,
        max_daily_sms: 5000
      })
      
      // Reload settings from backend
      await fetchSettings()
      
      alert('Settings saved successfully!')
    } catch (error) {
      alert('Failed to save settings: ' + (error.response?.data?.detail || error.message))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your marketing portal settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Email Settings */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Email Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input
              type="text"
              value={settings.email_settings.from_name}
              onChange={(e) => setSettings({
                ...settings,
                email_settings: { ...settings.email_settings, from_name: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input
              type="email"
              value={settings.email_settings.from_email}
              onChange={(e) => setSettings({
                ...settings,
                email_settings: { ...settings.email_settings, from_email: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
            <input
              type="email"
              value={settings.email_settings.reply_to}
              onChange={(e) => setSettings({
                ...settings,
                email_settings: { ...settings.email_settings, reply_to: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notification_settings.sms_enabled}
              onChange={(e) => setSettings({
                ...settings,
                notification_settings: { ...settings.notification_settings, sms_enabled: e.target.checked }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable SMS Notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notification_settings.push_enabled}
              onChange={(e) => setSettings({
                ...settings,
                notification_settings: { ...settings.notification_settings, push_enabled: e.target.checked }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Push Notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notification_settings.email_notifications}
              onChange={(e) => setSettings({
                ...settings,
                notification_settings: { ...settings.notification_settings, email_notifications: e.target.checked }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
          </label>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={settings.general_settings.timezone}
              onChange={(e) => setSettings({
                ...settings,
                general_settings: { ...settings.general_settings, timezone: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="America/Toronto">America/Toronto (EST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
            <select
              value={settings.general_settings.date_format}
              onChange={(e) => setSettings({
                ...settings,
                general_settings: { ...settings.general_settings, date_format: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={settings.general_settings.currency}
              onChange={(e) => setSettings({
                ...settings,
                general_settings: { ...settings.general_settings, currency: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="USD">USD ($)</option>
              <option value="CAD">CAD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approval Settings */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Approval Settings</h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.approval_settings.auto_approve_vendor_ads}
              onChange={(e) => setSettings({
                ...settings,
                approval_settings: { ...settings.approval_settings, auto_approve_vendor_ads: e.target.checked }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-approve vendor ads</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.approval_settings.require_approval_for_campaigns}
              onChange={(e) => setSettings({
                ...settings,
                approval_settings: { ...settings.approval_settings, require_approval_for_campaigns: e.target.checked }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require approval for campaigns</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.approval_settings.require_approval_for_budgets}
              onChange={(e) => setSettings({
                ...settings,
                approval_settings: { ...settings.approval_settings, require_approval_for_budgets: e.target.checked }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require approval for budgets</span>
          </label>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Advanced Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Campaign Budget ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="5000.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily Email Sends</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="10000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily SMS Sends</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="5000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Rate Limit (per hour)</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="1000"
            />
          </div>
        </div>
      </div>

      {/* Integration Settings */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Integration Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMS Provider API Key</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Enter SMS provider API key"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Push Notification Service Key</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Enter push notification service key"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Analytics Tracking ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="UA-XXXXXXXXX-X or G-XXXXXXXXXX"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

