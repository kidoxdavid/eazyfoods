import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LiveBoundary } from '../../live'
import { Wallet, LineChart, Banknote, Scale, RotateCcw, Gift, Calculator, BarChart3, FileSpreadsheet, ShoppingCart, Activity } from 'lucide-react'
import { setArea } from '../shared/client'
import StaffShell from '../shared/StaffShell'
import StaffLogin from '../shared/StaffLogin'
import { canDo } from '../admin/perms'
import { NoAccess } from '../admin/common'
import { Orders, OrderDetail, Refunds } from '../admin/pages/Operations'
import { Finance, Reports, System } from '../admin/pages/Insight'
import { GiftCards } from '../admin/pages/People'
import { Pricing } from '../admin/pages/Pricing'
import { Settlements, Reconciliation } from '../admin/pages/Settlements'
import { FinanceOverview } from '../admin/pages/Overview'
import { Insights } from '../admin/pages/Talk'

setArea('finance')

/**
 * The finance team's own window: its own sign-in and cookie, and only the money screens. It shows the same pages as the admin console and calls the same
 * server, ledger and rules (one source of truth); the server still checks every permission, so this menu only tidies what a person sees.
 */
const NAV = [
  { name: 'Overview', href: '/', icon: LineChart, group: 'Money', need: ['ledger.view', 'reports.view', 'settlements.view'] },
  { name: 'Balances & payouts', href: '/balances', icon: Wallet, need: ['ledger.view', 'payouts.manage'] },
  { name: 'Settlements', href: '/settlements', icon: Banknote, badge: '/admin/settlements', need: ['settlements.view', 'ledger.view', 'payouts.manage'] },
  { name: 'Reconciliation', href: '/reconciliation', icon: Scale, need: ['settlements.view', 'ledger.view', 'payouts.manage'] },
  { name: 'Refunds', href: '/refunds', icon: RotateCcw, badge: '/admin/refunds', need: ['refunds.approve', 'refunds.request'] },
  { name: 'Gift cards', href: '/gift-cards', icon: Gift, need: ['ledger.view'] },
  { name: 'Pricing & rules', href: '/pricing', icon: Calculator, group: 'Rules', need: ['pricing.view', 'pricing.edit', 'pricing.approve'] },
  { name: 'Insights', href: '/insights', icon: BarChart3, group: 'Reports', need: ['reports.view'] },
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet, need: ['reports.view'] },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, group: 'Records', need: ['orders.view'] },
  { name: 'System & audit', href: '/system', icon: Activity, need: ['settings.view', 'orders.view', 'audit.view'] },
]
const canSee = (item, user) => canDo(user.roles ?? [], ...item.need)

export default function App() {
  return (
    <Router basename="/finance">
      <Routes>
        <Route path="/signin" element={<StaffLogin title="Finance Portal" subtitle="Payouts, refunds, the ledger and pricing rules" />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/*" element={
          <StaffShell brand="eazyfoods Finance" nav={NAV} badgesPath="/admin/badges" canSee={canSee} titleOf={(u) => u.full_name}>
<LiveBoundary>
            <Routes>
              <Route path="/" element={<FinanceOverview />} /><Route path="/balances" element={<Finance />} />
              <Route path="/refunds" element={<Refunds />} /><Route path="/settlements" element={<Settlements />} /><Route path="/reconciliation" element={<Reconciliation />} />
              <Route path="/gift-cards" element={<GiftCards />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/orders" element={<Orders />} /><Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/system" element={<System />} />
              <Route path="*" element={<NoAccess what="this page" />} />
            </Routes>
</LiveBoundary>
          </StaffShell>
        } />
      </Routes>
    </Router>
  )
}
