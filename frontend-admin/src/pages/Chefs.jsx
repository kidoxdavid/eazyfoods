import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, CheckCircle, XCircle, Eye, ChefHat } from 'lucide-react'

const Chefs = () => {
  const navigate = useNavigate()
  const [chefs, setChefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchChefs()
  }, [statusFilter, search])

  const fetchChefs = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'all') params.verification_status = statusFilter
      if (search) params.search = search
      
      const response = await api.get('/admin/chefs', { params })
      const chefsData = Array.isArray(response.data) ? response.data : []
      setChefs(chefsData)
    } catch (error) {
      console.error('Failed to fetch chefs:', error)
      setChefs([])
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (chefId) => {
    if (!confirm('Are you sure you want to verify this chef?')) return
    try {
      await api.put(`/admin/chefs/${chefId}/verify`)
      fetchChefs()
    } catch (error) {
      alert('Failed to verify chef')
    }
  }

  const handleReject = async (chefId) => {
    const notes = prompt('Enter rejection reason (optional):')
    if (notes === null) return
    try {
      await api.put(`/admin/chefs/${chefId}/reject`, { notes })
      fetchChefs()
    } catch (error) {
      alert('Failed to reject chef')
    }
  }

  const handleSuspend = async (chefId) => {
    if (!confirm('Are you sure you want to suspend this chef?')) return
    try {
      await api.put(`/admin/chefs/${chefId}/suspend`)
      fetchChefs()
    } catch (error) {
      alert('Failed to suspend chef')
    }
  }

  const handleActivate = async (chefId) => {
    try {
      await api.put(`/admin/chefs/${chefId}/activate`)
      fetchChefs()
    } catch (error) {
      alert('Failed to activate chef')
    }
  }

  const handleDeactivate = async (chefId) => {
    try {
      await api.put(`/admin/chefs/${chefId}/deactivate`)
      fetchChefs()
    } catch (error) {
      alert('Failed to deactivate chef')
    }
  }

  const getStatusBadge = (chef) => {
    if (chef.verification_status === 'verified') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Verified</span>
    } else if (chef.verification_status === 'pending') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
    } else if (chef.verification_status === 'rejected') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Rejected</span>
    } else if (chef.verification_status === 'suspended') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Suspended</span>
    }
    return null
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chefs</h1>
        <p className="text-gray-600 mt-1">Manage all chefs on the platform</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search chefs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Chefs Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chef</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuisines</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chefs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No chefs found
                  </td>
                </tr>
              ) : (
                chefs.map((chef) => (
                  <tr key={chef.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ChefHat className="h-8 w-8 text-primary-600 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {chef.chef_name || `${chef.first_name} ${chef.last_name}`}
                          </div>
                          <div className="text-sm text-gray-500">{chef.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {chef.cuisines?.slice(0, 2).map((cuisine, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                            {cuisine}
                          </span>
                        ))}
                        {chef.cuisines?.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{chef.cuisines.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {chef.city}, {chef.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(chef)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {chef.average_rating ? (
                        <div className="text-sm">
                          <span className="font-medium">{chef.average_rating.toFixed(1)}</span>
                          <span className="text-gray-500"> ({chef.total_reviews} reviews)</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No reviews</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/chefs/${chef.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {chef.verification_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(chef.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Verify"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleReject(chef.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {chef.verification_status === 'verified' && !chef.is_active && (
                          <button
                            onClick={() => handleActivate(chef.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                        {chef.is_active && (
                          <button
                            onClick={() => handleDeactivate(chef.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Deactivate"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                        {chef.verification_status === 'verified' && (
                          <button
                            onClick={() => handleSuspend(chef.id)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Suspend"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
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

export default Chefs

