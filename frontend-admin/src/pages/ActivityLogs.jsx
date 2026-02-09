import { useEffect, useState } from 'react'
import api from '../services/api'
import { Activity, User, Calendar, Filter, Download } from 'lucide-react'
import Pagination from '../components/Pagination'

const ActivityLogs = () => {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [actionFilter, entityFilter, currentPage])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 50,
        limit: 50
      }
      if (actionFilter) params.action_filter = actionFilter
      if (entityFilter !== 'all') params.entity_type_filter = entityFilter
      
      const response = await api.get('/admin/activity', { params })
      const logsData = Array.isArray(response.data) ? response.data : []
      setLogs(logsData)
      setTotalPages(Math.ceil(logsData.length / 50) || 1)
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
      setLogs([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/activity/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch activity stats:', error)
    }
  }

  const handleExport = () => {
    if (!Array.isArray(logs) || logs.length === 0) {
      alert('No activity logs to export')
      return
    }
    
    const headers = ['Time', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details']
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.admin_name || 'N/A',
      log.action?.replace(/_/g, ' ') || 'N/A',
      log.entity_type || 'N/A',
      log.entity_id?.slice(0, 8) || 'N/A',
      log.details || ''
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const getActionColor = (action) => {
    if (action.includes('delete') || action.includes('deactivate')) return 'text-red-600'
    if (action.includes('create') || action.includes('activate')) return 'text-green-600'
    if (action.includes('update') || action.includes('moderate')) return 'text-blue-600'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">Track all admin actions and system events</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total Actions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_actions}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Last 24 Hours</p>
            <p className="text-2xl font-bold text-blue-600">{stats.recent_actions_24h}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Top Admins</p>
            <p className="text-2xl font-bold text-gray-900">{stats.top_admins?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex gap-4">
        <div className="flex-1 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Entities</option>
          <option value="vendor">Vendors</option>
          <option value="customer">Customers</option>
          <option value="product">Products</option>
          <option value="order">Orders</option>
          <option value="review">Reviews</option>
          <option value="support">Support</option>
        </select>
      </div>

      {/* Activity Logs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {Array.isArray(logs) && logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className={`font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-gray-500">on</span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {log.entity_type}
                    </span>
                    {log.entity_id && (
                      <span className="text-xs text-gray-400">#{log.entity_id.slice(0, 8)}</span>
                    )}
                  </div>
                  {log.details && typeof log.details === 'object' && (
                    <div className="mt-2 text-sm text-gray-600">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {log.admin_name} ({log.admin_email})
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}

export default ActivityLogs

