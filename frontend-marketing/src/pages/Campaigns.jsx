import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Megaphone, Plus, Calendar, DollarSign, TrendingUp, Edit, Eye } from 'lucide-react'
import { formatDateTime } from '../utils/format'

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      if (statusFilter !== 'all') {
        params.status_filter = statusFilter
      }
      const response = await api.get('/admin/marketing/campaigns', { params })
      setCampaigns(response.data || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
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
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your marketing campaigns</p>
        </div>
        <Link
          to="/campaigns/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'draft', 'scheduled', 'active', 'paused', 'completed'].map((status) => (
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

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>
              <Link
                to={`/campaigns/${campaign.id}`}
                className="text-primary-600 hover:text-primary-700"
              >
                <Eye className="h-5 w-5" />
              </Link>
            </div>

            {campaign.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Megaphone className="h-4 w-4 mr-2" />
                <span className="capitalize">{campaign.campaign_type}</span>
              </div>
              {campaign.start_date && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Starts: {formatDateTime(campaign.start_date)}</span>
                </div>
              )}
              {campaign.budget && (
                <div className="flex items-center text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>Budget: ${parseFloat(campaign.budget).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex gap-2">
              <Link
                to={`/campaigns/${campaign.id}`}
                className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Megaphone className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No campaigns found</p>
          <Link
            to="/campaigns/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Campaign
          </Link>
        </div>
      )}
    </div>
  )
}

export default Campaigns

