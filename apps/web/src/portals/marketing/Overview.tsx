import { Link } from 'react-router-dom';
import { useState } from 'react';
import { money } from '../../api';
import { useApi } from '../../hooks';
import { Badge, Card, DataTable, ErrorBox, Loading, Notice, PageHeader, Seg, Stat } from './kit';
import { fmtDate } from '../../api';

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');

export function Dashboard() {
  const { data: d, loading, error, reload } = useApi<any>('/marketing/dashboard');
  if (loading && !d) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!d) return null;
  return (
    <>
      <PageHeader title="Marketing" sub="Reach customers who have agreed to hear from us, and see what happened." />
      {!d.sender_ready && <Notice tone="warn"><strong>Before you can send email:</strong> add your sender name and postal address in <Link to="/marketing/settings">Settings</Link>. Canadian anti-spam law requires both in every marketing email.</Notice>}
      <div className="grid cols-4">
        <Stat label="Can receive marketing email" value={d.audience} sub={`${d.opted_in} of ${d.customers} customers opted in`} />
        <Stat label="Emails queued (30 days)" value={d.mail.sent} sub={`${d.mail.clickers} ${d.mail.clickers === 1 ? 'person' : 'people'} clicked · ${d.mail.unsubs} unsubscribed`} />
        <Stat label="Ad impressions / clicks (30 days)" value={`${d.ads.impressions} / ${d.ads.clicks}`} sub={`Click rate ${pct(d.ads.clicks, d.ads.impressions)}`} />
        <Stat label="Coupon orders (30 days)" value={d.coupons.redemptions} sub={`${money(d.coupons.discount_cents)} in discounts given`} />
      </div>
      <h2>To do</h2>
      <div className="grid cols-4">
        <Link className="stat" to="/marketing/emails"><span className="stat-label">Draft emails</span><strong className="stat-value">{d.todo.drafts}</strong><span className="muted small">{d.todo.scheduled} scheduled</span></Link>
        <Link className="stat" to="/marketing/campaigns"><span className="stat-label">Active campaigns</span><strong className="stat-value">{d.todo.active_campaigns}</strong></Link>
        <Link className="stat" to="/marketing/social"><span className="stat-label">Posts due in 3 days</span><strong className="stat-value">{d.todo.posts_soon}</strong></Link>
        <Link className="stat" to="/admin/ads"><span className="stat-label">Ads awaiting approval</span><strong className="stat-value">{d.todo.ads_pending}</strong></Link>
      </div>
      <Notice>Opens are not tracked, on purpose. Clicks are counted on links written as <code>{'{{link:/deals}}'}</code>. Every email carries your address and an unsubscribe link, and consent is checked again at the moment each email is sent.</Notice>
    </>
  );
}

export function Analytics() {
  const [days, setDays] = useState(30);
  const { data: d, loading, error, reload } = useApi<any>(`/marketing/analytics?days=${days}`);
  return (
    <>
      <PageHeader title="Analytics" sub="What happened. These are counts, not proof of cause." />
      <Seg value={String(days)} onChange={(v) => setDays(Number(v))} options={[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} label="Period" />
      {loading && !d && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {d && <>
        <Card><h2>Email campaigns sent</h2>
          <DataTable rows={d.emails} rowKey={(r: any) => r.id} empty="No campaigns sent in this period." columns={[
            { key: 'n', header: 'Campaign', render: (r: any) => <Link to={`/marketing/emails/${r.id}`}>{r.name}</Link> }, { key: 'w', header: 'Sent', render: (r: any) => fmtDate(r.queued_at) }, { key: 'r', header: 'Recipients', render: (r: any) => r.recipients },
            { key: 'c', header: 'Clicked', render: (r: any) => `${r.clickers} (${pct(r.clickers, r.recipients)})` }, { key: 'k', header: 'Clicks', render: (r: any) => r.clicks }, { key: 'u', header: 'Unsubscribed', render: (r: any) => r.unsubscribed }]} /></Card>
        <div className="grid cols-2">
          <Card><h2>Coupons</h2><DataTable rows={d.coupons} rowKey={(r: any) => r.code} empty="No coupons." columns={[{ key: 'c', header: 'Code' }, { key: 'o', header: 'Orders', render: (r: any) => r.orders }, { key: 'd', header: 'Discounts', render: (r: any) => money(r.discount_cents) }, { key: 'm', header: 'Items sold', render: (r: any) => money(r.merchandise_cents) }]} /></Card>
          <Card><h2>Sponsored ads</h2><p>{d.ads.impressions} impressions · {d.ads.clicks} clicks · click rate {pct(d.ads.clicks, d.ads.impressions)}</p><h2>Searches with no results</h2>
            <DataTable rows={d.unmet_searches} rowKey={(r: any) => r.query} empty="None." columns={[{ key: 'q', header: 'Search' }, { key: 's', header: 'Times', render: (r: any) => r.searches }]} /></Card>
        </div>
        <Card><h2>Consent over time</h2><DataTable rows={d.growth} rowKey={(r: any) => r.week} empty="No changes in this period." columns={[{ key: 'w', header: 'Week of' }, { key: 'i', header: 'Opted in', render: (r: any) => r.opt_ins }, { key: 'o', header: 'Opted out', render: (r: any) => r.opt_outs }]} /></Card>
      </>}
      <span hidden><Badge>.</Badge></span>
    </>
  );
}
