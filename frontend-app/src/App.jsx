import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import BottomTabBar from './components/BottomTabBar'

// Eagerly-loaded (always needed)
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
const AssistantScreen     = lazy(() => import('./screens/AssistantScreen'))

const TAB_ROOTS = ['/home', '/shop', '/cart', '/orders', '/profile']

function Spinner() {
  return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
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
        {/* No sign-in: old auth URLs go home */}
        <Route path="/login"           element={<Navigate to="/home" replace />} />
        <Route path="/register"        element={<Navigate to="/home" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/home" replace />} />

        {/* Storefront */}
        <Route path="/home"                          element={<HomeScreen />} />
        <Route path="/shop"                          element={<ShopScreen />} />
        <Route path="/shop/product/:productId"       element={<ProductDetailScreen />} />
        <Route path="/stores"                        element={<StoresScreen />} />
        <Route path="/stores/:storeId"               element={<StoreDetailScreen />} />
        <Route path="/chefs"                         element={<ChefsScreen />} />
        <Route path="/chefs/:chefId"                 element={<ChefDetailScreen />} />
        <Route path="/meals"                         element={<MealsScreen />} />
        <Route path="/meals/recipe/:recipeId"        element={<RecipeDetailScreen />} />
        <Route path="/top-deals"                     element={<TopDealsScreen />} />

        {/* Browsable by all */}
        <Route path="/favorites"  element={<FavoritesScreen />} />
        <Route path="/assistant"  element={<AssistantScreen />} />

        {/* Cart, checkout and orders (per-device guest) */}
        <Route path="/cart"                element={<CartScreen />} />
        <Route path="/checkout"            element={<CheckoutScreen />} />
        <Route path="/orders"              element={<OrdersScreen />} />
        <Route path="/orders/:orderId"     element={<OrderDetailScreen />} />
        <Route path="/profile"             element={<ProfileScreen />} />

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppShell>
  )
}
