import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Suspense, lazy } from 'react'
import BottomTabBar from './components/BottomTabBar'

// Eagerly-loaded (always needed)
import LoginScreen          from './screens/LoginScreen'
import RegisterScreen       from './screens/RegisterScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'
import HomeScreen           from './screens/HomeScreen'
import ShopScreen           from './screens/ShopScreen'
import CartScreen           from './screens/CartScreen'

// Lazy-loaded screens (split-bundle to keep boot fast)
const ProductDetailScreen = lazy(() => import('./screens/ProductDetailScreen'))
const StoresScreen        = lazy(() => import('./screens/StoresScreen'))
const StoreDetailScreen   = lazy(() => import('./screens/StoreDetailScreen'))
const ChefsScreen         = lazy(() => import('./screens/ChefsScreen'))
const ChefDetailScreen    = lazy(() => import('./screens/ChefDetailScreen'))
const MealsScreen         = lazy(() => import('./screens/MealsScreen'))
const RecipeDetailScreen  = lazy(() => import('./screens/RecipeDetailScreen'))
const TopDealsScreen      = lazy(() => import('./screens/TopDealsScreen'))
const CheckoutScreen      = lazy(() => import('./screens/CheckoutScreen'))
const OrdersScreen        = lazy(() => import('./screens/OrdersScreen'))
const OrderDetailScreen   = lazy(() => import('./screens/OrderDetailScreen'))
const ProfileScreen       = lazy(() => import('./screens/ProfileScreen'))
const FavoritesScreen     = lazy(() => import('./screens/FavoritesScreen'))

const TAB_ROOTS = ['/home', '/shop', '/cart', '/orders', '/profile']

function Spinner() {
  return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, guest, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function OptionalAuth({ children }) {
  const { user, guest, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user && !guest) return <Navigate to="/login" replace />
  return children
}

function AppShell({ children }) {
  const location = useLocation()
  const isTab = TAB_ROOTS.some(r => location.pathname === r || location.pathname.startsWith(r + '/'))
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-hidden relative">
        <Suspense fallback={<Spinner />}>
          {children}
        </Suspense>
      </div>
      {isTab && <BottomTabBar />}
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        {/* Auth */}
        <Route path="/login"            element={<LoginScreen />} />
        <Route path="/register"         element={<RegisterScreen />} />
        <Route path="/forgot-password"  element={<ForgotPasswordScreen />} />

        {/* Browsable by guests */}
        <Route path="/home"                          element={<OptionalAuth><HomeScreen /></OptionalAuth>} />
        <Route path="/shop"                          element={<OptionalAuth><ShopScreen /></OptionalAuth>} />
        <Route path="/shop/product/:productId"       element={<OptionalAuth><ProductDetailScreen /></OptionalAuth>} />
        <Route path="/stores"                        element={<OptionalAuth><StoresScreen /></OptionalAuth>} />
        <Route path="/stores/:storeId"               element={<OptionalAuth><StoreDetailScreen /></OptionalAuth>} />
        <Route path="/chefs"                         element={<OptionalAuth><ChefsScreen /></OptionalAuth>} />
        <Route path="/chefs/:chefId"                 element={<OptionalAuth><ChefDetailScreen /></OptionalAuth>} />
        <Route path="/meals"                         element={<OptionalAuth><MealsScreen /></OptionalAuth>} />
        <Route path="/meals/recipe/:recipeId"        element={<OptionalAuth><RecipeDetailScreen /></OptionalAuth>} />
        <Route path="/top-deals"                     element={<OptionalAuth><TopDealsScreen /></OptionalAuth>} />

        {/* Browsable by all */}
        <Route path="/favorites"  element={<OptionalAuth><FavoritesScreen /></OptionalAuth>} />

        {/* Requires real account */}
        <Route path="/cart"                element={<RequireAuth><CartScreen /></RequireAuth>} />
        <Route path="/checkout"            element={<RequireAuth><CheckoutScreen /></RequireAuth>} />
        <Route path="/orders"              element={<RequireAuth><OrdersScreen /></RequireAuth>} />
        <Route path="/orders/:orderId"     element={<RequireAuth><OrderDetailScreen /></RequireAuth>} />
        <Route path="/profile"             element={<RequireAuth><ProfileScreen /></RequireAuth>} />

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppShell>
  )
}
