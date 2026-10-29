import { useEffect, useMemo, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { Printer } from 'lucide-react'
import api from '../services/api'

const SIZES = { small: { label: 'Small (50 × 30 mm)', w: '50mm', h: '30mm', bar: 40, font: 10 }, medium: { label: 'Medium (70 × 40 mm)', w: '70mm', h: '40mm', bar: 60, font: 12 } }
const FORMAT = { 13: 'EAN13', 12: 'UPC', 8: 'EAN8' }

function Bars({ code, height, font }) {
  const ref = (el) => {
    if (!el) return
    const opts = { width: 1.6, height, fontSize: font, margin: 2, displayValue: true }
    try { JsBarcode(el, code, { ...opts, format: FORMAT[code.length] || 'CODE128' }) }
    catch { try { JsBarcode(el, code, { ...opts, format: 'CODE128' }) } catch { /* unreadable code: leave blank */ } }   // a number with a wrong check digit is still printable as Code 128
  }
  return <svg ref={ref} className="max-w-full" role="img" aria-label={`Barcode ${code}`} />
}

/** Print shelf and product labels: name, price and a scannable barcode. */
export default function Labels() {
  const [items, setItems] = useState(null)
  const [pick, setPick] = useState({})            // product id -> copies
  const [size, setSize] = useState('small')
  const [showPrice, setShowPrice] = useState(true)
  const [note, setNote] = useState('')
  const load = () => api.get('/products').then((r) => setItems(r.data)).catch(() => setItems([]))
  useEffect(() => { load() }, [])

  const toggle = (p) => setPick((s) => { const n = { ...s }; if (n[p.id]) delete n[p.id]; else n[p.id] = 1; return n })
  const make = async (p) => {
    setNote('')
    try { await api.post('/barcode/generate', null, { params: { product_id: p.id } }); await load() }
    catch (e) { setNote(e.response?.data?.detail || e.response?.data?.message || 'This barcode could not be created.') }
  }
  const labels = useMemo(() => (items || []).filter((p) => pick[p.id] && p.barcode).flatMap((p) => Array.from({ length: pick[p.id] }, (_, i) => ({ key: `${p.id}-${i}`, p }))), [items, pick])
  const sz = SIZES[size]
  const card = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5'
  const money = (p) => `$${Number(p.sale_price || p.price).toFixed(2)}`

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <style>{`@media print { body * { visibility: hidden } .label-sheet, .label-sheet * { visibility: visible } .label-sheet { position: absolute; left: 0; top: 0; display: flex; flex-wrap: wrap } @page { margin: 6mm } }`}</style>
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Barcode labels</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Choose the products and how many labels of each, then print. Products without a barcode can be given one first.</p>
      </div>
      <div className={card}>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div><label htmlFor="label-size" className="block text-sm font-medium text-gray-700 mb-1">Label size</label>
            <select id="label-size" value={size} onChange={(e) => setSize(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 pb-2"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Show price</label>
          <button type="button" disabled={!labels.length} onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"><Printer className="h-4 w-4" /> Print {labels.length || ''} label{labels.length === 1 ? '' : 's'}</button>
        </div>
        {note && <p role="alert" className="mb-2 text-sm text-red-700">{note}</p>}
        {items === null ? <p className="text-sm text-gray-500">Loading…</p> : !items.length ? <p className="text-sm text-gray-500">No products yet.</p> : (
          <ul className="divide-y divide-gray-100">
            {items.map((p) => (
              <li key={p.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                {p.barcode ? <input type="checkbox" aria-label={`Print labels for ${p.name}`} checked={!!pick[p.id]} onChange={() => toggle(p)} /> : <span className="w-4" />}
                <span className="flex-1 min-w-[10rem]">{p.name}<span className="block text-xs text-gray-500 font-mono">{p.barcode || 'No barcode'}</span></span>
                {p.barcode ? (pick[p.id] ? <label className="inline-flex items-center gap-1 text-gray-600">Copies <input type="number" min={1} max={200} value={pick[p.id]} onChange={(e) => setPick((s) => ({ ...s, [p.id]: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))} aria-label={`Copies of ${p.name}`} className="w-16 px-2 py-1 border border-gray-300 rounded" /></label> : null)
                  : <button type="button" onClick={() => make(p)} className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Create barcode</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {labels.length > 0 && (
        <div className={card}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Preview</h2>
          <div className="label-sheet flex flex-wrap gap-2">
            {labels.map(({ key, p }) => (
              <div key={key} style={{ width: sz.w, height: sz.h }} className="border border-gray-300 rounded-sm p-1 flex flex-col items-center justify-between overflow-hidden bg-white text-black">
                <div className="w-full text-center leading-tight" style={{ fontSize: sz.font }}><span className="font-semibold line-clamp-1">{p.name}</span>{showPrice && <span className="block">{money(p)}</span>}</div>
                <Bars code={p.barcode} height={sz.bar} font={sz.font - 2} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
