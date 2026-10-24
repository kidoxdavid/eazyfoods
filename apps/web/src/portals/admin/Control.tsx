import { useEffect, useState } from 'react';
import { put } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Button, ErrorBox, Loading, Notice, PageHeader, Select, Switch, Tabs, Textarea } from '../../ui';
import { Need } from './common';

type Flag = { key: string; label: string; description: string; grp: string; enabled: boolean };
type Platform = { key: string; label: string; description: string; enabled: boolean };
type VCap = { caps: Record<string, string>; defaults: Record<string, boolean>; vendors: { id: string; name: string; status: string; kind: string; capabilities: Record<string, boolean>; effective: Record<string, boolean> }[] };
type PortalCfg = { portal: string; hidden_nav: string[]; notice: string | null; notice_tone: 'info' | 'warn' };

/** Menu items per area, so an admin can hide what a team does not need. */
const AREA_NAV: Record<string, [string, string][]> = {
  vendor: [['/vendor/orders', 'Orders'], ['/vendor/inventory', 'Inventory'], ['/vendor/questions', 'Questions'], ['/vendor/promotions', 'Promotions'], ['/vendor/ads', 'Ads'], ['/vendor/storefront', 'Storefront'], ['/vendor/insights', 'Insights'], ['/vendor/payouts', 'Payouts'], ['/vendor/reports', 'Reports'], ['/vendor/store', 'Store'], ['/vendor/onboarding', 'Setup'], ['/vendor/messages', 'Messages'], ['/vendor/help', 'Help']],
  chef: [['/vendor/orders', 'Orders'], ['/vendor/menu', 'Menu'], ['/vendor/questions', 'Questions'], ['/vendor/promotions', 'Promotions'], ['/vendor/ads', 'Ads'], ['/vendor/storefront', 'Storefront'], ['/vendor/insights', 'Insights'], ['/vendor/payouts', 'Payouts'], ['/vendor/reports', 'Reports'], ['/vendor/store', 'Kitchen'], ['/vendor/onboarding', 'Setup'], ['/vendor/messages', 'Messages'], ['/vendor/help', 'Help']],
  marketing: [['/marketing/analytics', 'Analytics'], ['/marketing/emails', 'Email campaigns'], ['/marketing/automations', 'Automations'], ['/marketing/audiences', 'Audiences'], ['/marketing/campaigns', 'Campaigns'], ['/marketing/social', 'Social posts'], ['/marketing/calendar', 'Calendar'], ['/marketing/budget', 'Budget'], ['/marketing/library', 'Library'], ['/admin/studio', 'Storefront studio'], ['/admin/promotions', 'Coupons'], ['/marketing/rewards', 'Rewards & credit'], ['/marketing/settings', 'Settings']],
  driver: [['/driver/history', 'History'], ['/driver/earnings', 'Earnings']],
  admin: [['/admin/orders', 'Orders'], ['/admin/dispatch', 'Dispatch'], ['/admin/drivers', 'Drivers'], ['/admin/support', 'Support'], ['/admin/refunds', 'Refunds'], ['/admin/vendors', 'Vendors'], ['/admin/messages', 'Vendor messages'], ['/admin/stores', 'Stores'], ['/admin/catalogue', 'Catalogue'], ['/admin/dishes', 'Home-chef dishes'], ['/admin/taxonomy', 'Taxonomy'], ['/admin/zones', 'Delivery zones'], ['/admin/promotions', 'Promotions'], ['/admin/ads', 'Advertising'], ['/admin/studio', 'Storefront studio'], ['/admin/content', 'Content'], ['/admin/crm', 'Vendor pipeline'], ['/admin/finance', 'Finance'], ['/admin/insights', 'Insights'], ['/admin/reports', 'Reports'], ['/admin/settings', 'Settings & access'], ['/admin/system', 'System & audit']],
};
const AREA_LABEL: Record<string, string> = { vendor: 'Vendor portal (stores)', chef: 'Chef portal (home kitchens)', marketing: 'Marketing', driver: 'Driver', admin: 'Admin' };

export function ControlCentre() {
  const [tab, setTab] = useState('features');
  return (
    <Need perm={['control.manage']} what="the control centre">
      <PageHeader title="Control centre" sub="Switch features on or off, decide what each kind of vendor may do, and tailor every area’s menu. Changes apply within seconds and are recorded in the audit log." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'features', label: 'Shop features' }, { id: 'vendors', label: 'Vendor permissions' }, { id: 'areas', label: 'Menus & notices' }, { id: 'platform', label: 'Platform' }]} />
      {tab === 'features' && <Features />}{tab === 'vendors' && <VendorPerms />}{tab === 'areas' && <Areas />}{tab === 'platform' && <PlatformSwitches />}
    </Need>
  );
}

function Features() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Flag[]>('/admin/control/features');
  const [busy, setBusy] = useState<string | null>(null);
  const flip = async (k: string, enabled: boolean) => { setBusy(k); try { await put(`/admin/control/features/${k}`, { enabled }); await reload(); toast(`${enabled ? 'Switched on' : 'Switched off'}.`); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); } };
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  const groups = [...new Set(data!.map((f) => f.grp))];
  return (
    <div className="cc-grid two">
      {groups.map((g) => (
        <section key={g} className="cc-card"><header>{g}</header>
          {data!.filter((f) => f.grp === g).map((f) => <div key={f.key} className="cc-row"><Switch checked={f.enabled} busy={busy === f.key} onChange={(v) => flip(f.key, v)} label={f.label} hint={f.description} /></div>)}
        </section>))}
    </div>
  );
}

function VendorPerms() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<VCap>('/admin/control/vendor-capabilities');
  const [q, setQ] = useState('');
  const setDefault = async (k: string, v: boolean) => { try { await put('/admin/control/vendor-capabilities/defaults', { [k]: v }); await reload(); } catch (e: any) { toast(e.message, 'error'); } };
  const setVendor = async (id: string, k: string, v: boolean | null) => { try { await put(`/admin/control/vendor-capabilities/${id}`, { [k]: v }); await reload(); } catch (e: any) { toast(e.message, 'error'); } };
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  const keys = Object.keys(data!.caps);
  const rows = data!.vendors.filter((v) => v.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Notice>The first row is the rule for <strong>every</strong> vendor. Below it, a vendor can be allowed or blocked individually (outlined switches are overrides). “Reset” returns a vendor to the rule for everyone.</Notice>
      <div className="cc-card cc-scroll">
        <table className="cc-matrix">
          <thead><tr><th>Vendor</th>{keys.map((k) => <th key={k} title={data!.caps[k]}>{data!.caps[k].split(' ').slice(0, 3).join(' ')}</th>)}<th /></tr></thead>
          <tbody>
            <tr><td><strong>Everyone (default)</strong></td>{keys.map((k) => <td key={k}><Switch label={`Default: ${data!.caps[k]}`} checked={data!.defaults[k] !== false} onChange={(v) => setDefault(k, v)} /></td>)}<td /></tr>
            {rows.map((v) => (
              <tr key={v.id}><td><strong>{v.name}</strong> <span className="muted small">{v.kind === 'chef' ? 'chef' : 'store'} · {v.status}</span></td>
                {keys.map((k) => <td key={k} className={k in v.capabilities ? 'ovr' : ''}><Switch label={`${v.name}: ${data!.caps[k]}`} checked={v.effective[k]} onChange={(on) => setVendor(v.id, k, on)} /></td>)}
                <td>{Object.keys(v.capabilities).length > 0 && <Button size="sm" variant="ghost" onClick={() => Promise.all(Object.keys(v.capabilities).map((k) => setVendor(v.id, k, null)))}>Reset</Button>}</td></tr>))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, maxWidth: 320 }}><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter vendors" aria-label="Filter vendors" /></div>
    </>
  );
}

function Areas() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<PortalCfg[]>('/admin/control/portals');
  const [portal, setPortal] = useState('vendor');
  const cur = data?.find((p) => p.portal === portal);
  const [hidden, setHidden] = useState<string[]>([]); const [notice, setNotice] = useState(''); const [tone, setTone] = useState<'info' | 'warn'>('info');
  useEffect(() => { if (cur) { setHidden(cur.hidden_nav); setNotice(cur.notice ?? ''); setTone(cur.notice_tone); } }, [cur?.portal, cur?.hidden_nav.join(','), cur?.notice]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useAction(async () => { await put(`/admin/control/portals/${portal}`, { hidden_nav: hidden, notice: notice.trim() || null, notice_tone: tone }); toast('Saved. People see it the next time they open or refresh the page.'); reload(); });
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  return (
    <div className="cc-grid two">
      <section className="cc-card"><header>Area</header>
        <div className="cc-row"><Select value={portal} onChange={(e) => setPortal(e.target.value)} aria-label="Area">{Object.entries(AREA_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></div>
        <div className="cc-row"><b>Notice shown at the top of every page</b>
          <Textarea value={notice} onChange={(e) => setNotice(e.target.value)} maxLength={300} rows={3} placeholder="e.g. Payouts are paused on Dec 24–26" aria-label="Notice" />
          <Select value={tone} onChange={(e) => setTone(e.target.value as 'info' | 'warn')} aria-label="Notice style"><option value="info">Information</option><option value="warn">Warning</option></Select></div>
        <div className="cc-row"><Button busy={save.busy} onClick={() => save.run()}>Save</Button> {save.error && <span className="error-text">{save.error}</span>}</div>
      </section>
      <section className="cc-card"><header>Menu items shown in {AREA_LABEL[portal]}</header>
        <div className="cc-row muted small">Switch off what this team does not need. The Dashboard always stays. People can still reach a hidden page by its address if their role allows it; this only tidies the menu. Use Vendor permissions to actually block an action.</div>
        {AREA_NAV[portal].map(([to, label]) => <div key={to} className="cc-row"><Switch checked={!hidden.includes(to)} onChange={(on) => setHidden(on ? hidden.filter((h) => h !== to) : [...hidden, to])} label={label} /></div>)}
      </section>
    </div>
  );
}

function PlatformSwitches() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Platform[]>('/admin/control/platform');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  return (
    <>
    <section className="cc-card"><header>Platform rules</header>
      {data!.map((s) => <div key={s.key} className="cc-row"><Switch checked={s.enabled} label={s.label} hint={s.description} onChange={async (v) => { try { await put(`/admin/control/platform/${s.key}`, { enabled: v }); await reload(); toast('Saved.'); } catch (e: any) { toast(e.message, 'error'); } }} /></div>)}
      <div className="cc-row muted small">Money rules (commission, tax, fees, hold days) stay in <b>Settings &amp; access</b>.</div>
    </section>
    </>
  );
}

