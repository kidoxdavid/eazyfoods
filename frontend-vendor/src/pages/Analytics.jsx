import { useEffect, useState } from 'react'
import api from '../services/api'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  ShoppingCart,
  PieChart,
  BarChart,
  LineChart,
  Activity
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import {
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

const Analytics = () => {
  const [report, setReport] = useState(null)
  const [salesTrends, setSalesTrends] = useState(null)
  const [revenueBreakdown, setRevenueBreakdown] = useState(null)
  const [productPerformance, setProductPerformance] = useState(null)
  const [fulfillmentMetrics, setFulfillmentMetrics] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('overview') // overview, trends, products, comparison
  const [groupBy, setGroupBy] = useState('day') // day, week, month
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })
  const [comparisonRanges, setComparisonRanges] = useState({
    period1_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period1_end: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period2_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    period2_end: new Date().toISOString().split('T')[0]
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const [reportRes, trendsRes, breakdownRes, productRes, fulfillmentRes] = await Promise.all([
        api.get('/analytics/sales-report', { params: dateRange }),
        api.get('/analytics/sales-trends', { params: { ...dateRange, group_by: groupBy } }),
        api.get('/analytics/revenue-breakdown', { params: dateRange }),
        api.get('/analytics/product-performance', { params: dateRange }),
        api.get('/analytics/fulfillment-metrics', { params: dateRange })
      ])
      setReport(reportRes.data)
      setSalesTrends(trendsRes.data)
      setRevenueBreakdown(breakdownRes.data)
      setProductPerformance(productRes.data)
      setFulfillmentMetrics(fulfillmentRes.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComparison = async () => {
    setLoading(true)
    try {
      const response = await api.get('/analytics/comparison', { params: comparisonRanges })
      setComparison(response.data)
    } catch (error) {
      console.error('Failed to fetch comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'comparison') {
      fetchComparison()
    } else {
      fetchAnalytics()
    }
  }, [viewMode, groupBy, dateRange])

  const handleDateChange = (field, value) => {
    setDateRange({ ...dateRange, [field]: value })
  }

  const handleComparisonDateChange = (field, value) => {
    setComparisonRanges({ ...comparisonRanges, [field]: value })
  }

  const quickDateRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last year', days: 365 }
  ]

  const applyQuickRange = (days) => {
    const end = new Date()
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setDateRange({
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0]
    })
  }

  if (loading && !report && viewMode !== 'comparison') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Comprehensive business insights and visualizations</p>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'trends', label: 'Sales Trends', icon: LineChart },
            { id: 'products', label: 'Products', icon: PieChart },
            { id: 'comparison', label: 'Comparison', icon: Activity }
          ].map((mode) => {
            const Icon = mode.icon
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
                  viewMode === mode.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                {mode.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
        {viewMode === 'comparison' ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Period 1</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={comparisonRanges.period1_start}
                      onChange={(e) => handleComparisonDateChange('period1_start', e.target.value)}
                      className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={comparisonRanges.period1_end}
                      onChange={(e) => handleComparisonDateChange('period1_end', e.target.value)}
                      className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Period 2</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={comparisonRanges.period2_start}
                      onChange={(e) => handleComparisonDateChange('period2_start', e.target.value)}
                      className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={comparisonRanges.period2_end}
                      onChange={(e) => handleComparisonDateChange('period2_end', e.target.value)}
                      className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                <div className="flex-1 sm:flex-initial">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                    className="w-full sm:w-auto px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex-1 sm:flex-initial">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                    className="w-full sm:w-auto px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            {viewMode !== 'comparison' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Quick ranges:</span>
                <div className="flex flex-wrap gap-2">
                  {quickDateRanges.map((range) => (
                    <button
                      key={range.days}
                      onClick={() => applyQuickRange(range.days)}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {viewMode === 'trends' && (
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Group by:</label>
            <div className="flex gap-2">
              {['day', 'week', 'month'].map((option) => (
                <button
                  key={option}
                  onClick={() => setGroupBy(option)}
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium whitespace-nowrap ${
                    groupBy === option
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={viewMode === 'comparison' ? fetchComparison : fetchAnalytics}
          className="mt-3 sm:mt-4 w-full sm:w-auto px-3 sm:px-4 py-2 text-xs sm:text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Update Report
        </button>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && report && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Total Orders</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{report.total_orders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{formatCurrency(report.total_revenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-green-500 flex-shrink-0 ml-2" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Commission</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 mt-1 sm:mt-2 truncate">-{formatCurrency(report.total_commission)}</p>
                </div>
                <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-red-500 flex-shrink-0 ml-2" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Net Payout</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mt-1 sm:mt-2 truncate">{formatCurrency(report.net_payout)}</p>
                </div>
                <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-green-500 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>

          {/* Sales Trends Chart */}
          {salesTrends && salesTrends.trends && salesTrends.trends.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Sales Trends</h2>
              <div className="w-full" style={{ minWidth: '300px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={salesTrends.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'revenue' || name === 'net_payout' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : name === 'net_payout' ? 'Net Payout' : 'Orders'
                    ]}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="order_count"
                    stroke="#3B82F6"
                    name="Orders"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    name="Revenue"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="net_payout"
                    stroke="#8B5CF6"
                    name="Net Payout"
                    strokeWidth={2}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Revenue Breakdown Pie Chart */}
          {revenueBreakdown && revenueBreakdown.breakdown && revenueBreakdown.breakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Revenue by Category</h2>
              <div className="w-full" style={{ minWidth: '300px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                  <Pie
                    data={revenueBreakdown.breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category_name, percent }) => `${category_name || 'Uncategorized'} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {revenueBreakdown.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Products Bar Chart */}
          {report.top_products && report.top_products.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Top Products</h2>
              <div className="w-full" style={{ minWidth: '300px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={report.top_products}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                  <Bar dataKey="total_sold" fill="#10B981" name="Units Sold" />
                </RechartsBarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && salesTrends && salesTrends.trends && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Sales Trends Over Time</h2>
          <div className="w-full" style={{ minWidth: '300px', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={salesTrends.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name) => [
                  name === 'revenue' || name === 'net_payout' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Revenue' : name === 'net_payout' ? 'Net Payout' : 'Orders'
                ]}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="order_count"
                stroke="#3B82F6"
                name="Orders"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                name="Revenue"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="net_payout"
                stroke="#8B5CF6"
                name="Net Payout"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Products View */}
      {viewMode === 'products' && productPerformance && (
        <>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Product Performance</h2>
            <div className="w-full" style={{ minWidth: '300px', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={productPerformance.products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="product_name" type="category" width={200} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                <Bar dataKey="total_sold" fill="#10B981" name="Units Sold" />
              </RechartsBarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Product Performance Table */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productPerformance.products?.map((product) => (
                    <tr key={product.product_id}>
                      <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{product.product_name}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500">{product.total_sold}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500">{product.order_count}</td>
                      <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Comparison View */}
      {viewMode === 'comparison' && comparison && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Period Comparison</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Period 1</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders:</span>
                    <span className="font-semibold">{comparison.period1.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-semibold">{formatCurrency(comparison.period1.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Payout:</span>
                    <span className="font-semibold">{formatCurrency(comparison.period1.net_payout)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Order Value:</span>
                    <span className="font-semibold">{formatCurrency(comparison.period1.avg_order_value)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Period 2</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders:</span>
                    <span className="font-semibold">{comparison.period2.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-semibold">{formatCurrency(comparison.period2.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Payout:</span>
                    <span className="font-semibold">{formatCurrency(comparison.period2.net_payout)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Order Value:</span>
                    <span className="font-semibold">{formatCurrency(comparison.period2.avg_order_value)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Chart */}
            <div className="w-full overflow-x-auto" style={{ minWidth: '300px' }}>
              <div style={{ width: '100%', height: '300px', minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={[
                  {
                    name: 'Orders',
                    period1: comparison.period1.total_orders,
                    period2: comparison.period2.total_orders
                  },
                  {
                    name: 'Revenue',
                    period1: comparison.period1.total_revenue,
                    period2: comparison.period2.total_revenue
                  },
                  {
                    name: 'Net Payout',
                    period1: comparison.period1.net_payout,
                    period2: comparison.period2.net_payout
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => (typeof value === 'number' && value > 1000 ? formatCurrency(value) : value)} />
                <Legend />
                <Bar dataKey="period1" fill="#3B82F6" name="Period 1" />
                <Bar dataKey="period2" fill="#10B981" name="Period 2" />
              </RechartsBarChart>
            </ResponsiveContainer>
            </div>
            </div>

            {/* Change Percentages */}
            <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              {Object.entries(comparison.changes).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-2 sm:p-3 lg:p-4 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                  <p className={`text-lg sm:text-xl lg:text-2xl font-bold mt-1 sm:mt-2 ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Metrics */}
      {fulfillmentMetrics && viewMode !== 'comparison' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 lg:p-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Fulfillment Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Orders</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{fulfillmentMetrics.total_orders}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Completed</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{fulfillmentMetrics.completed_orders}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Cancelled</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{fulfillmentMetrics.cancelled_orders}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Fulfillment Time</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{fulfillmentMetrics.average_fulfillment_time_minutes} min</p>
            </div>
          </div>
          {fulfillmentMetrics.status_breakdown && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Order Status Breakdown</h3>
              <div className="w-full overflow-x-auto" style={{ minWidth: '300px' }}>
                <div style={{ width: '100%', height: '250px', minWidth: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(fulfillmentMetrics.status_breakdown).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(fulfillmentMetrics.status_breakdown).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
              </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Analytics
