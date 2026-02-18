import { useEffect, useState } from 'react'
import api from '../services/api'
import { DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/format'

const Payouts = () => {
  const [payouts, setPayouts] = useState([])
  const [stats, setStats] = useState(null)
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // For now, use a placeholder since chef payouts might not be implemented yet
      // This can be extended when chef payout endpoints are created
      setPayouts([])
      setStats({
        total_paid: 0,
        total_payouts: 0,
        pending_amount: 0,
        pending_payouts: 0
      })
      setBalance({
        available_balance: 0,
        pending_orders_count: 0
      })
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Available Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                {formatCurrency(balance?.available_balance || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {balance?.pending_orders_count || 0} pending orders
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                {formatCurrency(stats?.total_paid || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.total_payouts || 0} payouts
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                {formatCurrency(stats?.pending_amount || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.pending_payouts || 0} in process
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payout History</h2>
        {payouts.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600">No payouts yet</p>
            <p className="text-sm text-gray-500 mt-2">Your earnings will appear here once payouts are processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Payout #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payout.payout_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payout.net_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payout.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Payouts




