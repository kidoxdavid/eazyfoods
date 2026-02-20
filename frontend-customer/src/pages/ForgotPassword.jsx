import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Mail, ArrowLeft } from 'lucide-react'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/customer/auth/forgot-password', { email: email.trim() })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nude-50 to-nude-100 px-4 py-12">
        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600 text-sm">
            If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nude-50 to-nude-100 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">eazyfoods</h1>
          <h2 className="text-xl text-gray-600">Forgot password</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Send reset link
              </>
            )}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword
