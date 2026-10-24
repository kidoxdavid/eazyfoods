import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../auth';
import { Notice } from '../../ui';
import { PortalLayout } from '../backoffice';
import './vendor.css';
import Apply from './Apply';
import Dashboard from './Dashboard';
import Orders from './Orders';
import Inventory from './Inventory';
import Promotions from './Promotions';
import Ads from './Ads';
import Reports from './Reports';
import StoreSettings from './StoreSettings';
import Storefront from './Storefront';
import Menu from './Menu';
import Payouts from './Payouts';
import Onboarding from './Onboarding';
import Help from './Help';
import { MessagesPage } from '../../messages';
import { InsightsView } from '../../insights';
import { useApi } from '../../hooks';
import { StoreSelect, VendorProvider, useVendor } from './Shared';
import Questions from './Questions';

function Shell() {
  const { pending, store, isChef } = useVendor();
  const unread = useApi<{ count: number }>('/vendor/messages/unread');
  const caps = useApi<Record<string, boolean>>('/vendor/capabilities');
  const can = (k: string) => caps.data?.[k] !== false;
  return (
    <PortalLayout tone={isChef ? 'chef' : 'vendor'} title={isChef ? 'Chef portal' : 'Vendor portal'} subtitle={store.name} nav={[
      { to: '/vendor', label: 'Dashboard', end: true, group: 'Sell' }, { to: '/vendor/orders', label: 'Orders', badge: pending, group: 'Sell' },
      isChef ? { to: '/vendor/menu', label: 'Menu', group: 'Sell' } : { to: '/vendor/inventory', label: 'Inventory', group: 'Sell' },
      ...(can('questions') ? [{ to: '/vendor/questions', label: 'Questions', group: 'Sell' }] : []),
      ...(can('promotions') ? [{ to: '/vendor/promotions', label: 'Promotions', group: 'Grow' }] : []), ...(can('ads') ? [{ to: '/vendor/ads', label: 'Ads', group: 'Grow' }] : []), ...(can('storefront') ? [{ to: '/vendor/storefront', label: 'Storefront', group: 'Grow' }] : []),
      { to: '/vendor/insights', label: 'Insights', group: 'Money & reports' }, { to: '/vendor/payouts', label: 'Payouts', group: 'Money & reports' }, { to: '/vendor/reports', label: 'Reports', group: 'Money & reports' },
      { to: '/vendor/store', label: isChef ? 'Kitchen' : 'Store', group: 'Account' }, { to: '/vendor/onboarding', label: 'Setup', group: 'Account' },
      ...(can('messages') ? [{ to: '/vendor/messages', label: 'Messages', badge: unread.data?.count, group: 'Account' }] : []), { to: '/vendor/help', label: 'Help', group: 'Account' }]}>
      {store.status !== 'published' && <Notice tone="warn">Your store is not public yet (status: {store.status}). <Link to="/vendor/onboarding">Finish setup</Link>.</Notice>}
      <Routes>
        <Route index element={<Dashboard />} /><Route path="orders" element={<Orders />} /><Route path="inventory" element={isChef ? <Navigate to="/vendor/menu" replace /> : <Inventory />} /><Route path="menu" element={isChef ? <Menu /> : <Navigate to="/vendor/inventory" replace />} /><Route path="promotions" element={<Promotions />} />
        <Route path="ads" element={<Ads />} /><Route path="insights" element={<VendorInsights />} /><Route path="payouts" element={<Payouts />} /><Route path="reports" element={<Reports />} /><Route path="store" element={<StoreSettings />} /><Route path="storefront" element={<Storefront />} /><Route path="onboarding" element={<Onboarding />} /><Route path="messages" element={<MessagesPage base="/vendor/messages" staff={false} />} /><Route path="questions" element={<Questions />} /><Route path="help" element={<Help />} />
        <Route path="*" element={<Notice>Page not found.</Notice>} />
      </Routes>
    </PortalLayout>
  );
}

function VendorInsights() {
  const { storeId } = useVendor();
  return <><StoreSelect /><InsightsView key={storeId} path={`/vendor/insights?store=${storeId}`} title="Insights" sub="How your store is trading, and when customers order." /></>;
}

export default function Portal() {
  const { isVendor, ready } = useAuth();
  if (!ready) return null;
  if (!isVendor) return <Apply />;
  return <VendorProvider><Shell /></VendorProvider>;
}
