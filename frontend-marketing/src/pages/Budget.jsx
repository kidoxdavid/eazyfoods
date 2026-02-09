import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { DollarSign, Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

const Budget = () => {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/budgets', { params: { limit: 1000 } })
      const budgets = response.data || []
      // Transform data to match frontend format
      setBudgets(budgets.map(budget => ({
        ...budget,
        period: `${new Date(budget.start_date).toLocaleDateString()} - ${new Date(budget.end_date).toLocaleDateString()}`,
        status: budget.spent / budget.total_budget > 0.9 ? 'warning' : 
                budget.spent / budget.total_budget > 1 ? 'over_budget' : 'on_track'
      })))
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'over_budget': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getSpentPercentage = (spent, total) => {
    return (spent / total) * 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your marketing budgets</p>
        </div>
        <Link
          to="/budget/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Budget
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-xs text-gray-500 mt-1">
                {getSpentPercentage(totalSpent, totalBudget).toFixed(1)}% of budget
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${totalRemaining.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="space-y-4">
        {budgets.map((budget) => {
          const spentPercentage = getSpentPercentage(budget.spent, budget.total_budget)
          return (
            <div key={budget.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                    {budget.status === 'warning' && (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{budget.period}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  budget.status === 'on_track' ? 'bg-green-100 text-green-800' :
                  budget.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {budget.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Spent: ${budget.spent.toLocaleString()}</span>
                  <span className="text-gray-600">Budget: ${budget.total_budget.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      spentPercentage > 90 ? 'bg-red-500' :
                      spentPercentage > 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{spentPercentage.toFixed(1)}% spent</span>
                  <span>${budget.remaining.toLocaleString()} remaining</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Budget period
                </div>
                <Link
                  to={`/budget/${budget.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <DollarSign className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No budgets created yet</p>
          <Link
            to="/budget/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Budget
          </Link>
        </div>
      )}
    </div>
  )
}

export default Budget

