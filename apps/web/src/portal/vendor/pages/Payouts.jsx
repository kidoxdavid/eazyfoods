import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { DollarSign, TrendingUp, Percent, CreditCard, ExternalLink, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/format'

const Payouts = () => {
  const [searchParams] = useSearchParams()
  const [payouts, setPayouts] = useState([])
  const [stats, setStats] = useState(null)
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stripeConnectStatus, setStripeConnectStatus] = useState(null)
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const fetchStripeStatus = async () => {
      try {
        const res = await api.get('/vendors/me/stripe-connect/status')
        setStripeConnectStatus(res.data)
      } catch {
        setStripeConnectStatus({ connected: false })
      }
    }
    fetchStripeStatus()
  }, [searchParams.get('stripe')])

  const fetchData = async () => {
    try {
      const [payoutsRes, statsRes, balanceRes] = await Promise.all([
        api.get('/payouts/'),
        api.get('/payouts/summary/stats'),
        api.get('/payouts/balance/available'),
      ])
      setPayouts(payoutsRes.data)
      setStats(statsRes.data)
      setBalance(balanceRes.data)
    } catch (error) {
      console.error('Failed to fetch payout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredPayouts = payouts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (dateFrom && p.created_at) {
      if (new Date(p.created_at) < new Date(dateFrom)) return false
    }
    if (dateTo && p.created_at) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      if (new Date(p.created_at) > to) return false
    }
    return true
  })

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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Payouts</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Track your earnings and payouts</p>
      </div>

      {/* Receive payouts (Stripe Connect) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary-600" />
          Receive payouts
        </h2>
        {stripeConnectStatus?.onboarding_complete ? (
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>Stripe connected — you&apos;ll receive order payouts automatically to your Stripe account.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-gray-600">
              Connect Stripe to get paid automatically when customers pay for orders. No manual bank transfers needed.
            </p>
            <button
              type="button"
              disabled={stripeConnectLoading}
              onClick={async () => {
                setStripeConnectLoading(true)
                try {
                  const res = await api.post('/vendors/me/stripe-connect/onboard')
                  if (res.data?.url) window.location.href = res.data.url
                  else alert('Could not start Stripe setup')
                } catch (e) {
                  alert(e.response?.data?.detail || 'Failed to start Stripe Connect')
                } finally {
                  setStripeConnectLoading(false)
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              {stripeConnectStatus?.connected ? 'Complete Stripe setup' : 'Connect with Stripe'}
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Available Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                {formatCurrency(balance?.available_balance || 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                {balance?.pending_orders_count || 0} pending orders
              </p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                {formatCurrency(stats?.total_paid || 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                {stats?.total_payouts || 0} payouts
              </p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                {formatCurrency(stats?.pending_amount || 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                {stats?.pending_payouts || 0} in process
              </p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Commission</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                {formatCurrency(stats?.total_commission ?? 0)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                {stats?.commission_rate != null && stats.commission_rate !== ''
                  ? `${Number(stats.commission_rate)}% rate (same as Admin → Commission)`
                  : 'Platform share from payouts'}
              </p>
            </div>
            <Percent className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Payouts - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Payout History</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              placeholder="To"
            />
            {(dateFrom || dateTo || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all') }}
                className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {payouts.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">No payouts yet</p>
        ) : filteredPayouts.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">No payouts match your filters</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Payout #
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Period
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Gross
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Commission
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Net Amount
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id}>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payout.payout_number}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatCurrency(payout.gross_amount ?? 0)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-amber-700 font-medium">
                        -{formatCurrency(payout.commission_amount ?? 0)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payout.net_amount)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payout.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payout #:</span>
                      <span className="text-gray-900 font-medium">{payout.payout_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Period:</span>
                      <span className="text-gray-900 text-right">{formatDate(payout.period_start)} - {formatDate(payout.period_end)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Gross:</span>
                      <span className="text-gray-900">{formatCurrency(payout.gross_amount ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Commission:</span>
                      <span className="text-amber-700 font-medium">-{formatCurrency(payout.commission_amount ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Net amount:</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(payout.net_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900">{formatDate(payout.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Payouts

