import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LiveBoundary } from '../../live'
import { LayoutDashboard, Megaphone, Mail, FileText, Users, Workflow, Share2, DollarSign, Sparkles, Image, BarChart3, Tag, Palette, Gift, Settings as SettingsIcon } from 'lucide-react'
import { setArea } from '../shared/client'
import StaffShell from '../shared/StaffShell'
import StaffLogin from '../shared/StaffLogin'
import Coupons from '../shared/pages/Coupons'
import Rewards from '../shared/pages/Rewards'
import Studio from '../shared/pages/Studio'
import { Dashboard, Analytics } from './pages/Overview'
import { EmailList, EmailEditor, Templates } from './pages/Emails'
import Audiences from './pages/Audiences'
import { Campaigns, Automations } from './pages/Campaigns'
import { Calendar, Social, Budget, Library } from './pages/Plan'
import Settings from './pages/Settings'

setArea('marketing')

const NAV = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'Overview' }, { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone, group: 'Reach' }, { name: 'Email Campaigns', href: '/emails', icon: Mail, badge: '/marketing/emails' }, { name: 'Email Templates', href: '/email-templates', icon: FileText },
  { name: 'Audiences', href: '/audiences', icon: Users }, { name: 'Automation', href: '/automations', icon: Workflow }, { name: 'Social Media', href: '/social', icon: Share2, badge: '/marketing/social' },
  { name: 'Budget', href: '/budget', icon: DollarSign, group: 'Plan' }, { name: 'Cultural Occasions', href: '/calendar', icon: Sparkles }, { name: 'Content Library', href: '/library', icon: Image },
  { name: 'Coupons', href: '/coupons', icon: Tag, group: 'Offers' }, { name: 'Storefront Studio', href: '/studio', icon: Palette }, { name: 'Rewards & Credit', href: '/rewards', icon: Gift },
  { name: 'Settings', href: '/settings', icon: SettingsIcon, group: 'Setup' },
]

export default function App() {
  return (
    <Router basename="/marketing">
      <Routes>
        <Route path="/signin" element={<StaffLogin title="Marketing Portal" subtitle="Campaigns, email, offers and the storefront" />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/*" element={
          <StaffShell brand="eazyfoods Marketing" nav={NAV} badgesPath="/marketing/badges">
<LiveBoundary className="space-y-3 sm:space-y-4 lg:space-y-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/emails" element={<EmailList />} />
              <Route path="/emails/:id" element={<EmailEditor />} />
              <Route path="/email-templates" element={<Templates />} />
              <Route path="/templates" element={<Navigate to="/email-templates" replace />} />
              <Route path="/audiences" element={<Audiences />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/social" element={<Social />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/library" element={<Library />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
</LiveBoundary>
          </StaffShell>
        } />
      </Routes>
    </Router>
  )
}
