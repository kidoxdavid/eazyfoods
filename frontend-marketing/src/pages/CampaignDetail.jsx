import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Edit, Calendar, DollarSign, Target, TrendingUp } from 'lucide-react'
import { formatDateTime } from '../utils/format'

const CampaignDetail = () => {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      const response = await api.get(`/admin/marketing/campaigns/${id}`)
      setCampaign(response.data)
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
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

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Campaign not found</p>
        <Link to="/campaigns" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Campaigns
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/campaigns" className="text-primary-600 hover:text-primary-700 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.name}</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              campaign.status === 'active' ? 'bg-green-100 text-green-800' :
              campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {campaign.status}
            </span>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>

        {campaign.description && (
          <p className="text-gray-700 mb-6">{campaign.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">{campaign.start_date ? formatDateTime(campaign.start_date) : 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{campaign.end_date ? formatDateTime(campaign.end_date) : 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Budget</p>
              <p className="font-medium">${parseFloat(campaign.budget || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Spent</p>
              <p className="font-medium">${parseFloat(campaign.spent || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CampaignDetail

