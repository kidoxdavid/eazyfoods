import { useState, useEffect } from 'react'
import api from '../services/api'
import { Settings as SettingsIcon, Save, AlertCircle, DollarSign, ShoppingBag, Mail, Bell, Shield, Globe, CreditCard, Users, Package, Edit, Download, Database, RefreshCw } from 'lucide-react'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [apiBaseURL, setApiBaseURL] = useState(() => {
    try {
      return api.getBaseURL ? api.getBaseURL() : (api.defaults.baseURL || '/api/v1')
    } catch (e) {
      return '/api/v1'
    }
  })
  
  // Load settings from localStorage
  const loadSettings = (key, defaults) => {
    try {
      const saved = localStorage.getItem(`admin_settings_${key}`)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error(`Failed to load ${key} settings:`, e)
    }
    return defaults
  }

  // Save settings to localStorage
  const saveSettings = (key, settings) => {
    try {
      localStorage.setItem(`admin_settings_${key}`, JSON.stringify(settings))
    } catch (e) {
      console.error(`Failed to save ${key} settings:`, e)
    }
  }

  const [generalSettings, setGeneralSettings] = useState(() => loadSettings('general', {
    platform_name: 'eazyfoods',
    platform_email: 'support@eazyfoods.com',
    platform_phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
    currency: 'USD',
    language: 'en',
    maintenance_mode: false
  }))
  const [loadingSettings, setLoadingSettings] = useState(true)

  const [commissionSettings, setCommissionSettings] = useState(() => loadSettings('commission', {
    default_commission_rate: 15,
    min_commission_rate: 5,
    max_commission_rate: 30,
    commission_calculation: 'percentage' // percentage or fixed
  }))
  const [vendors, setVendors] = useState([])
  const [vendorCommissions, setVendorCommissions] = useState({})
  const [loadingVendors, setLoadingVendors] = useState(false)

  const [orderSettings, setOrderSettings] = useState(() => loadSettings('orders', {
    min_order_amount: 10,
    max_order_amount: 1000,
    delivery_fee: 5.99,
    free_delivery_threshold: 50,
    order_timeout_minutes: 30,
    auto_cancel_unpaid_hours: 24,
    allow_order_modifications: true
  }))

  const [paymentSettings, setPaymentSettings] = useState(() => loadSettings('payment', {
    payment_methods: ['credit_card', 'debit_card', 'paypal'],
    stripe_enabled: true,
    paypal_enabled: true,
    require_payment_verification: true,
    refund_policy_days: 30,
    payments_suspended: false
  }))

  const [notificationSettings, setNotificationSettings] = useState(() => loadSettings('notifications', {
    email_notifications: true,
    sms_notifications: false,
    order_notifications: true,
    vendor_notifications: true,
    customer_notifications: true,
    admin_notifications: true
  }))

  const [securitySettings, setSecuritySettings] = useState(() => loadSettings('security', {
    require_email_verification: true,
    require_phone_verification: false,
    password_min_length: 8,
    session_timeout_minutes: 60,
    two_factor_auth: false,
    ip_whitelist: ''
  }))

  const [vendorSettings, setVendorSettings] = useState(() => loadSettings('vendor', {
    auto_approve_vendors: false,
    require_verification: true,
    min_products_to_go_live: 5,
    allow_promotions: true,
    promotion_approval_required: true
  }))

  const [customerSettings, setCustomerSettings] = useState(() => loadSettings('customer', {
    allow_guest_checkout: true,
    require_account_for_orders: false,
    loyalty_points_enabled: false,
    points_per_dollar: 1,
    referral_bonus: 10
  }))

  // Load settings from backend on mount - defined after all state setters
  const loadSettingsFromBackend = async () => {
    setLoadingSettings(true)
    try {
      const response = await api.get('/admin/settings')
      const allSettings = response.data || {}
      
      // Update state with backend settings if available
      if (allSettings.general?.settings) {
        setGeneralSettings(allSettings.general.settings)
        saveSettings('general', allSettings.general.settings)
      }
      if (allSettings.commission?.settings) {
        setCommissionSettings(allSettings.commission.settings)
        saveSettings('commission', allSettings.commission.settings)
      }
      if (allSettings.orders?.settings) {
        setOrderSettings(allSettings.orders.settings)
        saveSettings('orders', allSettings.orders.settings)
      }
      if (allSettings.payment?.settings) {
        setPaymentSettings(allSettings.payment.settings)
        saveSettings('payment', allSettings.payment.settings)
      }
      if (allSettings.notifications?.settings) {
        setNotificationSettings(allSettings.notifications.settings)
        saveSettings('notifications', allSettings.notifications.settings)
      }
      if (allSettings.security?.settings) {
        setSecuritySettings(allSettings.security.settings)
        saveSettings('security', allSettings.security.settings)
      }
      if (allSettings.vendor?.settings) {
        setVendorSettings(allSettings.vendor.settings)
        saveSettings('vendor', allSettings.vendor.settings)
      }
      if (allSettings.customer?.settings) {
        setCustomerSettings(allSettings.customer.settings)
        saveSettings('customer', allSettings.customer.settings)
      }
    } catch (error) {
      console.error('Failed to load settings from backend:', error)
      // Continue with localStorage settings if backend fails
    } finally {
      setLoadingSettings(false)
    }
  }

  useEffect(() => {
    loadSettingsFromBackend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'commission') {
      fetchVendors()
    }
  }, [activeTab])

  const fetchVendors = async () => {
    setLoadingVendors(true)
    try {
      const response = await api.get('/admin/vendors', { params: { limit: 1000 } })
      setVendors(response.data)
      // Initialize vendor commissions object
      const commissions = {}
      response.data.forEach(vendor => {
        commissions[vendor.id] = vendor.commission_rate || commissionSettings.default_commission_rate
      })
      setVendorCommissions(commissions)
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    } finally {
      setLoadingVendors(false)
    }
  }

  const handleUpdateVendorCommission = async (vendorId) => {
    const newRate = vendorCommissions[vendorId]
    if (!newRate || newRate < commissionSettings.min_commission_rate || newRate > commissionSettings.max_commission_rate) {
      alert(`Commission rate must be between ${commissionSettings.min_commission_rate}% and ${commissionSettings.max_commission_rate}%`)
      return
    }

    try {
      await api.put(`/admin/vendors/${vendorId}/commission`, {
        commission_rate: parseFloat(newRate)
      })
      alert('Vendor commission rate updated successfully')
    } catch (error) {
      alert('Failed to update vendor commission rate')
    }
  }

  const handleSave = async (settingsType) => {
    setSaving(true)
    try {
      // Get current settings for the type
      let settingsToSave = {}
      switch (settingsType) {
        case 'general':
          settingsToSave = generalSettings
          break
        case 'commission':
          settingsToSave = commissionSettings
          break
        case 'orders':
          settingsToSave = orderSettings
          break
        case 'payment':
          settingsToSave = paymentSettings
          break
        case 'notifications':
          settingsToSave = notificationSettings
          break
        case 'security':
          settingsToSave = securitySettings
          break
        case 'vendor':
          settingsToSave = vendorSettings
          break
        case 'customer':
          settingsToSave = customerSettings
          break
      }
      
      // Save to backend API
      const response = await api.put(`/admin/settings/${settingsType}`, {
        settings: settingsToSave
      })
      
      // Verify the save was successful
      if (response.status === 200 || response.status === 204) {
        // Also save to localStorage as backup
        saveSettings(settingsType, settingsToSave)
        
        // Reload only the specific setting type from backend to ensure UI is in sync
        // This avoids race conditions and ensures we get the latest saved data
        try {
          const getResponse = await api.get(`/admin/settings/${settingsType}`)
          if (getResponse.data?.settings) {
            // Update only the specific setting type state
            switch (settingsType) {
              case 'general':
                setGeneralSettings(getResponse.data.settings)
                break
              case 'commission':
                setCommissionSettings(getResponse.data.settings)
                break
              case 'orders':
                setOrderSettings(getResponse.data.settings)
                break
              case 'payment':
                setPaymentSettings(getResponse.data.settings)
                break
              case 'notifications':
                setNotificationSettings(getResponse.data.settings)
                break
              case 'security':
                setSecuritySettings(getResponse.data.settings)
                break
              case 'vendor':
                setVendorSettings(getResponse.data.settings)
                break
              case 'customer':
                setCustomerSettings(getResponse.data.settings)
                break
            }
            // Also update localStorage
            saveSettings(settingsType, getResponse.data.settings)
          }
        } catch (reloadError) {
          console.error('Failed to reload settings after save:', reloadError)
          // Settings were saved, so we'll keep the current state
        }
        
        alert(`${settingsType.charAt(0).toUpperCase() + settingsType.slice(1)} settings saved successfully!`)
      } else {
        throw new Error('Unexpected response status: ' + response.status)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings: ' + (error.response?.data?.detail || error.message || 'Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const [exporting, setExporting] = useState(false)

  const handleMasterExport = async () => {
    if (!confirm('This will export ALL data from the database to a CSV file. This may take a moment. Continue?')) {
      return
    }

    setExporting(true)
    try {
      const response = await api.get('/admin/export/master-export', {
        responseType: 'blob' // Important for file downloads
      })
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      link.setAttribute('download', `easyfoods_master_export_${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      alert('Master export completed successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'commission', label: 'Commission', icon: DollarSign },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'vendor', label: 'Vendor', icon: Users },
    { id: 'customer', label: 'Customer', icon: Package }
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
        <input
          type="text"
          value={generalSettings.platform_name}
          onChange={(e) => setGeneralSettings({ ...generalSettings, platform_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform Email</label>
          <input
            type="email"
            value={generalSettings.platform_email}
            onChange={(e) => setGeneralSettings({ ...generalSettings, platform_email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform Phone</label>
          <input
            type="tel"
            value={generalSettings.platform_phone}
            onChange={(e) => setGeneralSettings({ ...generalSettings, platform_phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={generalSettings.timezone}
            onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={generalSettings.currency}
            onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="USD">USD ($)</option>
            <option value="CAD">CAD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={generalSettings.language}
            onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={generalSettings.maintenance_mode}
          onChange={(e) => setGeneralSettings({ ...generalSettings, maintenance_mode: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Enable Maintenance Mode</label>
      </div>

      {/* API Configuration Debug Section */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          API Configuration
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Current API Base URL:</strong> {apiBaseURL}
          </p>
          <p className="text-xs text-yellow-700">
            If data is not loading, check the browser console for API errors. 
            You can reset the API URL to use the default proxy by clicking "Reset to Default" below.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (api.updateBaseURL) {
                api.updateBaseURL(null)
              } else {
                localStorage.removeItem('API_BASE_URL')
              }
              alert('API URL reset to default. Please refresh the page.')
              window.location.reload()
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Reset to Default
          </button>
          <button
            onClick={() => {
              const newURL = prompt('Enter new API Base URL (leave empty for default):', apiBaseURL)
              if (newURL !== null) {
                if (api.updateBaseURL) {
                  api.updateBaseURL(newURL || null)
                } else {
                  if (newURL) {
                    localStorage.setItem('API_BASE_URL', newURL)
                  } else {
                    localStorage.removeItem('API_BASE_URL')
                  }
                }
                alert('API URL updated. Please refresh the page.')
                window.location.reload()
              }
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Edit className="h-4 w-4" />
            Change API URL
          </button>
        </div>
      </div>
    </div>
  )

  const renderCommissionSettings = () => (
    <div className="space-y-6">
      {/* Default Commission Settings */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Commission Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Commission Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={commissionSettings.default_commission_rate}
              onChange={(e) => setCommissionSettings({ ...commissionSettings, default_commission_rate: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">This rate will be applied to new vendors by default</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={commissionSettings.min_commission_rate}
                onChange={(e) => setCommissionSettings({ ...commissionSettings, min_commission_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={commissionSettings.max_commission_rate}
                onChange={(e) => setCommissionSettings({ ...commissionSettings, max_commission_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Commission Calculation Method</label>
            <select
              value={commissionSettings.commission_calculation}
              onChange={(e) => setCommissionSettings({ ...commissionSettings, commission_calculation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendor-Specific Commission Rates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Vendor-Specific Commission Rates</h3>
            <p className="text-sm text-gray-500 mt-1">
              Set custom commission rates for individual vendors. Leave empty to use default rate ({commissionSettings.default_commission_rate}%).
            </p>
          </div>
          <button
            onClick={fetchVendors}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        
        {loadingVendors ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Custom Rates Set</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendors.filter(v => v.commission_rate).length}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Using Default</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendors.filter(v => !v.commission_rate).length}
                </p>
              </div>
            </div>

            {/* Vendor Commission Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.business_name}</p>
                          <p className="text-sm text-gray-500">{vendor.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vendor.commission_rate ? (
                          <span className="px-2 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">
                            {vendor.commission_rate}%
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-sm font-medium bg-gray-100 text-gray-600 rounded">
                            Default ({commissionSettings.default_commission_rate}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min={commissionSettings.min_commission_rate}
                            max={commissionSettings.max_commission_rate}
                            value={vendorCommissions[vendor.id] !== undefined ? vendorCommissions[vendor.id] : (vendor.commission_rate || '')}
                            onChange={(e) => setVendorCommissions({
                              ...vendorCommissions,
                              [vendor.id]: e.target.value ? parseFloat(e.target.value) : ''
                            })}
                            placeholder={commissionSettings.default_commission_rate.toString()}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleUpdateVendorCommission(vendor.id)}
                          disabled={vendorCommissions[vendor.id] === undefined || vendorCommissions[vendor.id] === (vendor.commission_rate || commissionSettings.default_commission_rate)}
                          className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                          title="Update Commission"
                        >
                          <Edit className="h-3 w-3" />
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderOrderSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={orderSettings.min_order_amount}
            onChange={(e) => setOrderSettings({ ...orderSettings, min_order_amount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Order Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={orderSettings.max_order_amount}
            onChange={(e) => setOrderSettings({ ...orderSettings, max_order_amount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Fee ($)</label>
          <input
            type="number"
            step="0.01"
            value={orderSettings.delivery_fee}
            onChange={(e) => setOrderSettings({ ...orderSettings, delivery_fee: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Free Delivery Threshold ($)</label>
          <input
            type="number"
            step="0.01"
            value={orderSettings.free_delivery_threshold}
            onChange={(e) => setOrderSettings({ ...orderSettings, free_delivery_threshold: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Order Timeout (minutes)</label>
          <input
            type="number"
            value={orderSettings.order_timeout_minutes}
            onChange={(e) => setOrderSettings({ ...orderSettings, order_timeout_minutes: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Auto Cancel Unpaid (hours)</label>
          <input
            type="number"
            value={orderSettings.auto_cancel_unpaid_hours}
            onChange={(e) => setOrderSettings({ ...orderSettings, auto_cancel_unpaid_hours: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={orderSettings.allow_order_modifications}
          onChange={(e) => setOrderSettings({ ...orderSettings, allow_order_modifications: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Allow Order Modifications</label>
      </div>
    </div>
  )

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Methods</label>
        <div className="space-y-2">
          {['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'].map((method) => (
            <label key={method} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paymentSettings.payment_methods.includes(method)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPaymentSettings({
                      ...paymentSettings,
                      payment_methods: [...paymentSettings.payment_methods, method]
                    })
                  } else {
                    setPaymentSettings({
                      ...paymentSettings,
                      payment_methods: paymentSettings.payment_methods.filter(m => m !== method)
                    })
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 capitalize">{method.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/50 mb-4">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <span className="text-sm font-semibold text-gray-900">Suspend payments (customer side)</span>
            <p className="text-xs text-gray-600 mt-0.5">When on, customers cannot pay online; they can only place orders and pay on delivery or later.</p>
          </div>
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={!!paymentSettings.payments_suspended}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, payments_suspended: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </div>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paymentSettings.stripe_enabled}
            onChange={(e) => setPaymentSettings({ ...paymentSettings, stripe_enabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label className="text-sm text-gray-700">Stripe Enabled</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paymentSettings.paypal_enabled}
            onChange={(e) => setPaymentSettings({ ...paymentSettings, paypal_enabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label className="text-sm text-gray-700">PayPal Enabled</label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={paymentSettings.require_payment_verification}
          onChange={(e) => setPaymentSettings({ ...paymentSettings, require_payment_verification: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Require Payment Verification</label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Refund Policy (days)</label>
        <input
          type="number"
          value={paymentSettings.refund_policy_days}
          onChange={(e) => setPaymentSettings({ ...paymentSettings, refund_policy_days: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={notificationSettings.email_notifications}
          onChange={(e) => setNotificationSettings({ ...notificationSettings, email_notifications: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Enable Email Notifications</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={notificationSettings.sms_notifications}
          onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_notifications: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Enable SMS Notifications</label>
      </div>
      <div className="border-t pt-4 space-y-3">
        <h3 className="font-medium text-gray-900">Notification Types</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notificationSettings.order_notifications}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, order_notifications: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Order Notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notificationSettings.vendor_notifications}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, vendor_notifications: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Vendor Notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notificationSettings.customer_notifications}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, customer_notifications: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Customer Notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notificationSettings.admin_notifications}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, admin_notifications: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Admin Notifications</span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={securitySettings.require_email_verification}
          onChange={(e) => setSecuritySettings({ ...securitySettings, require_email_verification: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Require Email Verification</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={securitySettings.require_phone_verification}
          onChange={(e) => setSecuritySettings({ ...securitySettings, require_phone_verification: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Require Phone Verification</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password Min Length</label>
          <input
            type="number"
            value={securitySettings.password_min_length}
            onChange={(e) => setSecuritySettings({ ...securitySettings, password_min_length: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            value={securitySettings.session_timeout_minutes}
            onChange={(e) => setSecuritySettings({ ...securitySettings, session_timeout_minutes: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={securitySettings.two_factor_auth}
          onChange={(e) => setSecuritySettings({ ...securitySettings, two_factor_auth: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Enable Two-Factor Authentication</label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">IP Whitelist (comma-separated)</label>
        <textarea
          value={securitySettings.ip_whitelist}
          onChange={(e) => setSecuritySettings({ ...securitySettings, ip_whitelist: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          rows={3}
          placeholder="192.168.1.1, 10.0.0.1"
        />
      </div>
    </div>
  )

  const renderVendorSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={vendorSettings.auto_approve_vendors}
          onChange={(e) => setVendorSettings({ ...vendorSettings, auto_approve_vendors: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Auto Approve New Vendors</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={vendorSettings.require_verification}
          onChange={(e) => setVendorSettings({ ...vendorSettings, require_verification: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Require Vendor Verification</label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Products to Go Live</label>
        <input
          type="number"
          value={vendorSettings.min_products_to_go_live}
          onChange={(e) => setVendorSettings({ ...vendorSettings, min_products_to_go_live: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={vendorSettings.allow_promotions}
          onChange={(e) => setVendorSettings({ ...vendorSettings, allow_promotions: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Allow Vendor Promotions</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={vendorSettings.promotion_approval_required}
          onChange={(e) => setVendorSettings({ ...vendorSettings, promotion_approval_required: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Require Promotion Approval</label>
      </div>
    </div>
  )

  const renderCustomerSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={customerSettings.allow_guest_checkout}
          onChange={(e) => setCustomerSettings({ ...customerSettings, allow_guest_checkout: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Allow Guest Checkout</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={customerSettings.require_account_for_orders}
          onChange={(e) => setCustomerSettings({ ...customerSettings, require_account_for_orders: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Require Account for Orders</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={customerSettings.loyalty_points_enabled}
          onChange={(e) => setCustomerSettings({ ...customerSettings, loyalty_points_enabled: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label className="text-sm text-gray-700">Enable Loyalty Points</label>
      </div>
      {customerSettings.loyalty_points_enabled && (
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Points per Dollar</label>
            <input
              type="number"
              value={customerSettings.points_per_dollar}
              onChange={(e) => setCustomerSettings({ ...customerSettings, points_per_dollar: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Referral Bonus (points)</label>
            <input
              type="number"
              value={customerSettings.referral_bonus}
              onChange={(e) => setCustomerSettings({ ...customerSettings, referral_bonus: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  )

  const getCurrentSettings = () => {
    switch (activeTab) {
      case 'general': return generalSettings
      case 'commission': return commissionSettings
      case 'orders': return orderSettings
      case 'payment': return paymentSettings
      case 'notifications': return notificationSettings
      case 'security': return securitySettings
      case 'vendor': return vendorSettings
      case 'customer': return customerSettings
      default: return {}
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage platform settings and configuration</p>
      </div>

      {/* Master Data Export Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow border border-blue-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Master Data Export</h3>
              <p className="text-sm text-gray-600 mb-2">
                Export all database data to a single CSV file. This includes vendors, customers, products, orders, reviews, 
                support tickets, promotions, payouts, inventory, and all other data tables.
              </p>
              <p className="text-xs text-gray-500">
                <strong>Note:</strong> All data is stored in the database. This export creates a complete backup of all tables.
              </p>
            </div>
          </div>
          <button
            onClick={handleMasterExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Download className="h-5 w-5" />
            {exporting ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {tabs.find(t => t.id === activeTab)?.label} Settings
            </h2>
            
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'commission' && renderCommissionSettings()}
            {activeTab === 'orders' && renderOrderSettings()}
            {activeTab === 'payment' && renderPaymentSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'vendor' && renderVendorSettings()}
            {activeTab === 'customer' && renderCustomerSettings()}

            <div className="mt-8 pt-6 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Settings are saved to your browser's local storage and will persist across sessions.
              </p>
              <button
                onClick={() => handleSave(activeTab)}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
