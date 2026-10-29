import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Mail, MousePointerClick, Tag, Megaphone, Share2, Image as ImageIcon } from 'lucide-react'
import { useApi } from '../../shared/hooks'
import { money, fmtDate } from '../../shared/client'
import { Alert, Card, DataTable, PageHeader, Spinner, Stat, Tabs } from '../../shared/ui'

const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—')

export function Dashboard() {
  const { data: d, loading, error } = useApi('/marketing/dashboard')
  if (loading && !d) return <Spinner />
  if (error) return <Alert>{error}</Alert>
  if (!d) return null
  const todo = [
    ['/emails', 'Draft emails', d.todo.drafts, `${d.todo.scheduled} scheduled`, Mail], ['/campaigns', 'Active campaigns', d.todo.active_campaigns, null, Megaphone],
    ['/social', 'Posts due in 3 days', d.todo.posts_soon, null, Share2], ['/coupons', 'Coupons', 'Manage', null, Tag],
  ]
  return (
    <>
      <PageHeader title="Marketing Dashboard" sub="Reach customers who have agreed to hear from us, and see what happened." />
      {!d.sender_ready && <Alert tone="warn"><strong>Before you can send email:</strong> add your sender name and postal address in <Link className="underline" to="/settings">Settings</Link>. Canadian anti-spam law requires both in every marketing email.</Alert>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Stat icon={Users} label="Can receive marketing email" value={d.audience} sub={`${d.opted_in} of ${d.customers} customers opted in`} />
        <Stat icon={Mail} label="Emails queued (30 days)" value={d.mail.sent} sub={`${d.mail.clickers} clicked · ${d.mail.unsubs} unsubscribed`} tone="text-blue-500" />
        <Stat icon={MousePointerClick} label="Ad impressions / clicks (30 days)" value={`${d.ads.impressions} / ${d.ads.clicks}`} sub={`Click rate ${pct(d.ads.clicks, d.ads.impressions)}`} tone="text-green-500" />
        <Stat icon={Tag} label="Coupon orders (30 days)" value={d.coupons.redemptions} sub={`${money(d.coupons.discount_cents)} in discounts given`} tone="text-purple-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">To do</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {todo.map(([to, label, value, sub, Icon]) => (
          <Link key={label} to={to} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:border-primary-500 hover:shadow-md transition">
            <Icon className="h-5 w-5 text-primary-600 mb-1 sm:mb-2" /><p className="text-sm text-gray-600">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p>{sub && <p className="text-xs text-gray-500">{sub}</p>}
          </Link>
        ))}
      </div>
      <Alert tone="info">Opens are not tracked, on purpose. Clicks are counted on links written as <code>{'{{link:/deals}}'}</code>. Every email carries your address and an unsubscribe link, and consent is checked again at the moment each email is sent.</Alert>
    </>
  )
}

export function Analytics() {
  const [days, setDays] = useState('30')
  const { data: d, loading, error } = useApi(`/marketing/analytics?days=${days}`)
  return (
    <>
      <PageHeader title="Analytics" sub="What happened. These are counts, not proof of cause." />
      <Tabs value={days} onChange={setDays} tabs={[{ id: '7', label: 'Last 7 days' }, { id: '30', label: 'Last 30 days' }, { id: '90', label: 'Last 90 days' }]} />
      {loading && !d && <Spinner className="h-40" />}
      {error && <Alert>{error}</Alert>}
      {d && (
        <>
          <Card title="Email campaigns sent">
            <DataTable rows={d.emails} empty="No campaigns sent in this period." columns={[
              { key: 'n', header: 'Campaign', render: (r) => <Link className="text-primary-700 hover:underline" to={`/emails/${r.id}`}>{r.name}</Link> }, { key: 'w', header: 'Sent', render: (r) => fmtDate(r.queued_at) },
              { key: 'r', header: 'Recipients', render: (r) => r.recipients }, { key: 'c', header: 'Clicked', render: (r) => `${r.clickers} (${pct(r.clickers, r.recipients)})` }, { key: 'k', header: 'Clicks', render: (r) => r.clicks }, { key: 'u', header: 'Unsubscribed', render: (r) => r.unsubscribed }]} />
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <Card title="Coupons"><DataTable rows={d.coupons} rowKey={(r) => r.code} empty="No coupons." columns={[{ key: 'code', header: 'Code' }, { key: 'o', header: 'Orders', render: (r) => r.orders }, { key: 'd', header: 'Discounts', render: (r) => money(r.discount_cents) }, { key: 'm', header: 'Items sold', render: (r) => money(r.merchandise_cents) }]} /></Card>
            <Card title="Sponsored ads and searches">
              <p className="text-sm text-gray-700">{d.ads.impressions} impressions · {d.ads.clicks} clicks · click rate {pct(d.ads.clicks, d.ads.impressions)}</p>
              <h3 className="font-medium text-gray-900 mt-4 mb-2">Searches with no results</h3>
              <DataTable rows={d.unmet_searches} rowKey={(r) => r.query} empty="None." columns={[{ key: 'query', header: 'Search' }, { key: 's', header: 'Times', render: (r) => r.searches }]} />
            </Card>
          </div>
          <Card title="Consent over time"><DataTable rows={d.growth} rowKey={(r) => r.week} empty="No changes in this period." columns={[{ key: 'week', header: 'Week of' }, { key: 'i', header: 'Opted in', render: (r) => r.opt_ins }, { key: 'o', header: 'Opted out', render: (r) => r.opt_outs }]} /></Card>
        </>
      )}
      <span hidden><ImageIcon /></span>
    </>
  )
}
