import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Users, Plus, Filter, Target, Mail, MapPin, Calendar } from 'lucide-react'

const Audiences = () => {
  const [audiences, setAudiences] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAudiences()
  }, [])

  const fetchAudiences = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/audiences', { params: { limit: 1000 } })
      setAudiences(response.data || [])
    } catch (error) {
      console.error('Failed to fetch audiences:', error)
      setAudiences([])
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Audiences</h1>
          <p className="text-gray-600 mt-1">Create and manage customer segments for targeted marketing</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/segments"
            className="px-4 py-2 bg-white text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Segment Builder
          </Link>
          <Link
            to="/audiences/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Audience
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audiences.map((audience) => (
          <div key={audience.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{audience.name}</h3>
                  <p className="text-sm text-gray-500">{audience.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Audience Size</span>
                <span className="text-lg font-bold text-gray-900">{audience.size.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Segmented</span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex gap-2">
                <Link
                  to={`/audiences/${audience.id}`}
                  className="flex-1 text-center px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"
                >
                  View Details
                </Link>
                <Link
                  to={`/campaigns?audience=${audience.id}`}
                  className="flex-1 text-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Use in Campaign
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {audiences.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No audiences created yet</p>
          <Link
            to="/audiences/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Audience
          </Link>
        </div>
      )}
    </div>
  )
}

export default Audiences

