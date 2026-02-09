import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vendors from './pages/Vendors'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import VendorDetail from './pages/VendorDetail'
import CustomerDetail from './pages/CustomerDetail'
import ProductDetail from './pages/ProductDetail'
import Analytics from './pages/Analytics'
import Reviews from './pages/Reviews'
import Support from './pages/Support'
import Settings from './pages/Settings'
import ActivityLogs from './pages/ActivityLogs'
import AdminUsers from './pages/AdminUsers'
import Promotions from './pages/Promotions'
import Drivers from './pages/Drivers'
import DriverDetail from './pages/DriverDetail'
import Deliveries from './pages/Deliveries'
import Chefs from './pages/Chefs'
import ChefDetail from './pages/ChefDetail'
import Marketing from './pages/Marketing'
import MarketingPendingApprovals from './pages/MarketingPendingApprovals'
import MarketingControl from './pages/MarketingControl'
import MarketingCampaigns from './pages/MarketingCampaigns'
import MarketingAds from './pages/MarketingAds'
import MarketingBudgets from './pages/MarketingBudgets'
import Barcode from './pages/Barcode'
import Chat from './pages/Chat'
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
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="chefs" element={<Chefs />} />
        <Route path="chefs/:id" element={<ChefDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/:id" element={<DriverDetail />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="marketing/control" element={<MarketingControl />} />
        <Route path="marketing/campaigns" element={<MarketingCampaigns />} />
        <Route path="marketing/ads" element={<MarketingAds />} />
        <Route path="marketing/budgets" element={<MarketingBudgets />} />
        <Route path="marketing/pending-approvals" element={<MarketingPendingApprovals />} />
        <Route path="barcode" element={<Barcode />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="support" element={<Support />} />
        <Route path="chat" element={<Chat />} />
        <Route path="activity" element={<ActivityLogs />} />
        <Route path="admin-users" element={<AdminUsers />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
