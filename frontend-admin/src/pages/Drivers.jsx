import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, CheckCircle, XCircle, Eye, Download, Truck } from 'lucide-react'
import Pagination from '../components/Pagination'

const Drivers = () => {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchDrivers()
  }, [statusFilter, verificationFilter, search, currentPage])

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      if (verificationFilter !== 'all') params.verification_filter = verificationFilter
      if (search) params.search = search
      
      const response = await api.get('/admin/drivers', { params })
      const driversData = Array.isArray(response.data) ? response.data : []
      setDrivers(driversData)
      setTotalPages(Math.ceil(driversData.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
      setDrivers([])
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (driverId, status) => {
    try {
      const notes = status === 'approved' ? 'Approved by admin' : 'Rejected by admin'
      await api.put(`/admin/drivers/${driverId}/verify?verification_status=${status}&verification_notes=${encodeURIComponent(notes)}`)
      alert(`Driver ${status} successfully`)
      fetchDrivers()
    } catch (error) {
      console.error('Failed to verify driver:', error)
      const errorMessage = error.response?.data?.detail || error.message || `Failed to ${status} driver`
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleToggleActive = async (driverId) => {
    try {
      await api.put(`/admin/drivers/${driverId}/toggle-active`)
      fetchDrivers()
    } catch (error) {
      alert('Failed to update driver status')
    }
  }

  const handleExport = () => {
    if (!Array.isArray(drivers) || drivers.length === 0) {
      alert('No drivers to export')
      return
    }
    
    const headers = ['Name', 'Email', 'Phone', 'Vehicle Type', 'Verification Status', 'Active', 'Total Deliveries', 'Earnings']
    const rows = drivers.map(driver => [
      `${driver.first_name} ${driver.last_name}`,
      driver.email,
      driver.phone,
      driver.vehicle_type || 'N/A',
      driver.verification_status,
      driver.is_active ? 'Yes' : 'No',
      driver.total_deliveries || 0,
      `$${parseFloat(driver.total_earnings || 0).toFixed(2)}`
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drivers_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Drivers</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage delivery drivers</p>
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
            placeholder="Search drivers..."
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
          <option value="active">Active & Available</option>
          <option value="inactive">Inactive</option>
          <option value="unavailable">Active but Unavailable</option>
        </select>
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
        >
          <option value="all">All Verification</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliveries</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(drivers) && drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {driver.first_name} {driver.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{driver.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.email}</div>
                      <div className="text-sm text-gray-500">{driver.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.vehicle_type || 'N/A'}</div>
                      {driver.license_plate && (
                        <div className="text-xs text-gray-500">{driver.license_plate}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        driver.verification_status === 'approved' ? 'bg-green-100 text-green-800' :
                        driver.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {driver.verification_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        driver.is_active && driver.is_available ? 'bg-green-100 text-green-800' : 
                        driver.is_active && !driver.is_available ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {driver.is_active && driver.is_available ? 'Active & Available' : 
                         driver.is_active && !driver.is_available ? 'Active (Unavailable)' :
                         'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.total_deliveries || 0}</div>
                      <div className="text-xs text-gray-500">{driver.completed_deliveries || 0} completed</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${parseFloat(driver.total_earnings || 0).toFixed(2)}
                      </div>
                      {driver.average_rating > 0 && (
                        <div className="text-xs text-gray-500">⭐ {parseFloat(driver.average_rating).toFixed(1)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/drivers/${driver.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {driver.verification_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(driver.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleVerify(driver.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No drivers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

export default Drivers

