import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function RegisterScreen() {
  const { register } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 6) {
      showError('Please fill all fields (password min. 6 chars)')
      return
    }
    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/home', { replace: true })
    } catch (err) {
      showError(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white pt-safe">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900">Create Account</h1>
      </div>

      <div className="flex-1 px-6 pt-6 overflow-y-auto scroll-content">
        <p className="text-gray-500 text-sm mb-6">Join EazyFoods and get authentic African & Caribbean groceries delivered.</p>

        <form onSubmit={handle} className="space-y-4">
          {[
            { label: 'Full Name', value: name, set: setName, type: 'text', auto: 'name', placeholder: 'Your name' },
            { label: 'Email', value: email, set: setEmail, type: 'email', auto: 'email', placeholder: 'you@example.com', mode: 'email' },
          ].map(({ label, value, set, type, auto, placeholder, mode }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
              <input
                type={type} autoComplete={auto} inputMode={mode}
                value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                className="w-full h-12 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary-600 text-white font-bold text-base rounded-xl press-scale disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
