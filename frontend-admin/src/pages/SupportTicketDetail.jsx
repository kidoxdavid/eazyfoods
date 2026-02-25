import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { MessageSquare, ArrowLeft, User, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const SupportTicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTicket()
  }, [id])

  const fetchTicket = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/support/${id}`)
      setTicket(response.data)
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
      alert(error.response?.data?.detail || 'Failed to load ticket')
      navigate('/support')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true)
    try {
      await api.put(`/admin/support/${id}/status`, { status: newStatus })
      setTicket((prev) => (prev ? { ...prev, status: newStatus } : null))
    } catch (error) {
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleAssign = async () => {
    const assignedTo = prompt('Enter admin name to assign ticket to:')
    if (!assignedTo) return
    setUpdating(true)
    try {
      await api.put(`/admin/support/${id}/assign`, { assigned_to: assignedTo })
      setTicket((prev) => (prev ? { ...prev, assigned_to: assignedTo, status: prev.status === 'open' ? 'in_progress' : prev.status } : null))
    } catch (error) {
      alert('Failed to assign ticket')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!ticket) return null

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  }
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/support')}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Support Ticket</h1>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{ticket.subject}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[ticket.status] || 'bg-gray-100'}`}>
                  {ticket.status}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[ticket.priority] || 'bg-gray-100'}`}>
                  {ticket.priority}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {ticket.message_type === 'customer' ? 'Customer' : 'Vendor'}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <div>Created: {new Date(ticket.created_at).toLocaleString()}</div>
              {ticket.updated_at && <div>Updated: {new Date(ticket.updated_at).toLocaleString()}</div>}
              {ticket.resolved_at && <div>Resolved: {new Date(ticket.resolved_at).toLocaleString()}</div>}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">From</h3>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {ticket.message_type === 'customer'
                  ? (ticket.customer_name || 'Customer')
                  : (ticket.vendor_name || 'Vendor')}
              </span>
              {ticket.customer_email && (
                <span className="text-gray-500">({ticket.customer_email})</span>
              )}
            </div>
            {ticket.vendor_name && ticket.message_type === 'customer' && (
              <p className="text-sm text-gray-500 mt-1">Regarding vendor: {ticket.vendor_name}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Message</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap border border-gray-200">
              {ticket.message}
            </div>
          </div>

          {ticket.attachment_url && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Attachment</h3>
              <a
                href={ticket.attachment_url.startsWith('http') ? ticket.attachment_url : `${window.location.origin}${ticket.attachment_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline text-sm"
              >
                View / download attached file
              </a>
            </div>
          )}

          {ticket.assigned_to && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned to</h3>
              <p className="text-gray-900">{ticket.assigned_to}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            {ticket.status === 'open' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={updating}
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <Clock className="h-4 w-4" />
                Mark In Progress
              </button>
            )}
            {ticket.status !== 'resolved' && (
              <button
                onClick={() => handleStatusUpdate('resolved')}
                disabled={updating}
                className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Resolved
              </button>
            )}
            {!ticket.assigned_to && (
              <button
                onClick={handleAssign}
                disabled={updating}
                className="inline-flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                <User className="h-4 w-4" />
                Assign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportTicketDetail
