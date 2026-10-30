import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { raw } from './useStore'

const money = (c) => `$${((c ?? 0) / 100).toFixed(2)}`
const fmt = (d) => new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })

/** The settlement report: every order from gross sales to what you earn, as a table and as a CSV for your bookkeeper. */
export default function Reports() {
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const qs = new URLSearchParams(); if (from) qs.set('from', from); if (to) qs.set('to', to)
  useEffect(() => { setData(null); raw('GET', `/vendor/reports/settlement?${qs}`).then(setData).catch(() => setData({ rows: [], totals: {}, definitions: {} })) }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps
  const t = data?.totals || {}
  const card = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5'
  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settlement report</h1><p className="text-xs sm:text-sm text-gray-600 mt-1">Every order, from gross sales to what you earn.</p></div>
        <a href={`/api/vendor/reports/settlement?format=csv&${qs}`} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50"><Download className="h-4 w-4" /> Download CSV</a>
      </div>
      <div className="px-3 py-2 rounded-lg text-sm bg-amber-50 border border-amber-200 text-amber-900">Gross sales are not profit. Your costs (stock, rent, wages) are not included here.</div>
      <div className={`${card} flex flex-wrap items-end gap-3`}>
        <div><label htmlFor="from" className="block text-xs font-medium text-gray-700 mb-1">From</label><input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg" /></div>
        <div><label htmlFor="to" className="block text-xs font-medium text-gray-700 mb-1">To</label><input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg" /></div>
        <button type="button" onClick={() => { setFrom(''); setTo('') }} className="px-3 py-2 text-sm text-primary-700 hover:underline">Last 30 days</button>
      </div>
      {!data ? <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[['Gross sales', money(t.gross_cents), `${t.orders ?? 0} orders`], ['Commission', `− ${money(t.commission_cents)}`], ['Refunds charged to you', `− ${money(t.refunds_charged_cents)}`], ['Net settlement', money(t.net_settlement_cents)],
              ['Discounts (paid by EAZyfoods)', money(t.discounts_cents)], ['GST collected', money(t.tax_collected_cents)]].map(([l, v, s]) => (
              <div key={l} className={card}><p className="text-xs sm:text-sm text-gray-600">{l}</p><p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{v}</p>{s && <p className="text-xs text-gray-500">{s}</p>}</div>
            ))}
          </div>
          <details className={card}><summary className="cursor-pointer text-sm font-medium">Definitions</summary><dl className="mt-2 text-sm space-y-1">{Object.entries(data.definitions || {}).map(([k, v]) => <div key={k}><dt className="inline font-medium capitalize">{k.replace(/_/g, ' ')}: </dt><dd className="inline text-gray-600">{v}</dd></div>)}</dl></details>
          {/* Phones and tablets: one card per order, so nothing scrolls sideways. */}
          <div className="lg:hidden space-y-2">
            {data.rows.length === 0 ? <p className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">No orders in this period.</p> : data.rows.map((r) => (
              <div key={r.order_number} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong>#{r.order_number}</strong><div className="text-xs text-gray-500">{fmt(r.placed_at)}</div></div><span className="text-xs text-gray-600 text-right">{r.status}</span></div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><dt className="text-gray-500">Gross</dt><dd>{money(r.gross_cents)}</dd></div>
                  <div><dt className="text-gray-500">Commission</dt><dd>{money(r.commission_cents)}</dd></div>
                  <div><dt className="text-gray-500">Refunds</dt><dd>{money(r.refunds_charged_cents)}</dd></div>
                  <div><dt className="text-gray-500">Net</dt><dd className="font-semibold">{money(r.net_settlement_cents)}</dd></div>
                  <div className="col-span-2"><dt className="text-gray-500">Payout</dt><dd>{r.payout_state}</dd></div>
                </dl>
              </div>
            ))}
          </div>
          <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>{['Order', 'Placed', 'Status', 'Gross', 'Commission', 'Refunds', 'Net', 'Payout'].map((h) => <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No orders in this period.</td></tr> : data.rows.map((r) => (
                  <tr key={r.order_number}><td className="px-4 py-3 font-medium">#{r.order_number}</td><td className="px-4 py-3">{fmt(r.placed_at)}</td><td className="px-4 py-3">{r.status}</td><td className="px-4 py-3">{money(r.gross_cents)}</td><td className="px-4 py-3">{money(r.commission_cents)}</td><td className="px-4 py-3">{money(r.refunds_charged_cents)}</td><td className="px-4 py-3 font-semibold">{money(r.net_settlement_cents)}</td><td className="px-4 py-3">{r.payout_state}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
