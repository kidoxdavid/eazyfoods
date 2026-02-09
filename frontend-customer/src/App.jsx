import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { LocationProvider } from './contexts/LocationContext'
import { ToastProvider } from './contexts/ToastContext'
import { RecentlyViewedProvider } from './contexts/RecentlyViewedContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Chatbot from './components/Chatbot'
import PageTransition from './components/PageTransition'
import StickyBottomNav from './components/StickyBottomNav'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import DriverSignup from './pages/DriverSignup'
import BecomeADriver from './pages/BecomeADriver'
import ProductDetail from './pages/ProductDetail'
import Stores from './pages/Stores'
import StoreDetail from './pages/StoreDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import Meals from './pages/Meals'
import MealDetail from './pages/MealDetail'
import MealPlanDetail from './pages/MealPlanDetail'
import About from './pages/About'
import ContactUs from './pages/ContactUs'
import TopMarketDeals from './pages/TopMarketDeals'
import Chefs from './pages/Chefs'
import ChefDetail from './pages/ChefDetail'
import Groceries from './pages/Groceries'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <LocationProvider>
              <ToastProvider>
                <RecentlyViewedProvider>
                  <Layout>
                    <PageTransition>
                      <StickyBottomNav />
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/driver-signup" element={<DriverSignup />} />
                        <Route path="/become-a-driver" element={<BecomeADriver />} />
                        <Route path="/stores" element={<Stores />} />
                        <Route path="/stores/:id" element={<StoreDetail />} />
                        <Route path="/products/:id" element={<ProductDetail />} />
                        <Route path="/products" element={<Navigate to="/groceries" replace />} />
                        <Route path="/meals" element={<Meals />} />
                        <Route path="/meals/:id" element={<MealDetail />} />
                        <Route path="/meal-plans/:id" element={<MealPlanDetail />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<ContactUs />} />
                        <Route path="/top-market-deals" element={<TopMarketDeals />} />
                        <Route path="/groceries" element={<Groceries />} />
                        <Route path="/chefs" element={<Chefs />} />
                        <Route path="/chefs/:id" element={<ChefDetail />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
                        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
                        <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                      </Routes>
                    </PageTransition>
                  </Layout>
                  <Chatbot />
                </RecentlyViewedProvider>
              </ToastProvider>
            </LocationProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  )
}

export default App
