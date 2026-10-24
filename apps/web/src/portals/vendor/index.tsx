import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../auth';
import { Notice, PortalLayout } from '../../ui';
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

function Shell() {
  const { pending, store, isChef } = useVendor();
  const unread = useApi<{ count: number }>('/vendor/messages/unread');
  return (
    <PortalLayout tone={isChef ? 'chef' : 'vendor'} title={isChef ? 'Chef portal' : 'Vendor portal'} subtitle={store.name} nav={[
      { to: '/vendor', label: 'Dashboard', end: true }, { to: '/vendor/orders', label: 'Orders', badge: pending }, isChef ? { to: '/vendor/menu', label: 'Menu' } : { to: '/vendor/inventory', label: 'Inventory' },
      { to: '/vendor/promotions', label: 'Promotions' }, { to: '/vendor/ads', label: 'Ads' }, { to: '/vendor/insights', label: 'Insights' }, { to: '/vendor/payouts', label: 'Payouts' }, { to: '/vendor/reports', label: 'Reports' },
      { to: '/vendor/store', label: isChef ? 'Kitchen' : 'Store' }, { to: '/vendor/storefront', label: 'Storefront' }, { to: '/vendor/onboarding', label: 'Setup' }, { to: '/vendor/messages', label: 'Messages', badge: unread.data?.count }, { to: '/vendor/help', label: 'Help' }]}>
      {store.status !== 'published' && <Notice tone="warn">Your store is not public yet (status: {store.status}). <Link to="/vendor/onboarding">Finish setup</Link>.</Notice>}
      <Routes>
        <Route index element={<Dashboard />} /><Route path="orders" element={<Orders />} /><Route path="inventory" element={isChef ? <Navigate to="/vendor/menu" replace /> : <Inventory />} /><Route path="menu" element={isChef ? <Menu /> : <Navigate to="/vendor/inventory" replace />} /><Route path="promotions" element={<Promotions />} />
        <Route path="ads" element={<Ads />} /><Route path="insights" element={<VendorInsights />} /><Route path="payouts" element={<Payouts />} /><Route path="reports" element={<Reports />} /><Route path="store" element={<StoreSettings />} /><Route path="storefront" element={<Storefront />} /><Route path="onboarding" element={<Onboarding />} /><Route path="messages" element={<MessagesPage base="/vendor/messages" staff={false} />} /><Route path="help" element={<Help />} />
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
