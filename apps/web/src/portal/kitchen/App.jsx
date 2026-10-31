import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { makeHttp } from '../http'
import Signup from '../chef/pages/Signup'

const { raw } = makeHttp('vendor')

/**
 * The kitchen site: its own address (/kitchen) for home chefs and restaurants to sign in or register.
 * It is the same account system as the vendor window (a kitchen account is signed in the same way); only the front door is separate.
 */
function KitchenLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await raw('POST', '/auth/login', { email, password, area: 'vendor' })
      const kind = await raw('GET', '/vendor/app-kind').catch(() => null)
      if (kind && !kind.kitchen) {
        await raw('POST', '/auth/logout', {}).catch(() => {})
        setError('This is a store account. Please sign in on the store site instead.'); return
      }
      window.location.href = '/vendor/'
    } catch (err) {
      setError(err.response?.data?.detail || 'Sign in failed. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-3 sm:px-4 py-6 sm:py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-5 sm:p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">eazyfoods</h1>
          <h2 className="text-lg sm:text-xl text-primary-700 font-semibold">Kitchen Portal</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">For home chefs and restaurants</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">{error}</div>}
          <div>
            <label htmlFor="kemail" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="kemail" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label htmlFor="kpass" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input id="kpass" name="password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {show ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 text-sm sm:text-base font-medium">
            <LogIn className="h-4 w-4 sm:h-5 sm:w-5" /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">New kitchen? <Link to="/signup" className="text-primary-700 hover:underline font-medium">Register your kitchen</Link></p>
        <p className="text-center text-xs text-gray-600">Selling groceries instead? <a href="/vendor/signin" className="underline hover:text-gray-900">Store sign-in</a> · <a href="/" className="underline hover:text-gray-900">Back to the shop</a></p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router basename="/kitchen">
      <Routes>
        <Route path="/signin" element={<KitchenLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </Router>
  )
}
