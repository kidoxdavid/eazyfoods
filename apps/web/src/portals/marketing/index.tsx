import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../auth';
import { PortalLayout } from '../backoffice';
import { NoAccess } from '../admin/common';
import { canDo } from '../admin/perms';
import { Analytics, Dashboard } from './Overview';
import { EmailEditor, EmailList, Templates } from './Emails';
import Audiences from './Audiences';
import { Automations, Campaigns } from './Campaigns';
import { Budget, Calendar, Library, Social } from './Plan';
import Settings from './Settings';
import Rewards from './Rewards';
import Studio from '../admin/Studio';
import { Promotions } from '../admin/Promotions';

const NAV = [
  { to: '/marketing', label: 'Dashboard', end: true, group: 'Overview' }, { to: '/marketing/analytics', label: 'Analytics', group: 'Overview' },
  { to: '/marketing/emails', label: 'Email campaigns', group: 'Reach' }, { to: '/marketing/automations', label: 'Automations', group: 'Reach' }, { to: '/marketing/audiences', label: 'Audiences', group: 'Reach' },
  { to: '/marketing/campaigns', label: 'Campaigns', group: 'Reach' }, { to: '/marketing/social', label: 'Social posts', group: 'Reach' },
  { to: '/marketing/calendar', label: 'Calendar', group: 'Plan' }, { to: '/marketing/budget', label: 'Budget', group: 'Plan' }, { to: '/marketing/library', label: 'Library', group: 'Plan' },
  { to: '/marketing/studio', label: 'Storefront studio', group: 'Offers' }, { to: '/marketing/coupons', label: 'Coupons', group: 'Offers' }, { to: '/marketing/rewards', label: 'Rewards & credit', group: 'Offers' },
  { to: '/marketing/settings', label: 'Settings', group: 'Setup' },
];

export default function Marketing() {
  const { me } = useAuth();
  const roles = me?.roles ?? [];
  if (!canDo(roles, 'marketing.manage')) return <div className="wrap" style={{ paddingTop: 24 }}><NoAccess what="the marketing area" /></div>;
  return (
    <PortalLayout tone="marketing" title="Marketing" subtitle={roles.map((r) => r.role).filter((r) => ['admin', 'marketing'].includes(r)).join(', ')} nav={NAV}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="emails" element={<EmailList />} /><Route path="emails/:id" element={<EmailEditor />} /><Route path="templates" element={<Templates />} />
        <Route path="audiences" element={<Audiences />} /><Route path="campaigns" element={<Campaigns />} /><Route path="automations" element={<Automations />} />
        <Route path="calendar" element={<Calendar />} /><Route path="social" element={<Social />} /><Route path="budget" element={<Budget />} /><Route path="library" element={<Library />} />
        <Route path="studio/*" element={<Studio />} /><Route path="coupons" element={<Promotions />} />
        <Route path="analytics" element={<Analytics />} /><Route path="settings" element={<Settings />} /><Route path="rewards" element={<Rewards />} />
        <Route path="*" element={<Navigate to="/marketing" replace />} />
      </Routes>
    </PortalLayout>
  );
}
