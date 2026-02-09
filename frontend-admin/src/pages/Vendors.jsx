import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, CheckCircle, XCircle, Eye, Download } from 'lucide-react'
import Pagination from '../components/Pagination'

const Vendors = () => {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchVendors()
  }, [statusFilter, search, currentPage])

  const fetchVendors = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search) params.search = search
      
      const response = await api.get('/admin/vendors', { params })
      const vendorsData = Array.isArray(response.data) ? response.data : []
      setVendors(vendorsData)
      // Calculate total pages (assuming 20 items per page)
      setTotalPages(Math.ceil(vendorsData.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
      setVendors([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (vendorId) => {
    try {
      await api.put(`/admin/vendors/${vendorId}/activate`)
      fetchVendors()
    } catch (error) {
      alert('Failed to activate vendor')
    }
  }

  const handleDeactivate = async (vendorId) => {
    try {
      await api.put(`/admin/vendors/${vendorId}/deactivate`)
      fetchVendors()
    } catch (error) {
      alert('Failed to deactivate vendor')
    }
  }

  const handleVerify = async (vendorId) => {
    try {
      await api.put(`/admin/vendors/${vendorId}/verify`)
      fetchVendors()
    } catch (error) {
      alert('Failed to verify vendor')
    }
  }

  const handleExport = () => {
    if (!Array.isArray(vendors) || vendors.length === 0) {
      alert('No vendors to export')
      return
    }
    
    const headers = ['Business Name', 'Email', 'City', 'Status', 'Verification Status', 'Products', 'Revenue']
    const rows = vendors.map(vendor => [
      vendor.business_name,
      vendor.email,
      vendor.city,
      vendor.is_active ? 'Active' : 'Inactive',
      vendor.verification_status || 'pending',
      vendor.product_count || 0,
      `$${parseFloat(vendor.total_revenue || 0).toFixed(2)}`
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendors_${new Date().toISOString().split('T')[0]}.csv`
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage all vendors on the platform</p>
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
      <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending Verification</option>
          <option value="verified">Verified</option>
        </select>
      </div>

      {/* Vendors Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(vendors) && vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vendor.business_name}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{vendor.email}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{vendor.city}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {vendor.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>
                        )}
                        {vendor.verification_status === 'verified' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{vendor.product_count}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${parseFloat(vendor.total_revenue).toFixed(2)}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden lg:inline">View</span>
                        </button>
                        {!vendor.is_active && (
                          <button
                            onClick={() => handleActivate(vendor.id)}
                            className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                          >
                            Activate
                          </button>
                        )}
                        {vendor.is_active && (
                          <button
                            onClick={() => handleDeactivate(vendor.id)}
                            className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
                          >
                            Deactivate
                          </button>
                        )}
                        {vendor.verification_status !== 'verified' && (
                          <button
                            onClick={() => handleVerify(vendor.id)}
                            className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Vendors Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {Array.isArray(vendors) && vendors.length > 0 ? (
          vendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{vendor.business_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{vendor.email}</p>
                  <p className="text-sm text-gray-500">{vendor.city}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {vendor.is_active ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>
                  )}
                  {vendor.verification_status === 'verified' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Products</p>
                    <p className="text-sm font-medium text-gray-900">{vendor.product_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-medium text-gray-900">${parseFloat(vendor.total_revenue).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <button
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                    className="flex-1 sm:flex-none px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200 flex items-center justify-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  {!vendor.is_active && (
                    <button
                      onClick={() => handleActivate(vendor.id)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg border border-green-200"
                    >
                      Activate
                    </button>
                  )}
                  {vendor.is_active && (
                    <button
                      onClick={() => handleDeactivate(vendor.id)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                    >
                      Deactivate
                    </button>
                  )}
                  {vendor.verification_status !== 'verified' && (
                    <button
                      onClick={() => handleVerify(vendor.id)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No vendors found</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Vendors

