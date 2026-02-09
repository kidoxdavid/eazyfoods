import { useEffect, useState } from 'react'
import api from '../services/api'
import { Tag, CheckCircle, XCircle, ToggleLeft, ToggleRight, Trash2, Calendar, Download } from 'lucide-react'
import Pagination from '../components/Pagination'

const Promotions = () => {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchPromotions()
  }, [statusFilter, currentPage])

  const fetchPromotions = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      
      const response = await api.get('/admin/promotions', { params })
      const promotionsData = Array.isArray(response.data) ? response.data : []
      setPromotions(promotionsData)
      setTotalPages(Math.ceil(promotionsData.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
      setPromotions([]) // Set to empty array on error
      alert('Failed to load promotions. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (promoId) => {
    try {
      await api.put(`/admin/promotions/${promoId}/approve`)
      alert('Promotion approved successfully')
      fetchPromotions()
    } catch (error) {
      alert('Failed to approve promotion')
    }
  }

  const handleReject = async (promoId) => {
    if (!confirm('Are you sure you want to reject this promotion?')) return
    try {
      await api.put(`/admin/promotions/${promoId}/reject`)
      alert('Promotion rejected successfully')
      fetchPromotions()
    } catch (error) {
      alert('Failed to reject promotion')
    }
  }

  const handleToggleActive = async (promoId) => {
    try {
      await api.put(`/admin/promotions/${promoId}/toggle-active`)
      fetchPromotions()
    } catch (error) {
      alert('Failed to update promotion status')
    }
  }

  const handleDelete = async (promoId) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return
    try {
      await api.delete(`/admin/promotions/${promoId}`)
      alert('Promotion deleted successfully')
      fetchPromotions()
    } catch (error) {
      alert('Failed to delete promotion')
    }
  }

  const handleExport = () => {
    if (!Array.isArray(promotions) || promotions.length === 0) {
      alert('No promotions to export')
      return
    }
    
    const headers = ['Name', 'Vendor', 'Discount Type', 'Discount Value', 'Status', 'Start Date', 'End Date']
    const rows = promotions.map(promo => [
      promo.name || 'N/A',
      promo.vendor_name || 'N/A',
      promo.discount_type || 'percentage',
      promo.discount_value || 0,
      promo.status || 'active',
      promo.start_date ? new Date(promo.start_date).toLocaleDateString() : 'N/A',
      promo.end_date ? new Date(promo.end_date).toLocaleDateString() : 'N/A'
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `promotions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
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
          <h1 className="text-3xl font-bold text-gray-900">Promotions</h1>
          <p className="text-gray-600 mt-1">Manage platform promotions and discounts</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive/Expired</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promotion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(promotions) && promotions.map((promo) => (
              <tr key={promo.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{promo.name}</div>
                  {promo.description && (
                    <div className="text-xs text-gray-500 mt-1">{promo.description.substring(0, 50)}...</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{promo.vendor_name || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {promo.promotion_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {promo.discount_value && (
                    <div className="text-sm text-gray-900">
                      {promo.discount_type === 'percentage' 
                        ? `${promo.discount_value}%`
                        : `$${promo.discount_value}`
                      }
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    <div>{new Date(promo.start_date).toLocaleDateString()}</div>
                    <div>to {new Date(promo.end_date).toLocaleDateString()}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {promo.approval_status === 'pending' && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
                    )}
                    {promo.approval_status === 'approved' && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Approved</span>
                    )}
                    {promo.approval_status === 'rejected' && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>
                    )}
                    {/* Check if expired first */}
                    {promo.is_expired || (promo.end_date && new Date(promo.end_date) < new Date()) ? (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full block">Expired</span>
                    ) : promo.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full block">Active</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full block">Inactive</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {promo.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(promo.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(promo.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleToggleActive(promo.id)}
                      className={promo.is_active ? "text-green-600 hover:text-green-900" : "text-gray-400 hover:text-gray-600"}
                      title={promo.is_active ? "Deactivate" : "Activate"}
                    >
                      {promo.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}

export default Promotions

