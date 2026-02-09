import { useEffect, useState } from 'react'
import api from '../services/api'
import { DollarSign, TrendingUp, Calendar, Download, Filter } from 'lucide-react'

const Earnings = () => {
  const [earnings, setEarnings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, year
  const [statusFilter, setStatusFilter] = useState('all') // all, completed, pending

  useEffect(() => {
    fetchEarnings()
  }, [dateFilter, statusFilter])

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      // Fetch deliveries to calculate earnings
      const response = await api.get('/driver/deliveries')
      const deliveries = Array.isArray(response.data) ? response.data : []
      
      // Filter deliveries based on date and status
      let filtered = deliveries
      
      if (dateFilter !== 'all') {
        const now = new Date()
        const filters = {
          today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          month: new Date(now.getFullYear(), now.getMonth(), 1),
          year: new Date(now.getFullYear(), 0, 1)
        }
        const filterDate = filters[dateFilter]
        filtered = filtered.filter(d => new Date(d.created_at) >= filterDate)
      }
      
      if (statusFilter !== 'all') {
        filtered = filtered.filter(d => d.status === statusFilter)
      }
      
      // Calculate earnings from deliveries
      const earningsData = filtered
        .filter(d => d.driver_earnings)
        .map(d => ({
          id: d.id,
          order_number: d.order_number,
          date: d.created_at,
          amount: parseFloat(d.driver_earnings || 0),
          status: d.status,
          delivery_address: d.delivery_address
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      
      setEarnings(earningsData)
      
      // Calculate stats
      const total = earningsData.reduce((sum, e) => sum + e.amount, 0)
      const completed = earningsData.filter(e => e.status === 'delivered').length
      const pending = earningsData.filter(e => e.status !== 'delivered').reduce((sum, e) => sum + e.amount, 0)
      const completedTotal = earningsData.filter(e => e.status === 'delivered').reduce((sum, e) => sum + e.amount, 0)
      
      setStats({
        total,
        completed,
        pending,
        completedTotal,
        average: earningsData.length > 0 ? total / earningsData.length : 0
      })
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
          <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600 mt-1">Track your delivery earnings and payments</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.total || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.completedTotal || 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.pending || 0)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average per Delivery</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.average || 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="delivered">Completed</option>
            <option value="in_transit">In Transit</option>
            <option value="picked_up">Picked Up</option>
            <option value="accepted">Accepted</option>
          </select>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No earnings found for the selected filters
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {earning.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(earning.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(earning.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        earning.status === 'delivered' 
                          ? 'bg-green-100 text-green-800'
                          : earning.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800'
                          : earning.status === 'picked_up'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {earning.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {earning.delivery_address?.street || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Earnings

