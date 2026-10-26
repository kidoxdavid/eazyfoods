import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { call, errText, getArea } from './client'

/** Each staff area has its own sign-in window and its own cookie, so signing in here never signs you out of another area. */
export default function StaffLogin({ title, subtitle }) {
  const area = getArea()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false)
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      await call('POST', '/auth/login', { email, password, area })
      const next = new URLSearchParams(window.location.search).get('next')
      window.location.href = next && next.startsWith(`/${area}`) ? next : `/${area}/`
    } catch (err) { setError(errText(err)) } finally { setBusy(false) }
  }
  const field = 'w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-3 sm:px-4 py-6 sm:py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-5 sm:p-8 rounded-xl shadow-lg">
        <div className="text-center"><h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">eazyfoods</h1><h2 className="text-lg sm:text-xl text-gray-600">{title}</h2>{subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>}</div>
        <form className="space-y-4" onSubmit={submit}>
          {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div><label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label><input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
          <div><label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative"><input id="password" name="password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-10`} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}</button></div></div>
          <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base font-medium"><LogIn className="h-4 w-4 sm:h-5 sm:w-5" /> {busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="text-center text-xs text-gray-600"><a href="/" className="hover:text-gray-900 underline">← Back to the shop</a></p>
      </div>
    </div>
  )
}
