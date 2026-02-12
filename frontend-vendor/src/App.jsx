import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Inventory from './pages/Inventory'
import Payouts from './pages/Payouts'
import Support from './pages/Support'
import Reviews from './pages/Reviews'
import Analytics from './pages/Analytics'
import Promotions from './pages/Promotions'
import Staff from './pages/Staff'
import Profile from './pages/Profile'
import Ads from './pages/Ads'
import AdDesigner from './pages/AdDesigner'
import Stores from './pages/Stores'
import Chat from './pages/Chat'
import Layout from './components/Layout'

const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

function App() {
  const app = (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/new" element={<ProductForm />} />
                    <Route path="/products/:id/edit" element={<ProductForm />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/deliveries" element={<Navigate to="/orders?tab=delivery" replace />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/promotions" element={<Promotions />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/payouts" element={<Payouts />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/staff" element={<Staff />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/ads" element={<Ads />} />
                    <Route path="/ads/new" element={<AdDesigner />} />
                    <Route path="/ads/:id/edit" element={<AdDesigner />} />
                    <Route path="/stores" element={<Stores />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
  return googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    : app
}

export default App

