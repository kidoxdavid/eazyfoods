import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LiveBoundary } from '../../live'
import { LayoutDashboard, ShoppingCart, Truck, UserCheck, LifeBuoy, RotateCcw, Store, MessageSquare, MapPin, Package, Utensils, Layers, Map, Tag, Megaphone, Palette, FileText, Handshake, DollarSign, LineChart, Calculator, Banknote, Scale, BarChart3, Users, Star, Gift, FileSpreadsheet, SlidersHorizontal, Settings as SettingsIcon, Activity } from 'lucide-react'
import { setArea } from '../shared/client'
import StaffShell, { useUser } from '../shared/StaffShell'
import StaffLogin from '../shared/StaffLogin'
import Coupons from '../shared/pages/Coupons'
import Studio from '../shared/pages/Studio'
import { canDo, STAFF_ROLES } from './perms'
import { NoAccess } from './common'
import { Dashboard, Orders, OrderDetail, Dispatch, Drivers, Support, TicketDetail, Refunds } from './pages/Operations'
import { Vendors, VendorDetail, StoresAdmin, Dishes, Zones } from './pages/Marketplace'
import { Catalogue, ProductEditor } from './pages/Catalogue'
import Taxonomy from './pages/Taxonomy'
import { Ads, Content, Crm, ProspectDetail } from './pages/Growth'
import { Finance, Reports, System } from './pages/Insight'
import { Settings, ControlCentre } from './pages/Platform'
import { Messages, Insights } from './pages/Talk'
import { Pricing } from './pages/Pricing'
import { Settlements, Reconciliation } from './pages/Settlements'
import { FinanceOverview } from './pages/Overview'
import { Customers, CustomerDetail, ReviewsAdmin, GiftCards } from './pages/People'

setArea('admin')

/** `need`: any one of these permissions shows the item. The API enforces the same rules; this only keeps people from seeing menus they cannot use. */
const NAV = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'Operations', need: ['orders.view', 'dispatch.manage', 'support.manage', 'reports.view'] },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, need: ['orders.view'] },
  { name: 'Dispatch', href: '/dispatch', icon: Truck, badge: '/admin/dispatch', need: ['dispatch.manage'] },
  { name: 'Drivers', href: '/drivers', icon: UserCheck, badge: '/admin/drivers', need: ['drivers.manage'] },
  { name: 'Support', href: '/support', icon: LifeBuoy, badge: '/admin/support', need: ['support.manage'] },
  { name: 'Customers', href: '/customers', icon: Users, need: ['users.view'] },
  { name: 'Reviews', href: '/reviews', icon: Star, need: ['support.manage'] },
  { name: 'Refunds', href: '/refunds', icon: RotateCcw, badge: '/admin/refunds', need: ['refunds.approve', 'refunds.request'] },
  { name: 'Vendors', href: '/vendors', icon: Store, group: 'Marketplace', badge: '/admin/vendors', need: ['vendors.manage'] },
  { name: 'Vendor messages', href: '/messages', icon: MessageSquare, badge: '/admin/messages', need: ['vendors.manage'] },
  { name: 'Stores', href: '/stores', icon: MapPin, need: ['stores.manage'] },
  { name: 'Catalogue', href: '/catalogue', icon: Package, badge: '/admin/catalogue', need: ['catalog.manage'] },
  { name: 'Home-chef dishes', href: '/dishes', icon: Utensils, need: ['catalog.manage', 'vendors.manage'] },
  { name: 'Taxonomy', href: '/taxonomy', icon: Layers, need: ['catalog.manage'] },
  { name: 'Delivery zones', href: '/zones', icon: Map, need: ['stores.manage'] },
  { name: 'Promotions', href: '/promotions', icon: Tag, group: 'Growth', need: ['promotions.manage'] },
  { name: 'Advertising', href: '/ads', icon: Megaphone, badge: '/admin/ads', need: ['ads.manage'] },
  { name: 'Storefront studio', href: '/studio', icon: Palette, need: ['content.manage'] },
  { name: 'Content', href: '/content', icon: FileText, need: ['content.manage'] },
  { name: 'Vendor pipeline', href: '/crm', icon: Handshake, need: ['crm.manage'] },
  { name: 'Finance', href: '/finance', icon: DollarSign, group: 'Finance & insight', need: ['ledger.view', 'payouts.manage'] },
  { name: 'Financial overview', href: '/overview', icon: LineChart, need: ['ledger.view', 'reports.view', 'settlements.view'] },
  { name: 'Settlements', href: '/settlements', icon: Banknote, badge: '/admin/settlements', need: ['settlements.view', 'ledger.view', 'payouts.manage'] },
  { name: 'Reconciliation', href: '/reconciliation', icon: Scale, need: ['settlements.view', 'ledger.view', 'payouts.manage'] },
  { name: 'Pricing & rules', href: '/pricing', icon: Calculator, need: ['pricing.view', 'pricing.edit', 'pricing.approve'] },
  { name: 'Gift cards', href: '/gift-cards', icon: Gift, need: ['ledger.view'] },
  { name: 'Insights', href: '/insights', icon: BarChart3, need: ['reports.view'] },
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet, need: ['reports.view'] },
  { name: 'Control centre', href: '/control', icon: SlidersHorizontal, group: 'Platform', need: ['control.manage'] },
  { name: 'Settings & access', href: '/settings', icon: SettingsIcon, need: ['settings.view', 'users.view'] },
  { name: 'System & audit', href: '/system', icon: Activity, need: ['settings.view', 'orders.view', 'audit.view'] },
]
const canSee = (item, user) => canDo(user.roles ?? [], ...item.need)

/** Each role lands on the screen most useful to it. */
const LANDING = [['admin', '/'], ['support', '/support'], ['finance', '/finance'], ['dispatcher', '/dispatch'], ['catalog', '/catalogue'], ['marketing', '/marketing/']]

function Landing() {
  const user = useUser()
  const roles = user?.roles ?? []
  if (!roles.some((r) => STAFF_ROLES.includes(r.role))) return <NoAccess what="the admin console" />
  const to = LANDING.find(([r]) => roles.some((x) => x.role === r))?.[1] ?? '/'
  if (to.startsWith('/marketing')) { window.location.href = to; return null }
  return to === '/' ? <Dashboard /> : <Navigate to={to} replace />
}

export default function App() {
  return (
    <Router basename="/admin">
      <Routes>
        <Route path="/signin" element={<StaffLogin title="Admin Console" subtitle="Operations, marketplace, finance and platform settings" />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/*" element={
          <StaffShell brand="eazyfoods Admin" nav={NAV} badgesPath="/admin/badges" canSee={canSee} titleOf={(u) => (u.roles ?? []).filter((r) => STAFF_ROLES.includes(r.role)).map((r) => r.role).join(', ') || u.full_name}>
<LiveBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/orders" element={<Orders />} /><Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/dispatch" element={<Dispatch />} /><Route path="/drivers" element={<Drivers />} />
              <Route path="/support" element={<Support />} /><Route path="/support/:id" element={<TicketDetail />} />
              <Route path="/refunds" element={<Refunds />} /><Route path="/customers" element={<Customers />} /><Route path="/customers/:id" element={<CustomerDetail />} /><Route path="/reviews" element={<ReviewsAdmin />} /><Route path="/pricing" element={<Pricing />} /><Route path="/overview" element={<FinanceOverview />} /><Route path="/settlements" element={<Settlements />} /><Route path="/reconciliation" element={<Reconciliation />} /><Route path="/gift-cards" element={<GiftCards />} />
              <Route path="/vendors" element={<Vendors />} /><Route path="/vendors/:id" element={<VendorDetail />} />
              <Route path="/messages" element={<Messages />} /><Route path="/stores" element={<StoresAdmin />} />
              <Route path="/catalogue" element={<Catalogue />} /><Route path="/catalogue/:id" element={<ProductEditor />} />
              <Route path="/dishes" element={<Dishes />} /><Route path="/taxonomy" element={<Taxonomy />} /><Route path="/zones" element={<Zones />} />
              <Route path="/promotions" element={<Coupons />} /><Route path="/ads" element={<Ads />} /><Route path="/studio" element={<Studio />} />
              <Route path="/content" element={<Content />} />
              <Route path="/crm" element={<Crm />} /><Route path="/crm/:id" element={<ProspectDetail />} />
              <Route path="/finance" element={<Finance />} /><Route path="/insights" element={<Insights />} /><Route path="/reports" element={<Reports />} />
              <Route path="/control" element={<ControlCentre />} /><Route path="/settings" element={<Settings />} /><Route path="/system" element={<System />} />
              <Route path="*" element={<NoAccess what="this page" />} />
            </Routes>
</LiveBoundary>
          </StaffShell>
        } />
      </Routes>
    </Router>
  )
}
