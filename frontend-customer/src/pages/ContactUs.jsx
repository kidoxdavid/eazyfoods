import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Mail, MessageSquare, Send, AlertCircle, CheckCircle, Sparkles, TrendingUp, Users } from 'lucide-react'
import PageBanner from '../components/PageBanner'

const ContactUs = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!token) {
      setMessage({ type: 'error', text: 'Please login to send a message' })
      setTimeout(() => {
        navigate('/login')
      }, 2000)
      return
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await api.post('/customer/support/contact', {
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority
      })

      setMessage({ type: 'success', text: response.data.message || 'Your message has been sent successfully! We\'ll get back to you soon.' })
      setFormData({ subject: '', message: '', priority: 'normal' })
    } catch (error) {
      console.error('Failed to submit message:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to send message. Please try again.' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Banner Header with Ad Support */}
        <PageBanner
          title="Contact Us"
          subtitle="Have a question or need help? We're here to assist you!"
          placement="contact_top_banner"
          defaultContent={
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Contact Us
                </h1>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
                Have a question or need help? We're here to assist you! Reach out and we'll get back to you soon.
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Quick Support</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">24/7 Help</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Friendly Team</span>
                </div>
              </div>
            </div>
          }
        />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          {!token && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-900">Login Required</p>
                  <p className="text-xs text-yellow-700">
                    Please <button onClick={() => navigate('/login')} className="underline font-medium">login</button> to send us a message.
                  </p>
                </div>
              </div>
            </div>
          )}

          {message.text && (
            <div className={`p-3 rounded-lg flex items-start ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-xs">{message.text}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="subject" className="block text-xs font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is your message about?"
                    required
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={submitting || !token}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="priority" className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={submitting || !token}
                >
                  <option value="low">Low - General inquiry</option>
                  <option value="normal">Normal - Standard request</option>
                  <option value="high">High - Urgent matter</option>
                  <option value="urgent">Urgent - Critical issue</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please provide details about your inquiry..."
                    rows={6}
                    required
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    disabled={submitting || !token}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ subject: '', message: '', priority: 'normal' })
                    setMessage({ type: '', text: '' })
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting || !token}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Email Support</h3>
                <p className="text-xs text-gray-600 break-all">support@eazyfoods.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Response Time</h3>
                <p className="text-xs text-gray-600">We typically respond within 24 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">24/7 Support</h3>
                <p className="text-xs text-gray-600">We're always here to help</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
      </div>
    )
  }

export default ContactUs

