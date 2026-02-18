import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification link.')
      return
    }
    api.get('/customer/auth/verify-email', { params: { token } })
      .then(() => {
        setStatus('success')
        setMessage('Email verified. You can now log in.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.detail || err.message || 'Verification failed. The link may have expired.')
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nude-50 to-nude-100 px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Email verified</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/login" className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Log in</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Verification failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/signup" className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Sign up again</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
