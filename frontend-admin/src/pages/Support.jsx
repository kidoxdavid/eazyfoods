import { useEffect, useState } from 'react'
import api from '../services/api'
import { MessageSquare, AlertCircle, CheckCircle, Clock, User, Download } from 'lucide-react'
import Pagination from '../components/Pagination'

const Support = () => {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchTickets()
    fetchStats()
  }, [statusFilter, priorityFilter, currentPage])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20
      }
      if (statusFilter !== 'all') params.status_filter = statusFilter
      if (priorityFilter !== 'all') params.priority_filter = priorityFilter
      
      const response = await api.get('/admin/support', { params })
      console.log('Support tickets response:', response.data)
      const ticketsData = Array.isArray(response.data) ? response.data : []
      console.log('Processed tickets:', ticketsData.length)
      setTickets(ticketsData)
      // Calculate total pages based on actual data length for now
      // In production, the API should return total count
      setTotalPages(Math.ceil(ticketsData.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      setTickets([]) // Set to empty array on error
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to load support tickets'
      alert(`Failed to load support tickets: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/support/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch support stats:', error)
    }
  }

  const handleStatusUpdate = async (ticketId, newStatus) => {
    try {
      await api.put(`/admin/support/${ticketId}/status`, { status: newStatus })
      alert('Ticket status updated successfully')
      fetchTickets()
      fetchStats()
    } catch (error) {
      alert('Failed to update ticket status')
    }
  }

  const handleAssign = async (ticketId) => {
    const assignedTo = prompt('Enter admin name to assign ticket to:')
    if (!assignedTo) return
    
    try {
      await api.put(`/admin/support/${ticketId}/assign`, { assigned_to: assignedTo })
      alert('Ticket assigned successfully')
      fetchTickets()
    } catch (error) {
      alert('Failed to assign ticket')
    }
  }

  const handleExport = () => {
    if (!Array.isArray(tickets) || tickets.length === 0) {
      alert('No tickets to export')
      return
    }
    
    const headers = ['ID', 'Subject', 'Status', 'Priority', 'From', 'Type', 'Created At', 'Updated At']
    const rows = tickets.map(ticket => [
      ticket.id?.slice(0, 8) || 'N/A',
      ticket.subject || 'N/A',
      ticket.status || 'open',
      ticket.priority || 'medium',
      ticket.message_type === 'customer' ? (ticket.customer_name || 'Customer') : (ticket.vendor_name || 'Vendor'),
      ticket.message_type === 'customer' ? 'Customer' : 'Vendor',
      new Date(ticket.created_at).toLocaleDateString(),
      new Date(ticket.updated_at).toLocaleDateString()
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `support_tickets_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-1">Manage support tickets from vendors and customers</p>
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total Tickets</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_tickets}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Open</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.open_tickets}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved_tickets}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!loading && Array.isArray(tickets) && tickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No support tickets found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {statusFilter !== 'all' || priorityFilter !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'Support tickets from vendors and customers will appear here'}
                  </p>
                </td>
              </tr>
            ) : (
              Array.isArray(tickets) && tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                  <div className="text-sm text-gray-500 mt-1">{ticket.message?.substring(0, 100)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {ticket.message_type === 'customer' 
                      ? (ticket.customer_name || 'Customer')
                      : (ticket.vendor_name || 'Vendor')
                    }
                  </div>
                  {ticket.message_type === 'customer' && ticket.customer_email && (
                    <div className="text-xs text-gray-500">{ticket.customer_email}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    ticket.message_type === 'customer' 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {ticket.message_type === 'customer' ? 'Customer' : 'Vendor'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[ticket.priority] || 'bg-gray-100 text-gray-800'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{ticket.assigned_to || 'Unassigned'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleStatusUpdate(ticket.id, 'in_progress')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Start Progress"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    )}
                    {ticket.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusUpdate(ticket.id, 'resolved')}
                        className="text-green-600 hover:text-green-900"
                        title="Resolve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {!ticket.assigned_to && (
                      <button
                        onClick={() => handleAssign(ticket.id)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Assign"
                      >
                        <User className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              ))
            )}
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

export default Support

