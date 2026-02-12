import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import AvailableDeliveries from './pages/AvailableDeliveries'
import MyDeliveries from './pages/MyDeliveries'
import ActiveDelivery from './pages/ActiveDelivery'
import DeliveryHistory from './pages/DeliveryHistory'
import Earnings from './pages/Earnings'
import Performance from './pages/Performance'
import Ratings from './pages/Ratings'
import Support from './pages/Support'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import './index.css'

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return token ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="available-deliveries" element={<AvailableDeliveries />} />
        <Route path="my-deliveries" element={<MyDeliveries />} />
        <Route path="deliveries/:deliveryId/track" element={<ActiveDelivery />} />
        <Route path="delivery-history" element={<DeliveryHistory />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="performance" element={<Performance />} />
        <Route path="ratings" element={<Ratings />} />
        <Route path="support" element={<Support />} />
        <Route path="chat" element={<Chat />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

function App() {
  const app = (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider> : app
}

export default App

