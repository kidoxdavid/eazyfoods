import { useState } from 'react'
import api from '../services/api'
import { MessageSquare, Send, HelpCircle, Phone, Mail } from 'lucide-react'

const Support = () => {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject || !message) {
      alert('Please fill in all fields')
      return
    }

    try {
      setSending(true)
      // Note: This endpoint may need to be created on the backend
      await api.post('/driver/support', {
        subject,
        message
      })
      setSent(true)
      setSubject('')
      setMessage('')
      setTimeout(() => setSent(false), 5000)
    } catch (error) {
      console.error('Failed to send support request:', error)
      alert('Failed to send support request. Please try again or contact support directly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support</h1>
        <p className="text-gray-600 mt-1">Get help with your deliveries and account</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Contact Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone Support</p>
                <p className="text-sm text-gray-600">1-800-EAZY-FOOD</p>
                <p className="text-xs text-gray-500">Mon-Fri, 9 AM - 6 PM EST</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-600">drivers@eazyfoods.com</p>
                <p className="text-xs text-gray-500">Response within 24 hours</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Help */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Help</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 text-sm">How do I accept a delivery?</p>
              <p className="text-xs text-gray-600 mt-1">
                Go to "Available Deliveries" and click "Accept" on any order you want to deliver.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 text-sm">How do I update delivery status?</p>
              <p className="text-xs text-gray-600 mt-1">
                In "My Deliveries", use the action buttons to update status as you progress.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 text-sm">When do I get paid?</p>
              <p className="text-xs text-gray-600 mt-1">
                Earnings are processed weekly. Check the "Earnings" page for payment details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Form */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Send a Message
        </h2>
        {sent && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">Message sent successfully! We'll get back to you soon.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Support

