import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LiveBoundary } from '../../live'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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
import Documentation from './pages/Documentation'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Promotions from './pages/Promotions'
import Payouts from './pages/Payouts'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import Storefront from '../shared/pages/Storefront'
import Questions from '../shared/pages/Questions'
import Reports from '../shared/pages/Reports'
import Statement from '../shared/pages/Statement'

const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
)

/** Signed in, or sent to the vendor window's sign-in. */
function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) { window.location.href = '/vendor/signin'; return <Spinner /> }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Router basename="/vendor">
        <Routes>
          <Route path="/*" element={
            <Guard>
              <Layout>
<LiveBoundary className="space-y-3 sm:space-y-4 lg:space-y-6">
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
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/:id" element={<OrderDetail />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/payouts" element={<Payouts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/storefront" element={<Storefront />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/statement" element={<Statement kind="vendor" />} />
                  {/* Links in older emails and bookmarks */}
                  <Route path="/menu" element={<Navigate to="/cuisines" replace />} />
                  <Route path="/store" element={<Navigate to="/profile" replace />} />
                  <Route path="/messages" element={<Navigate to="/chat" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
</LiveBoundary>
              </Layout>
            </Guard>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
