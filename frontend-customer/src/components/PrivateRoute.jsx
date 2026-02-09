import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Check token (user might be null if API call failed, but token is still valid)
  const hasToken = token || localStorage.getItem('token')
  
  if (!hasToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default PrivateRoute

