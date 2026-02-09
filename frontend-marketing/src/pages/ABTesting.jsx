import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { FlaskConical, Plus, TrendingUp, BarChart3, CheckCircle, XCircle } from 'lucide-react'

const ABTesting = () => {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/ab-tests', { params: { limit: 1000 } })
      const tests = response.data || []
      // Transform data to match frontend format
      setTests(tests.map(test => ({
        ...test,
        variant_a: {
          name: test.variant_a_name,
          conversions: test.variant_a_conversions,
          conversion_rate: test.variant_a_conversion_rate
        },
        variant_b: {
          name: test.variant_b_name,
          conversions: test.variant_b_conversions,
          conversion_rate: test.variant_b_conversion_rate
        }
      })))
    } catch (error) {
      console.error('Failed to fetch tests:', error)
      setTests([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">A/B Testing</h1>
          <p className="text-gray-600 mt-1">Test different variations to optimize your marketing performance</p>
        </div>
        <Link
          to="/ab-testing/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Test
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tests.map((test) => (
          <div key={test.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FlaskConical className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                    {test.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{test.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{test.variant_a.name}</h4>
                  {test.winner === 'A' && <CheckCircle className="h-5 w-5 text-green-500" />}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversions:</span>
                    <span className="font-medium">{test.variant_a.conversions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-medium text-primary-600">{test.variant_a.conversion_rate}%</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{test.variant_b.name}</h4>
                  {test.winner === 'B' && <CheckCircle className="h-5 w-5 text-green-500" />}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversions:</span>
                    <span className="font-medium">{test.variant_b.conversions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-medium text-primary-600">{test.variant_b.conversion_rate}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to={`/ab-testing/${test.id}`}
                className="flex-1 text-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"
              >
                View Details
              </Link>
              {test.status === 'running' && (
                <button className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm font-medium">
                  Pause Test
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {tests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FlaskConical className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No A/B tests created yet</p>
          <Link
            to="/ab-testing/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Test
          </Link>
        </div>
      )}
    </div>
  )
}

export default ABTesting

