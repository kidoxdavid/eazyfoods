import { useEffect, useState } from 'react'
import api from '../services/api'
import { Megaphone, CheckCircle, XCircle, Pause, Play, Trash2, Edit, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

const MarketingCampaigns = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  const fetchCampaigns = async () => {
    try {
      const params = { limit: 1000 }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      const response = await api.get('/admin/marketing/campaigns', { params })
      setCampaigns(response.data || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${id}/admin-approve`)
      fetchCampaigns()
    } catch (error) {
      alert('Failed to approve campaign')
    }
  }

  const handlePause = async (id) => {
    try {
      await api.put(`/admin/marketing/admin/campaigns/${id}/admin-pause`)
      fetchCampaigns()
    } catch (error) {
      alert('Failed to pause campaign')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      await api.delete(`/admin/marketing/admin/campaigns/${id}/admin-delete`)
      fetchCampaigns()
    } catch (error) {
      alert('Failed to delete campaign')
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
          <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
          <p className="text-sm text-gray-600 mt-1">Control and manage all marketing campaigns</p>
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'paused', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
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

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                    {campaign.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{campaign.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 capitalize">{campaign.campaign_type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    campaign.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${(campaign.budget || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {campaign.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(campaign.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Approve"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => handlePause(campaign.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Pause"
                      >
                        <Pause className="h-5 w-5" />
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleApprove(campaign.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Activate"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Megaphone className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No campaigns found</p>
        </div>
      )}
    </div>
  )
}

export default MarketingCampaigns

