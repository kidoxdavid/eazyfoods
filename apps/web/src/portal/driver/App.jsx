import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import AvailableDeliveries from './pages/AvailableDeliveries'
import MyDeliveries from './pages/MyDeliveries'
import ActiveDelivery from './pages/ActiveDelivery'
import DeliveryHistory from './pages/DeliveryHistory'
import Earnings from './pages/Earnings'
import { setArea } from '../shared/client'
import Statement from '../shared/pages/Statement'
import Performance from './pages/Performance'
import Ratings from './pages/Ratings'
import Support from './pages/Support'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Documentation from './pages/Documentation'
import Layout from './components/Layout'

const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
)

/** Signed in, and has applied to drive (a new account that has not applied yet is asked to). */
function Guard({ children }) {
  const { account, driver, loading } = useAuth()
  if (loading) return <Spinner />
  if (!account) return <Navigate to="/signin" replace />
  if (!driver) return <Signup />
  return children
}

setArea('driver')

export default function App() {
  return (
    <AuthProvider>
      <Router basename="/driver">
        <Routes>
          <Route path="/signin" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="available-deliveries" element={<AvailableDeliveries />} />
            <Route path="available" element={<Navigate to="/available-deliveries" replace />} />
            <Route path="my-deliveries" element={<MyDeliveries />} />
            <Route path="deliveries/:deliveryId/track" element={<ActiveDelivery />} />
            <Route path="delivery-history" element={<DeliveryHistory />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="statement" element={<Statement kind="driver" />} />
            <Route path="performance" element={<Performance />} />
            <Route path="ratings" element={<Ratings />} />
            <Route path="support" element={<Support />} />
            <Route path="chat" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
            <Route path="documentation" element={<Documentation />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}
