import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { DollarSign, TrendingUp, Calendar, Download, Filter, CreditCard, ExternalLink, CheckCircle } from 'lucide-react'

const Earnings = () => {
  const [searchParams] = useSearchParams()
  const [earnings, setEarnings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stripeStatus, setStripeStatus] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, year
  const [statusFilter, setStatusFilter] = useState('all') // all, completed, pending

  useEffect(() => {
    fetchEarnings()
  }, [dateFilter, statusFilter])

  useEffect(() => {
    const fetchStripeStatus = async () => {
      try {
        const res = await api.get('/driver/me/stripe-connect/status')
        setStripeStatus(res.data)
      } catch (e) {
        setStripeStatus({ connected: false })
      }
    }
    fetchStripeStatus()
  }, [searchParams.get('stripe')])

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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Delivery earnings and payments</p>
        </div>
        <button className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium">
          <Download className="h-4 w-4 sm:h-5 sm:w-5" />
          Export
        </button>
      </div>

      {/* Stats Cards - match vendor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(stats?.total || 0)}
              </p>
            </div>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(stats?.completedTotal || 0)}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(stats?.pending || 0)}
              </p>
            </div>
            <Calendar className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-yellow-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Avg/Delivery</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(stats?.average || 0)}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-6 lg:h-6 lg:w-6 text-purple-500 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Receive payouts (Stripe Connect) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Receive payouts
        </h3>
        {stripeStatus?.onboarding_complete ? (
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>Stripe connected — you&apos;ll receive delivery earnings automatically to your Stripe account.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect Stripe to get paid automatically for completed deliveries.
            </p>
            <button
              type="button"
              disabled={stripeLoading}
              onClick={async () => {
                setStripeLoading(true)
                try {
                  const res = await api.post('/driver/me/stripe-connect/onboard')
                  if (res.data?.url) {
                    window.location.href = res.data.url
                  } else {
                    alert('Could not start Stripe Connect onboarding')
                  }
                } catch (e) {
                  alert(e.response?.data?.detail || 'Failed to start Stripe Connect')
                } finally {
                  setStripeLoading(false)
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              {stripeStatus?.connected ? 'Complete Stripe setup' : 'Connect with Stripe'}
            </button>
          </div>
        )}
      </div>

      {/* Filters - match vendor card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
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

      {/* Earnings Table - match vendor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 xl:px-6 py-12 text-center text-gray-500">
                    No earnings found for the selected filters
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-gray-50">
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {earning.order_number}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(earning.date)}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(earning.amount)}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
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
                    <td className="px-4 xl:px-6 py-4 text-sm text-gray-500">
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

