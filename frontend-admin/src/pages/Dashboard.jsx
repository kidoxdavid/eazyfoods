import { useEffect, useState, useRef } from 'react'
import api from '../services/api'
import { Store, Users, Package, ShoppingBag, DollarSign, TrendingUp, Activity, AlertCircle, Download, Database } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const hasLoadedData = useRef(false)

  useEffect(() => {
    let isMounted = true
    let fetchAborted = false

    const fetchData = async () => {
      if (!isMounted || fetchAborted) return
      
      await fetchStats()
      if (!isMounted || fetchAborted) return
      
      await fetchRecentActivity()
      if (isMounted && !fetchAborted) {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
      fetchAborted = true
    }
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard/stats', { timeout: 15000 })
      // Handle both response formats: {data: {...}} or direct {...}
      let statsData = response.data
      if (statsData && statsData.data) {
        statsData = statsData.data
      }
      if (!statsData || !statsData.overview) {
        throw new Error('Invalid stats data received')
      }
      // Only update stats if we got valid data
      setStats(statsData)
      hasLoadedData.current = true
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      console.error('Error details:', error.response?.data)
      
      // Only reset stats if we haven't successfully loaded data before
      if (!hasLoadedData.current) {
        // Check for network errors
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
          console.error('Network Error: Cannot connect to backend server. Is it running on port 8000?')
          alert('Cannot connect to server. Please ensure the backend server is running on port 8000.')
        }
        // Only set default stats if we don't have any existing data
        setStats({
          overview: {
            total_vendors: 0,
            active_vendors: 0,
            total_customers: 0,
            total_products: 0,
            total_orders: 0,
            total_revenue: 0
          },
          today: { orders: 0, revenue: 0 },
          this_month: { orders: 0, revenue: 0 },
          order_status_breakdown: {}
        })
      }
      // If we've already loaded data, don't reset it - keep the existing stats
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/admin/dashboard/recent-activity?limit=10', { timeout: 15000 })
      const activityData = Array.isArray(response.data) ? response.data : []
      // Always update with the fetched data
      setRecentActivity(activityData)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
      // Only set to empty array on first load (when recentActivity is empty)
      setRecentActivity(prev => prev.length === 0 ? [] : prev)
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
        responseType: 'blob'
      })
      
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Vendors',
      value: stats?.overview?.total_vendors || 0,
      active: stats?.overview?.active_vendors || 0,
      icon: Store,
      color: 'blue'
    },
    {
      title: 'Total Customers',
      value: stats?.overview?.total_customers || 0,
      icon: Users,
      color: 'green'
    },
    {
      title: 'Total Products',
      value: stats?.overview?.total_products || 0,
      icon: Package,
      color: 'purple'
    },
    {
      title: 'Total Orders',
      value: stats?.overview?.total_orders || 0,
      icon: ShoppingBag,
      color: 'orange'
    },
    {
      title: 'Total Revenue',
      value: `$${parseFloat(stats?.overview?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Today\'s Revenue',
      value: `$${parseFloat(stats?.today?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'blue'
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform overview and statistics</p>
        </div>
        <button
          onClick={handleMasterExport}
          disabled={exporting}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 text-sm"
          title="Export all database data to CSV"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export All Data'}</span>
          <span className="sm:hidden">{exporting ? 'Exporting...' : 'Export'}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {stat.active !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">{stat.active} active</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-8 w-8 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Order Status Breakdown Chart */}
        {stats?.order_status_breakdown && Object.keys(stats.order_status_breakdown).length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.order_status_breakdown).map(([status, count]) => ({
                    name: status.replace('_', ' ').toUpperCase(),
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(stats.order_status_breakdown).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.entity_type} {activity.entity_id ? `#${activity.entity_id.slice(0, 8)}` : ''}
                      </p>
                      {activity.admin_name && (
                        <p className="text-xs text-gray-400 mt-1">by {activity.admin_name}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Order Status Breakdown */}
      {stats?.order_status_breakdown && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(stats.order_status_breakdown).map(([status, count]) => (
              <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize mt-1">{status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

