import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import BottomTabBar from './components/BottomTabBar'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import StoresScreen from './screens/StoresScreen'
import ChefsScreen from './screens/ChefsScreen'
import HomeScreen from './screens/HomeScreen'
import ShopScreen from './screens/ShopScreen'
import ProductDetailScreen from './screens/ProductDetailScreen'
import CartScreen from './screens/CartScreen'
import CheckoutScreen from './screens/CheckoutScreen'
import OrdersScreen from './screens/OrdersScreen'
import OrderDetailScreen from './screens/OrderDetailScreen'
import ProfileScreen from './screens/ProfileScreen'

const TAB_ROOTS = ['/home', '/shop', '/cart', '/orders', '/profile']

// Redirects to login only if not signed in AND not in guest mode
function RequireAuth({ children }) {
  const { user, guest, loading } = useAuth()
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user && !guest) return <Navigate to="/login" replace />
  // Guest trying to reach auth-only screen — send to login
  if (guest && !user) return <Navigate to="/login" replace />
  return children
}

// For screens guests can browse (Home, Shop, ProductDetail)
function OptionalAuth({ children }) {
  const { user, guest, loading } = useAuth()
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user && !guest) return <Navigate to="/login" replace />
  return children
}

function AppShell({ children }) {
  const location = useLocation()
  const isTab = TAB_ROOTS.some(r => location.pathname === r || location.pathname.startsWith(r + '/'))
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
      {isTab && <BottomTabBar />}
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/login"    element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />

        {/* Browsable without full account (guests allowed) */}
        <Route path="/home" element={<OptionalAuth><HomeScreen /></OptionalAuth>} />
        <Route path="/shop" element={<OptionalAuth><ShopScreen /></OptionalAuth>} />
        <Route path="/shop/product/:productId" element={<OptionalAuth><ProductDetailScreen /></OptionalAuth>} />
        <Route path="/stores" element={<OptionalAuth><StoresScreen /></OptionalAuth>} />
        <Route path="/chefs" element={<OptionalAuth><ChefsScreen /></OptionalAuth>} />
        <Route path="/chefs/:chefId" element={<OptionalAuth><ChefsScreen /></OptionalAuth>} />

        {/* Requires real account */}
        <Route path="/cart"     element={<RequireAuth><CartScreen /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><CheckoutScreen /></RequireAuth>} />
        <Route path="/orders"   element={<RequireAuth><OrdersScreen /></RequireAuth>} />
        <Route path="/orders/:orderId" element={<RequireAuth><OrderDetailScreen /></RequireAuth>} />
        <Route path="/profile"  element={<RequireAuth><ProfileScreen /></RequireAuth>} />

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppShell>
  )
}
