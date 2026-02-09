import { useEffect, useState } from 'react'
import api from '../services/api'
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Store, Download, Calendar, PieChart, Activity, ArrowUp, ArrowDown, Settings, Eye, EyeOff, X, Truck, Package } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

const Analytics = () => {
  const [overview, setOverview] = useState(null)
  const [revenueData, setRevenueData] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [salesReport, setSalesReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('overview')
  const [groupBy, setGroupBy] = useState('day')
  const [showSettings, setShowSettings] = useState(false)
  
  // Load settings from localStorage
  const loadSettings = () => {
    const saved = localStorage.getItem('analytics_settings')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load analytics settings:', e)
      }
    }
    // Default settings
    return {
      showRevenue: true,
      showOrders: true,
      showSignups: true,
      showUserMetrics: true,
      showTopVendors: true,
      showTopProducts: true,
      showStatusBreakdown: true,
      showCustomerAcquisition: true,
      showVendorPerformance: true,
      showAvgOrderValue: true,
      showDriverMetrics: true,
      showDeliveryMetrics: true,
      showMarketingMetrics: true,
      showGeographicData: true,
      showTimeOfDayAnalysis: true,
      chartType: 'area', // area, line, bar, pie, radar
      chartTheme: 'default', // default, dark, colorful, minimal
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      compactMode: false,
      defaultDateRange: 30,
      showGrid: true,
      showLegend: true,
      showTooltips: true,
      animationEnabled: true,
      exportFormat: 'png' // png, svg, pdf, csv
    }
  }

  const [settings, setSettings] = useState(loadSettings)
  
  const saveSettings = (newSettings) => {
    setSettings(newSettings)
    localStorage.setItem('analytics_settings', JSON.stringify(newSettings))
  }

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)
  }

  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - (settings.defaultDateRange || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })
  const [comparisonRanges, setComparisonRanges] = useState({
    period1_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period1_end: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period2_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period2_end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [viewMode, dateRange, groupBy])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (viewMode === 'overview') {
        const response = await api.get('/admin/analytics/overview', {
          params: {
            start_date: dateRange.start_date,
            end_date: dateRange.end_date
          }
        })
        setOverview(response.data)
      } else if (viewMode === 'trends') {
        const response = await api.get('/admin/analytics/revenue', {
          params: {
            start_date: dateRange.start_date,
            end_date: dateRange.end_date,
            group_by: groupBy
          }
        })
        setRevenueData(response.data)
      } else if (viewMode === 'comparison') {
        const response = await api.get('/admin/analytics/comparison', {
          params: comparisonRanges
        })
        setComparison(response.data)
      } else if (viewMode === 'reports') {
        const response = await api.get('/admin/analytics/reports/sales', {
          params: dateRange
        })
        setSalesReport(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      console.error('Error details:', error.response?.data)
      // Set default values to prevent crashes
      if (viewMode === 'overview') {
        setOverview(null)
      } else if (viewMode === 'trends') {
        setRevenueData(null)
      } else if (viewMode === 'comparison') {
        setComparison(null)
      } else if (viewMode === 'reports') {
        setSalesReport(null)
      }
      alert('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    let csv = ''
    if (viewMode === 'overview' && overview) {
      const rows = []
      
      if (Array.isArray(overview.revenue_trends)) {
        rows.push(['=== Revenue Trends ==='])
        rows.push(['Date', 'Revenue', 'Orders'])
        rows.push(...overview.revenue_trends.map(t => [t.date, t.revenue, t.orders]))
        rows.push([])
      }
      
      if (overview.signups) {
        rows.push(['=== Sign-ups Summary ==='])
        rows.push(['Metric', 'Count'])
        rows.push(['Total Customer Sign-ups', overview.signups.total_customer_signups || 0])
        rows.push(['Total Vendor Sign-ups', overview.signups.total_vendor_signups || 0])
        rows.push(['Total Admin Sign-ups', overview.signups.total_admin_signups || 0])
        rows.push(['Total Driver Sign-ups', overview.signups.total_driver_signups || 0])
        
        if (overview.driver_metrics) {
          rows.push(['', ''])
          rows.push(['Driver Metrics', ''])
          rows.push(['Total Drivers', overview.driver_metrics.total_drivers || 0])
          rows.push(['Active Drivers', overview.driver_metrics.active_drivers || 0])
          rows.push(['Available Drivers', overview.driver_metrics.available_drivers || 0])
          rows.push(['Pending Verification', overview.driver_metrics.pending_verification || 0])
        }
        
        if (overview.delivery_metrics) {
          rows.push(['', ''])
          rows.push(['Delivery Metrics', ''])
          rows.push(['Total Deliveries', overview.delivery_metrics.total_deliveries || 0])
          rows.push(['Completed Deliveries', overview.delivery_metrics.completed_deliveries || 0])
          rows.push(['Cancelled Deliveries', overview.delivery_metrics.cancelled_deliveries || 0])
          rows.push(['Completion Rate', `${overview.delivery_metrics.completion_rate?.toFixed(1) || 0}%`])
          rows.push(['Total Driver Earnings', `$${parseFloat(overview.delivery_metrics.total_driver_earnings || 0).toFixed(2)}`])
        }
        rows.push([])
      }
      
      if (overview.user_metrics) {
        rows.push(['=== User Engagement Metrics ==='])
        rows.push(['Metric', 'Value'])
        rows.push(['Active Customers', overview.user_metrics.active_customers || 0])
        rows.push(['Active Vendors', overview.user_metrics.active_vendors || 0])
        rows.push(['Repeat Customers', overview.user_metrics.repeat_customers || 0])
        rows.push(['Conversion Rate (%)', (overview.user_metrics.conversion_rate || 0).toFixed(2)])
        rows.push([])
      }
      
      csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    } else if (viewMode === 'trends' && revenueData && Array.isArray(revenueData.periods)) {
      csv = [
        ['Period', 'Revenue', 'Orders'],
        ...revenueData.periods.map(p => [p.period, p.revenue, p.orders])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    } else if (viewMode === 'reports' && salesReport && Array.isArray(salesReport.by_vendor)) {
      csv = [
        ['Vendor', 'Orders', 'Revenue'],
        ...salesReport.by_vendor.map(v => [v.vendor, v.orders, v.revenue])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    }
    
    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    }
  }

  const quickDateRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last year', days: 365 },
    { label: 'All time', days: null }
  ]

  const applyQuickRange = (days) => {
    const end = new Date()
    if (days === null) {
      // All time - set start date to 10 years ago to capture all data
      const start = new Date()
      start.setFullYear(start.getFullYear() - 10)
      setDateRange({
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0]
      })
    } else {
      const start = new Date()
      start.setDate(start.getDate() - days)
      setDateRange({
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0]
      })
    }
  }

  const renderChart = (data, dataKey, name, type = settings.chartType) => {
    if (!data || data.length === 0) return null
    
    const chartProps = {
      data,
      margin: { top: 5, right: 20, left: 0, bottom: 5 }
    }

    if (type === 'area') {
      return (
        <AreaChart {...chartProps}>
          <defs>
            <linearGradient id={`color${name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
          <Area type="monotone" dataKey={dataKey} stroke="#3B82F6" fillOpacity={1} fill={`url(#color${name})`} name={name} />
        </AreaChart>
      )
    } else if (type === 'line') {
      return (
        <LineChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
          <Line type="monotone" dataKey={dataKey} stroke="#3B82F6" strokeWidth={2} name={name} />
        </LineChart>
      )
    } else {
      return (
        <BarChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
          <Bar dataKey={dataKey} fill="#3B82F6" name={name} />
        </BarChart>
      )
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">Platform insights and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowSettings(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Analytics Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Settings are saved automatically and control what metrics are displayed</p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Chart Type</label>
              <select
                value={settings.chartType}
                onChange={(e) => updateSetting('chartType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="area">Area Chart</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="radar">Radar Chart</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Chart Theme</label>
              <select
                value={settings.chartTheme}
                onChange={(e) => updateSetting('chartTheme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="colorful">Colorful</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Default Date Range</label>
              <select
                value={settings.defaultDateRange}
                onChange={(e) => updateSetting('defaultDateRange', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primaryColor || '#3B82F6'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="h-10 w-20 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={settings.primaryColor || '#3B82F6'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor || '#10B981'}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  className="h-10 w-20 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={settings.secondaryColor || '#10B981'}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="#10B981"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
              <select
                value={settings.exportFormat || 'png'}
                onChange={(e) => updateSetting('exportFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="png">PNG Image</option>
                <option value="svg">SVG Vector</option>
                <option value="pdf">PDF Document</option>
                <option value="csv">CSV Data</option>
              </select>
            </div>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Display Options</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.compactMode || false}
                  onChange={(e) => updateSetting('compactMode', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Compact Mode</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showGrid !== false}
                  onChange={(e) => updateSetting('showGrid', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Show Grid</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showLegend !== false}
                  onChange={(e) => updateSetting('showLegend', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Show Legend</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showTooltips !== false}
                  onChange={(e) => updateSetting('showTooltips', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Show Tooltips</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.animationEnabled !== false}
                  onChange={(e) => updateSetting('animationEnabled', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Animations</label>
              </div>
            </div>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Show/Hide Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { key: 'showRevenue', label: 'Revenue Metrics' },
                { key: 'showOrders', label: 'Orders Metrics' },
                { key: 'showSignups', label: 'Sign-ups' },
                { key: 'showUserMetrics', label: 'User Engagement' },
                { key: 'showTopVendors', label: 'Top Vendors' },
                { key: 'showTopProducts', label: 'Top Products' },
                { key: 'showStatusBreakdown', label: 'Status Breakdown' },
                { key: 'showCustomerAcquisition', label: 'Customer Acquisition' },
                { key: 'showVendorPerformance', label: 'Vendor Performance' },
                { key: 'showAvgOrderValue', label: 'Avg Order Value' },
                { key: 'showDriverMetrics', label: 'Driver Metrics' },
                { key: 'showDeliveryMetrics', label: 'Delivery Metrics' },
                { key: 'showMarketingMetrics', label: 'Marketing Metrics' },
                { key: 'showGeographicData', label: 'Geographic Data' },
                { key: 'showTimeOfDayAnalysis', label: 'Time of Day Analysis' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => updateSetting(key, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-1 flex gap-1">
        {['overview', 'trends', 'comparison', 'reports'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              viewMode === mode
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Date Range Controls */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2">
            {quickDateRanges.map((range) => (
              <button
                key={range.label}
                onClick={() => applyQuickRange(range.days)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            {viewMode === 'trends' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            )}
            <button
              onClick={fetchData}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm h-fit"
            >
              <Calendar className="h-4 w-4" />
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && overview && (
        <div className="space-y-4">
          {/* Key Metrics - Compact Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${settings.compactMode ? 'gap-3' : 'gap-4'}`}>
            {settings.showRevenue && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${Array.isArray(overview.revenue_trends) ? overview.revenue_trends.reduce((sum, t) => sum + (t.revenue || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
              </div>
            )}
            {settings.showOrders && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Orders</p>
                    <p className="text-xl font-bold text-gray-900">
                      {Array.isArray(overview.revenue_trends) ? overview.revenue_trends.reduce((sum, t) => sum + (t.orders || 0), 0) : 0}
                    </p>
                  </div>
                  <ShoppingBag className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            )}
            {settings.showSignups && overview.signups && (
              <>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Customer Sign-ups</p>
                      <p className="text-xl font-bold text-gray-900">{overview.signups.total_customer_signups || 0}</p>
                    </div>
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Vendor Sign-ups</p>
                      <p className="text-xl font-bold text-gray-900">{overview.signups.total_vendor_signups || 0}</p>
                    </div>
                    <Store className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Driver Sign-ups</p>
                      <p className="text-xl font-bold text-gray-900">{overview.signups.total_driver_signups || 0}</p>
                    </div>
                    <Truck className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Engagement Metrics */}
          {settings.showUserMetrics && overview.user_metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Active Customers</p>
                <p className="text-xl font-bold text-gray-900">{overview.user_metrics.active_customers || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Active Vendors</p>
                <p className="text-xl font-bold text-gray-900">{overview.user_metrics.active_vendors || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Repeat Customers</p>
                <p className="text-xl font-bold text-gray-900">{overview.user_metrics.repeat_customers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {overview.user_metrics.customer_retention_rate ? `${overview.user_metrics.customer_retention_rate.toFixed(1)}% retention` : '0%'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {overview.user_metrics.conversion_rate ? `${overview.user_metrics.conversion_rate.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          )}

          {/* Revenue Trends */}
          {settings.showRevenue && overview.revenue_trends && overview.revenue_trends.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                {renderChart(overview.revenue_trends, 'revenue', 'Revenue ($)')}
              </ResponsiveContainer>
            </div>
          )}

          {/* Sign-ups Trends */}
          {settings.showSignups && overview.signups && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign-ups Trends</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                <LineChart data={(() => {
                  const dateMap = new Map()
                  if (Array.isArray(overview.signups.customer_signups)) {
                    overview.signups.customer_signups.forEach(item => {
                      if (!dateMap.has(item.date)) {
                        dateMap.set(item.date, { date: item.date, customers: 0, vendors: 0 })
                      }
                      dateMap.get(item.date).customers = item.count
                    })
                  }
                  if (Array.isArray(overview.signups.vendor_signups)) {
                    overview.signups.vendor_signups.forEach(item => {
                      if (!dateMap.has(item.date)) {
                        dateMap.set(item.date, { date: item.date, customers: 0, vendors: 0, drivers: 0 })
                      }
                      dateMap.get(item.date).vendors = item.count
                    })
                  }
                  if (Array.isArray(overview.signups.driver_signups)) {
                    overview.signups.driver_signups.forEach(item => {
                      if (!dateMap.has(item.date)) {
                        dateMap.set(item.date, { date: item.date, customers: 0, vendors: 0, drivers: 0 })
                      }
                      dateMap.get(item.date).drivers = item.count
                    })
                  }
                  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="customers" stroke="#3B82F6" strokeWidth={2} name="Customers" />
                  <Line type="monotone" dataKey="vendors" stroke="#8B5CF6" strokeWidth={2} name="Vendors" />
                  {overview.signups.driver_signups && (
                    <Line type="monotone" dataKey="drivers" stroke="#F59E0B" strokeWidth={2} name="Drivers" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Driver Metrics */}
          {settings.showDriverMetrics && overview.driver_metrics && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Driver Metrics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Drivers</p>
                  <p className="text-xl font-bold text-gray-900">{overview.driver_metrics.total_drivers || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Active Drivers</p>
                  <p className="text-xl font-bold text-gray-900">{overview.driver_metrics.active_drivers || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Available</p>
                  <p className="text-xl font-bold text-green-600">{overview.driver_metrics.available_drivers || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Pending Verification</p>
                  <p className="text-xl font-bold text-yellow-600">{overview.driver_metrics.pending_verification || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">New Sign-ups</p>
                  <p className="text-xl font-bold text-blue-600">{overview.driver_metrics.total_driver_signups || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Metrics */}
          {settings.showDeliveryMetrics && overview.delivery_metrics && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Metrics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Deliveries</p>
                  <p className="text-xl font-bold text-gray-900">{overview.delivery_metrics.total_deliveries || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Completed</p>
                  <p className="text-xl font-bold text-green-600">{overview.delivery_metrics.completed_deliveries || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Cancelled</p>
                  <p className="text-xl font-bold text-red-600">{overview.delivery_metrics.cancelled_deliveries || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Completion Rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {overview.delivery_metrics.completion_rate ? `${overview.delivery_metrics.completion_rate.toFixed(1)}%` : '0%'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Total Driver Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${overview.delivery_metrics.total_driver_earnings ? parseFloat(overview.delivery_metrics.total_driver_earnings).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          )}

          {/* Delivery Trends */}
          {settings.showDeliveryMetrics && overview.delivery_trends && overview.delivery_trends.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Trends</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                {renderChart(overview.delivery_trends, 'count', 'Deliveries')}
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Drivers */}
          {settings.showDriverMetrics && overview.top_drivers && overview.top_drivers.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Drivers</h2>
              <div className="space-y-2">
                {overview.top_drivers.map((driver, index) => (
                  <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.deliveries} deliveries</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">${parseFloat(driver.earnings || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Avg: ${parseFloat(driver.avg_earnings || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Average Order Value Trends */}
          {settings.showAvgOrderValue && overview.avg_order_value_trends && overview.avg_order_value_trends.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Order Value</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                {renderChart(overview.avg_order_value_trends, 'avg_value', 'Avg Order Value ($)')}
              </ResponsiveContainer>
            </div>
          )}

          {/* Two Column Layout for Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Order Status Breakdown */}
            {settings.showStatusBreakdown && overview.status_breakdown && Object.keys(overview.status_breakdown).length > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
                <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(overview.status_breakdown).map(([status, data]) => ({
                        name: status.replace('_', ' ').toUpperCase(),
                        value: data.count,
                        revenue: data.revenue
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={settings.compactMode ? 70 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(overview.status_breakdown).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Customer Acquisition */}
            {settings.showCustomerAcquisition && overview.customer_acquisition && overview.customer_acquisition.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Acquisition</h2>
                <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                  <BarChart data={overview.customer_acquisition}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#10B981" name="New Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Vendors */}
          {settings.showTopVendors && overview.top_vendors && overview.top_vendors.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                <BarChart data={overview.top_vendors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={120} stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products */}
          {settings.showTopProducts && overview.top_products && overview.top_products.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
              <div className="space-y-2">
                {overview.top_products.slice(0, 10).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${parseFloat(product.revenue).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && revenueData && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends ({groupBy})</h2>
          <ResponsiveContainer width="100%" height={settings.compactMode ? 350 : 400}>
            <LineChart data={revenueData.periods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue ($)" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison View */}
      {viewMode === 'comparison' && comparison && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Period Comparison</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Period 1</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders:</span>
                    <span className="font-medium">{comparison.period1.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">${parseFloat(comparison.period1.total_revenue).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Order Value:</span>
                    <span className="font-medium">${parseFloat(comparison.period1.avg_order_value).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Period 2</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders:</span>
                    <span className="font-medium">{comparison.period2.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">${parseFloat(comparison.period2.total_revenue).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Order Value:</span>
                    <span className="font-medium">${parseFloat(comparison.period2.avg_order_value).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Changes</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {comparison.changes && typeof comparison.changes === 'object' ? Object.entries(comparison.changes).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 capitalize mb-2">{key.replace('_', ' ')}</p>
                  <div className="flex items-center justify-center gap-1">
                    {value >= 0 ? (
                      <ArrowUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowDown className="h-5 w-5 text-red-500" />
                    )}
                    <p className={`text-xl font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(value).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )) : null}
            </div>
          </div>
        </div>
      )}

      {/* Reports View */}
      {viewMode === 'reports' && salesReport && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Report Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{salesReport.summary.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${parseFloat(salesReport.summary.total_revenue).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">${parseFloat(salesReport.summary.avg_order_value).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Vendor</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                <BarChart data={salesReport.by_vendor}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="vendor" angle={-45} textAnchor="end" height={100} stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue</h2>
              <ResponsiveContainer width="100%" height={settings.compactMode ? 250 : 300}>
                <AreaChart data={salesReport.by_day}>
                  <defs>
                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorDaily)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Date Range Controls */}
      {viewMode === 'comparison' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-sm">Period 1</h3>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={comparisonRanges.period1_start}
                  onChange={(e) => setComparisonRanges({ ...comparisonRanges, period1_start: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={comparisonRanges.period1_end}
                  onChange={(e) => setComparisonRanges({ ...comparisonRanges, period1_end: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-sm">Period 2</h3>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={comparisonRanges.period2_start}
                  onChange={(e) => setComparisonRanges({ ...comparisonRanges, period2_start: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={comparisonRanges.period2_end}
                  onChange={(e) => setComparisonRanges({ ...comparisonRanges, period2_end: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Calendar className="h-4 w-4" />
            Update Comparison
          </button>
        </div>
      )}
    </div>
  )
}

export default Analytics
