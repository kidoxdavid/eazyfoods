import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import api from '../services/api'

export default function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/customer/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSent(true)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Something went wrong'
      setError(typeof msg === 'string' ? msg : 'Failed to send reset email')
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col pt-safe">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900">Forgot Password</h1>
      </div>

      <div className="flex-1 scroll-content px-5">
        {sent ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-6">
              We sent password reset instructions to <span className="font-semibold text-gray-700">{email}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">Didn't receive it? Check your spam folder or try again.</p>
            <button onClick={() => setSent(false)}
              className="w-full h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 mb-3">
              Try a different email
            </button>
            <button onClick={() => navigate('/login')}
              className="w-full h-12 rounded-xl bg-primary-600 text-white text-sm font-semibold">
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-10">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reset your password</h2>
            <p className="text-sm text-gray-500 mb-8">Enter the email address linked to your account and we'll send you a reset link.</p>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />

            <button type="submit" disabled={loading || !email.trim()}
              className="w-full h-12 mt-6 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => navigate('/login')}
              className="w-full h-12 mt-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
