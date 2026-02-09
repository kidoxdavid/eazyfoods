import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, Eye, Download, Trash2 } from 'lucide-react'
import Pagination from '../components/Pagination'

const Customers = () => {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchCustomers()
  }, [search, currentPage])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (search) params.search = search
      
      const response = await api.get('/admin/customers', { params })
      const customersData = Array.isArray(response.data) ? response.data : []
      setCustomers(customersData)
      setTotalPages(Math.ceil(customersData.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      setCustomers([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!Array.isArray(customers) || customers.length === 0) {
      alert('No customers to export')
      return
    }
    
    const headers = ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Joined']
    const rows = customers.map(customer => [
      `${customer.first_name} ${customer.last_name}`,
      customer.email,
      customer.phone || 'N/A',
      customer.order_count,
      `$${parseFloat(customer.total_spent).toFixed(2)}`,
      new Date(customer.created_at).toLocaleDateString()
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return
    }
    try {
      await api.delete(`/admin/customers/${customerId}`)
      alert('Customer deleted successfully')
      fetchCustomers()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete customer')
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage all customers on the platform</p>
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

      {/* Search */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Customers Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(customers) && customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.email}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.phone || 'N/A'}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.order_count}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">${parseFloat(customer.total_spent).toFixed(2)}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden lg:inline">View</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      title="Delete customer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      {/* Customers Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {Array.isArray(customers) && customers.length > 0 ? (
          customers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{customer.email}</p>
                  <p className="text-sm text-gray-500">{customer.phone || 'No phone'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Orders</p>
                    <p className="text-sm font-medium text-gray-900">{customer.order_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Spent</p>
                    <p className="text-sm font-medium text-gray-900">${parseFloat(customer.total_spent).toFixed(2)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Joined</p>
                  <p className="text-sm text-gray-900">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="flex-1 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200 flex items-center justify-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center justify-center"
                    title="Delete customer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No customers found</p>
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

export default Customers

