import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../auth';
import { PortalLayout } from '../../ui';
import { NoAccess } from '../admin/common';
import { canDo } from '../admin/perms';
import { Analytics, Dashboard } from './Overview';
import { EmailEditor, EmailList, Templates } from './Emails';
import Audiences from './Audiences';
import { Automations, Campaigns } from './Campaigns';
import { Budget, Calendar, Library, Social } from './Plan';
import Settings from './Settings';

const NAV = [
  { to: '/marketing', label: 'Dashboard', end: true }, { to: '/marketing/emails', label: 'Email campaigns' }, { to: '/marketing/audiences', label: 'Audiences' }, { to: '/marketing/campaigns', label: 'Campaigns' },
  { to: '/marketing/automations', label: 'Automations' }, { to: '/marketing/calendar', label: 'Calendar' }, { to: '/marketing/social', label: 'Social posts' }, { to: '/marketing/budget', label: 'Budget' },
  { to: '/marketing/library', label: 'Library' }, { to: '/marketing/analytics', label: 'Analytics' }, { to: '/admin/studio', label: 'Storefront studio' }, { to: '/admin/promotions', label: 'Coupons' }, { to: '/marketing/settings', label: 'Settings' },
];

export default function Marketing() {
  const { me } = useAuth();
  const roles = me?.roles ?? [];
  if (!canDo(roles, 'marketing.manage')) return <div className="wrap" style={{ paddingTop: 24 }}><NoAccess what="the marketing area" /></div>;
  return (
    <PortalLayout tone="marketing" title="Marketing" subtitle={roles.map((r) => r.role).filter((r) => ['owner', 'marketing'].includes(r)).join(', ')} nav={NAV}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="emails" element={<EmailList />} /><Route path="emails/:id" element={<EmailEditor />} /><Route path="templates" element={<Templates />} />
        <Route path="audiences" element={<Audiences />} /><Route path="campaigns" element={<Campaigns />} /><Route path="automations" element={<Automations />} />
        <Route path="calendar" element={<Calendar />} /><Route path="social" element={<Social />} /><Route path="budget" element={<Budget />} /><Route path="library" element={<Library />} />
        <Route path="analytics" element={<Analytics />} /><Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/marketing" replace />} />
      </Routes>
    </PortalLayout>
  );
}
