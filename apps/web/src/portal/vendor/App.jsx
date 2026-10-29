import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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
import Documentation from './pages/Documentation'
import Ads from './pages/Ads'
import AdDesigner from './pages/AdDesigner'
import Stores from './pages/Stores'
import Chat from './pages/Chat'
import Layout from './components/Layout'
import Storefront from '../shared/pages/Storefront'
import Questions from '../shared/pages/Questions'
import Reports from '../shared/pages/Reports'
import Statement from '../shared/pages/Statement'
import Import from '../shared/pages/Import'
import StockScan from './pages/StockScan'
import Labels from './pages/Labels'

const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
)

/** Signed in and approved to apply/sell, or sent to the right window. */
function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/signin" replace />
  if (!user.stores?.length) return <Signup />   // signed up but has not told us about the business yet
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Router basename="/vendor">
        <Routes>
          <Route path="/signin" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="/*" element={
            <Guard>
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
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/ads" element={<Ads />} />
                  <Route path="/ads/new" element={<AdDesigner />} />
                  <Route path="/ads/:id/edit" element={<AdDesigner />} />
                  <Route path="/stores" element={<Stores />} />
                  <Route path="/storefront" element={<Storefront />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/statement" element={<Statement kind="vendor" />} />
                  <Route path="/import" element={<Import />} />
                  <Route path="/inventory/scan" element={<StockScan />} />
                  <Route path="/labels" element={<Labels />} />
                  {/* Links in older emails and bookmarks */}
                  <Route path="/messages" element={<Navigate to="/chat" replace />} />
                  <Route path="/store" element={<Navigate to="/profile" replace />} />
                  <Route path="/menu" element={<Navigate to="/products" replace />} />
                  <Route path="/insights" element={<Navigate to="/analytics" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </Guard>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
