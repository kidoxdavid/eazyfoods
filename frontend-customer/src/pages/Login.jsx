import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { LogIn, Eye, EyeOff, MailWarning, CheckCircle } from 'lucide-react'

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

const NativeGoogleSignIn = ({ onSuccess, onError }) => {
  const handlePress = async () => {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      await GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      })
      const user = await GoogleAuth.signIn()
      const idToken = user?.authentication?.idToken
      if (!idToken) throw new Error('No ID token returned')
      onSuccess(idToken)
    } catch (err) {
      if (err?.message !== 'The user canceled the sign-in flow.') onError(err)
    }
  }
  return (
    <button
      type="button"
      onClick={handlePress}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
    >
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
      Sign in with Google
    </button>
  )
}

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
      await login(email, password)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail
      // Backend returns 403 + {code: 'email_not_verified'} when email not verified
      if (
        err.response?.status === 403 &&
        (typeof detail === 'object' ? detail?.code : detail) === 'email_not_verified'
      ) {
        const unverified = (typeof detail === 'object' ? detail?.email : null) || email
        setUnverifiedEmail(unverified)
        localStorage.setItem('email_unverified', unverified)
      } else {
        setError(
          typeof detail === 'string'
            ? detail
            : detail?.message || 'Login failed. Please check your credentials.'
        )
      }
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

          {(googleClientId || isNative) && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
          )}
          {(googleClientId || isNative) && (
            <div className="flex justify-center">
              {isNative ? (
                <NativeGoogleSignIn
                  onSuccess={async (idToken) => {
                    setError('')
                    setLoading(true)
                    try {
                      await loginWithGoogle(idToken)
                      navigate('/')
                    } catch (err) {
                      setError(err.response?.data?.detail || 'Google sign-in failed.')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  onError={(err) => setError(`Google sign-in failed: ${err?.message || err?.error || JSON.stringify(err) || 'unknown error'}`)}
                />
              ) : (
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
                onError={() => setError('Google sign-in was cancelled or failed.')}
                theme="outline"
                size="large"
                text="signin_with"
              />
              )}
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

