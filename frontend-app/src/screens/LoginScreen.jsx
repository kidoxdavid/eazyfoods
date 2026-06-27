import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function LoginScreen() {
  const { login, enterGuestMode } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [unverified, setUnverified] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setUnverified(false)
    try {
      await login(email.trim(), password)
      navigate('/home', { replace: true })
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (detail?.code === 'email_not_verified' || (typeof detail === 'string' && detail.includes('verify'))) {
        setUnverified(true)
      } else {
        showError(typeof detail === 'string' ? detail : 'Login failed. Check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    enterGuestMode()
    navigate('/home', { replace: true })
  }

  return (
    <div className="h-full flex flex-col bg-white pt-safe">
      {/* Branding header */}
      <div className="flex-shrink-0 bg-primary-600 px-6 pt-10 pb-10 text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🛒</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">EazyFoods</h1>
        <p className="text-primary-100 mt-1 text-sm">Taste of home, delivered.</p>
      </div>

      <div className="flex-1 px-6 pt-8 overflow-y-auto scroll-content">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
        <p className="text-gray-500 text-sm mb-6">Sign in to continue</p>

        {/* Unverified email notice */}
        {unverified && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <p className="font-semibold mb-1">Email not verified</p>
            <p>Check your inbox for a verification link, or{' '}
              <button className="underline font-semibold" onClick={() => navigate('/register')}>
                create a new account
              </button>.
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email" autoComplete="email" inputMode="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-primary-600 font-semibold">
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary-600 text-white font-bold text-base rounded-xl press-scale disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Guest bypass */}
        <button onClick={handleGuest}
          className="w-full py-3.5 border-2 border-gray-200 text-gray-700 font-semibold text-base rounded-xl press-scale">
          Browse without account
        </button>

        <p className="text-center text-sm text-gray-500 mt-6 pb-8">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary-600 font-semibold">Create one</Link>
        </p>
      </div>
    </div>
  )
}
