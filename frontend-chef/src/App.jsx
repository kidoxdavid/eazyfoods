import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Reviews from './pages/Reviews'
import Gallery from './pages/Gallery'
import Ads from './pages/Ads'
import AdDesigner from './pages/AdDesigner'
import Analytics from './pages/Analytics'
import Chat from './pages/Chat'
import Support from './pages/Support'
import Cuisines from './pages/Cuisines'
import CuisineForm from './pages/CuisineForm'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Promotions from './pages/Promotions'
import Payouts from './pages/Payouts'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function App() {
  return (
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
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/ads" element={<Ads />} />
                    <Route path="/ads/new" element={<AdDesigner />} />
                    <Route path="/ads/:id/edit" element={<AdDesigner />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/cuisines" element={<Cuisines />} />
                    <Route path="/cuisines/new" element={<CuisineForm />} />
                    <Route path="/cuisines/:id/edit" element={<CuisineForm />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/promotions" element={<Promotions />} />
                    <Route path="/payouts" element={<Payouts />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

