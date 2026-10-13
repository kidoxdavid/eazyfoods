import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { LocationProvider } from './contexts/LocationContext'
import { ToastProvider } from './contexts/ToastContext'
import { RecentlyViewedProvider } from './contexts/RecentlyViewedContext'
import { SaveForLaterProvider } from './contexts/SaveForLaterContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Chatbot from './components/Chatbot'
import PageTransition from './components/PageTransition'
import StickyBottomNav from './components/StickyBottomNav'
import CheckoutRoute from './components/CheckoutRoute'
import Home from './pages/Home'
import DriverSignup from './pages/DriverSignup'
import BecomeADriver from './pages/BecomeADriver'
import ProductDetail from './pages/ProductDetail'
import Stores from './pages/Stores'
import StoreDetail from './pages/StoreDetail'
import Cart from './pages/Cart'
import OrderConfirmation from './pages/OrderConfirmation'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import Meals from './pages/Meals'
import MealDetail from './pages/MealDetail'
import MealPlanDetail from './pages/MealPlanDetail'
import About from './pages/About'
import ContactUs from './pages/ContactUs'
import TopMarketDeals from './pages/TopMarketDeals'
import TopChefDeals from './pages/TopChefDeals'
import Chefs from './pages/Chefs'
import ChefDetail from './pages/ChefDetail'
import Groceries from './pages/Groceries'

// There is no sign-in: old auth URLs simply land on the storefront.
const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email']

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <SaveForLaterProvider>
              <FavoritesProvider>
                <LocationProvider>
                  <ToastProvider>
                    <RecentlyViewedProvider>
                      <Layout>
                        <PageTransition>
                          <StickyBottomNav />
                          <Routes>
                            <Route path="/" element={<Home />} />
                            {authPaths.map((p) => <Route key={p} path={p} element={<Navigate to="/" replace />} />)}
                            <Route path="/driver-signup" element={<DriverSignup />} />
                            <Route path="/become-a-driver" element={<BecomeADriver />} />
                            <Route path="/groceries" element={<Groceries />} />
                            <Route path="/products" element={<Navigate to="/groceries" replace />} />
                            <Route path="/products/:id" element={<ProductDetail />} />
                            <Route path="/stores" element={<Stores />} />
                            <Route path="/stores/:id" element={<StoreDetail />} />
                            <Route path="/meals" element={<Meals />} />
                            <Route path="/meals/:id" element={<MealDetail />} />
                            <Route path="/meal-plans/:id" element={<MealPlanDetail />} />
                            <Route path="/chefs" element={<Chefs />} />
                            <Route path="/chefs/:id" element={<ChefDetail />} />
                            <Route path="/top-market-deals" element={<TopMarketDeals />} />
                            <Route path="/top-chef-deals" element={<TopChefDeals />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/checkout" element={<CheckoutRoute />} />
                            <Route path="/order-confirmation" element={<OrderConfirmation />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/orders/:id" element={<OrderDetail />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/contact" element={<ContactUs />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </PageTransition>
                      </Layout>
                      <Chatbot />
                    </RecentlyViewedProvider>
                  </ToastProvider>
                </LocationProvider>
              </FavoritesProvider>
            </SaveForLaterProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  )
}

export default App
