import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, ScanLine, PackagePlus, ClipboardCheck } from 'lucide-react'
import api from '../services/api'
import BarcodeScanner from '../components/BarcodeScanner'

/** Receive a delivery or count the shelf by scanning: scan an item, enter how many, and the stock is updated and written to the stock history. */
export default function StockScan() {
  const [mode, setMode] = useState('receive')   // receive: add to stock; count: set stock to what is on the shelf
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState(null)       // { product } | { notFound, barcode }
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [log, setLog] = useState([])
  const qtyRef = useRef(null)

  const onScan = async (code) => {
    setScanning(false); setError(''); setQty('')
    try {
      const { data } = await api.get('/barcode/lookup', { params: { barcode: code } })
      setFound({ product: data })
      setTimeout(() => qtyRef.current?.focus(), 50)
    } catch { setFound({ notFound: true, barcode: code }) }
  }

  const apply = async (e) => {
    e.preventDefault()
    const p = found.product, n = Number(qty)
    if (!Number.isInteger(n) || n < 0 || (mode === 'receive' && n < 1)) { setError(mode === 'receive' ? 'Enter how many arrived (1 or more).' : 'Enter how many are on the shelf (0 or more).'); return }
    const delta = mode === 'receive' ? n : n - p.stock_quantity
    if (delta === 0) { setLog((l) => [{ id: Date.now(), name: p.name, text: `Counted ${n}, no change`, total: p.stock_quantity }, ...l]); setFound(null); return }
    setBusy(true); setError('')
    try {
      await api.post('/inventory/adjustments', { product_id: p.id, adjustment_type: mode === 'receive' ? 'stock_in' : 'adjustment', quantity_change: delta, reason: mode === 'receive' ? 'Delivery received' : 'Stock count' })
      setLog((l) => [{ id: Date.now(), name: p.name, text: mode === 'receive' ? `Received +${n}` : `Counted ${n} (${delta > 0 ? '+' : ''}${delta})`, total: p.stock_quantity + delta }, ...l])
      setFound(null)
    } catch (err) { setError(err.response?.data?.detail || err.response?.data?.message || 'Could not update the stock.') } finally { setBusy(false) }
  }

  const card = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5'
  const tab = (m, Icon, label) => (
    <button type="button" onClick={() => { setMode(m); setFound(null); setError('') }} aria-pressed={mode === m}
      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border ${mode === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}><Icon className="h-4 w-4" /> {label}</button>
  )
  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Scan stock</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Scan items to receive a delivery or count the shelf. Every change is saved in the stock history.</p>
      </div>
      <div className={card}>
        <div className="flex gap-2 mb-4" role="group" aria-label="What are you doing?">{tab('receive', PackagePlus, 'Receive delivery')}{tab('count', ClipboardCheck, 'Count shelf')}</div>
        <p className="text-sm text-gray-600 mb-3">{mode === 'receive' ? 'Enter how many arrived. It is added to what you already have.' : 'Enter how many are on the shelf now. Stock is set to that number.'}</p>
        {!found && (
          <button type="button" onClick={() => setScanning(true)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Camera className="h-5 w-5" /> {log.length ? 'Scan next item' : 'Scan an item'}
          </button>
        )}
        {found?.notFound && (
          <div role="status" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <p className="font-medium text-amber-800">No product in your store has the barcode {found.barcode}.</p>
            <div className="flex gap-3 mt-2">
              <Link to="/products/new" state={{ barcode: found.barcode }} className="text-primary-700 underline">Add it as a new product</Link>
              <button type="button" onClick={() => setFound(null)} className="text-gray-700 underline">Scan another</button>
            </div>
          </div>
        )}
        {found?.product && (
          <form onSubmit={apply} className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{found.product.name}</p>
              <p className="text-sm text-gray-600">In stock now: <strong>{found.product.stock_quantity}</strong>{found.product.reserved ? ` (${found.product.reserved} held for open orders)` : ''}</p>
            </div>
            <div>
              <label htmlFor="scan-qty" className="block text-sm font-medium text-gray-700 mb-1">{mode === 'receive' ? 'How many arrived?' : 'How many are on the shelf?'}</label>
              <input id="scan-qty" ref={qtyRef} type="number" inputMode="numeric" min={mode === 'receive' ? 1 : 0} value={qty} onChange={(e) => setQty(e.target.value)} className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{mode === 'receive' ? 'Add to stock' : 'Save count'}</button>
              <button type="button" onClick={() => { setFound(null); setError('') }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        )}
      </div>
      <div className={card}>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2"><ScanLine className="h-5 w-5" /> This session</h2>
        {log.length ? (
          <ul className="divide-y divide-gray-100 text-sm">{log.map((l) => <li key={l.id} className="py-2 flex justify-between gap-3"><span>{l.name}</span><span className="text-gray-600 text-right">{l.text} · now {l.total}</span></li>)}</ul>
        ) : <p className="text-sm text-gray-500">Nothing scanned yet.</p>}
      </div>
      {scanning && <BarcodeScanner onScan={onScan} onClose={() => setScanning(false)} title={mode === 'receive' ? 'Scan an item you received' : 'Scan an item to count'} />}
    </div>
  )
}
