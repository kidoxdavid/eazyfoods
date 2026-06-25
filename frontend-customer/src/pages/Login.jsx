import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { LogIn, Eye, EyeOff, MailWarning, CheckCircle } from 'lucide-react'

const Login = () => {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ForgotComponent, setForgotComponent] = useState(null)
  const [ResetComponent, setResetComponent] = useState(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState(() => localStorage.getItem('email_unverified') || '')
  const [resendStatus, setResendStatus] = useState('') // '' | 'sending' | 'sent' | 'error'
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

  const handleResend = async () => {
    if (!unverifiedEmail || resendStatus === 'sending') return
    setResendStatus('sending')
    try {
      await api.post('/customer/auth/resend-verification', { email: unverifiedEmail })
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  const showForgot = searchParams.get('forgot') === '1'
  const resetToken = searchParams.get('token')

  useEffect(() => {
    if (showForgot && !ForgotComponent) {
      import('./ForgotPassword').then((m) => setForgotComponent(() => m.default))
    }
  }, [showForgot, ForgotComponent])

  useEffect(() => {
    if (resetToken && !ResetComponent) {
      import('./ResetPassword').then((m) => setResetComponent(() => m.default))
    }
  }, [resetToken, ResetComponent])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setUnverifiedEmail('')
    setResendStatus('')

    try {
      const data = await login(email, password)
      if (data?.is_email_verified === false) {
        setUnverifiedEmail(email)
        // Stay on login page to show the verification banner
        return
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (showForgot && ForgotComponent) return <ForgotComponent />
  if (resetToken && ResetComponent) return <ResetComponent />
  if ((showForgot && !ForgotComponent) || (resetToken && !ResetComponent)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nude-50 to-nude-100">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nude-50 to-nude-100 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">eazyfoods</h1>
          <h2 className="text-xl text-gray-600">Welcome Back</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Email verification required banner */}
          {unverifiedEmail && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
              <div className="flex items-start gap-3">
                <MailWarning className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">Please verify your email</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    We sent a verification link to <strong>{unverifiedEmail}</strong>. Check your inbox (and spam folder).
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {resendStatus === 'sent' ? (
                      <span className="flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="h-4 w-4" /> Sent! Check your inbox.
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendStatus === 'sending'}
                        className="text-xs text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
                      >
                        {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                      </button>
                    )}
                    {resendStatus === 'error' && (
                      <span className="text-xs text-red-600">Failed to send. Try again.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </>
            )}
          </button>

          {googleClientId && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
          )}
          {googleClientId && (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setError('')
                  setLoading(true)
                  try {
                    await loginWithGoogle(credentialResponse.credential)
                    navigate('/')
                  } catch (err) {
                    setError(err.response?.data?.detail || 'Google sign-in failed.')
                  } finally {
                    setLoading(false)
                  }
                }}
                onError={() => {
                  setError('Google sign-in was cancelled or failed.')
                }}
                theme="outline"
                size="large"
                text="signin_with"
              />
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login

