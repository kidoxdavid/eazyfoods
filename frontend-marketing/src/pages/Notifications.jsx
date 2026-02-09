import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Bell, Plus, Smartphone, MessageSquare, Send, CheckCircle } from 'lucide-react'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/notifications', { params: { limit: 1000 } })
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'sms': return <MessageSquare className="h-5 w-5" />
      case 'push': return <Smartphone className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
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
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Send SMS and Push notifications</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/notifications/sms/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Send SMS
          </Link>
          <Link
            to="/notifications/push/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Smartphone className="h-4 w-4" />
            Send Push
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total SMS Sent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notifications.filter(n => n.type === 'sms' && n.status === 'sent').reduce((sum, n) => sum + n.recipients, 0).toLocaleString()}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Push Notifications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notifications.filter(n => n.type === 'push').length}
              </p>
            </div>
            <Smartphone className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notifications.filter(n => n.status === 'scheduled').length}
              </p>
            </div>
            <Send className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                {getTypeIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                        notification.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.status}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full uppercase">
                        {notification.type}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{notification.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Recipients:</span>
                    <span>{notification.recipients.toLocaleString()}</span>
                  </div>
                  {notification.status === 'sent' && notification.sent_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Sent: {new Date(notification.sent_at).toLocaleString()}</span>
                    </div>
                  )}
                  {notification.status === 'scheduled' && notification.scheduled_at && (
                    <div className="flex items-center gap-1">
                      <span>Scheduled: {new Date(notification.scheduled_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bell className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No notifications sent yet</p>
          <Link
            to="/notifications/sms/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Send Your First Notification
          </Link>
        </div>
      )}
    </div>
  )
}

export default Notifications

