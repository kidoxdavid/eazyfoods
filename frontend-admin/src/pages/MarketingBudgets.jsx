import { useEffect, useState } from 'react'
import api from '../services/api'
import { DollarSign, Plus, Edit, Trash2, TrendingUp, TrendingDown, AlertCircle, Calendar, Download } from 'lucide-react'
import { Link } from 'react-router-dom'

const MarketingBudgets = () => {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchBudgets()
  }, [statusFilter])

  const fetchBudgets = async () => {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      const response = await api.get('/admin/marketing/budgets', { params })
      setBudgets(response.data || [])
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }

  // Note: Delete endpoint may not be available
  const handleDelete = async (budgetId) => {
    if (!confirm('Are you sure you want to delete this budget? This action cannot be undone.')) return
    try {
      await api.delete(`/admin/marketing/budgets/${budgetId}`)
      alert('Budget deleted successfully')
      fetchBudgets()
    } catch (error) {
      // Endpoint may not exist, show helpful message
      if (error.response?.status === 404) {
        alert('Delete functionality is not available. Please contact support.')
      } else {
        alert('Failed to delete budget: ' + (error.response?.data?.detail || error.message))
      }
    }
  }

  const handleExport = () => {
    if (!budgets || budgets.length === 0) {
      alert('No budgets to export')
      return
    }

    let csv = 'Marketing Budgets Export\n'
    csv += `Generated: ${new Date().toISOString()}\n\n`
    csv += 'ID,Name,Campaign,Amount,Spent,Remaining,Status,Start Date,End Date,Created At\n'
    
    budgets.forEach(budget => {
      const amount = budget.total_budget || budget.amount || 0
      const spent = budget.spent || 0
      const remaining = amount - spent
      csv += `${budget.id || ''},${budget.name || ''},${budget.campaign_name || 'N/A'},${amount},${spent},${remaining},${budget.status || ''},${budget.start_date || ''},${budget.end_date || ''},${budget.created_at || ''}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marketing-budgets-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'exhausted': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateTotalBudget = () => {
    return budgets.reduce((sum, b) => sum + (parseFloat(b.total_budget || b.amount) || 0), 0)
  }

  const calculateTotalSpent = () => {
    return budgets.reduce((sum, b) => sum + (parseFloat(b.spent) || 0), 0)
  }

  const calculateRemaining = () => {
    return calculateTotalBudget() - calculateTotalSpent()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const totalBudget = calculateTotalBudget()
  const totalSpent = calculateTotalSpent()
  const remaining = calculateRemaining()
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Budgets</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and control all marketing budgets</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${totalBudget.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${totalSpent.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{spentPercentage}% used</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${remaining.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{100 - parseFloat(spentPercentage)}% available</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Budgets</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {budgets.filter(b => b.status === 'active').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">of {budgets.length} total</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex gap-2">
          {['all', 'active', 'pending', 'approved', 'rejected', 'exhausted'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Budgets Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {budgets.map((budget) => {
              const amount = budget.total_budget || budget.amount || 0
              const spent = budget.spent || 0
              const remaining = amount - spent
              const spentPercent = amount > 0 ? (spent / amount * 100).toFixed(1) : 0
              
              return (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{budget.name || 'Unnamed Budget'}</div>
                    {budget.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{budget.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{budget.campaign_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${spent.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{spentPercent}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      remaining < 0 ? 'text-red-600' : remaining < amount * 0.1 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      ${remaining.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(budget.status)}`}>
                      {budget.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {budget.start_date && budget.end_date ? (
                      <div>
                        <div>{new Date(budget.start_date).toLocaleDateString()}</div>
                        <div className="text-xs">to {new Date(budget.end_date).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <DollarSign className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No budgets found</p>
          <p className="text-sm text-gray-500">Budgets will appear here once created</p>
        </div>
      )}
    </div>
  )
}

export default MarketingBudgets

