import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Download } from 'lucide-react'
import { raw, useStore } from './useStore'

/** Update prices and stock for many products at once from a spreadsheet (CSV). Check first, then import. */
export default function Import() {
  const store = useStore()
  const [csv, setCsv] = useState(''); const [res, setRes] = useState(null); const [hist, setHist] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const file = useRef(null)
  const loadHist = useCallback(() => { if (store) raw('GET', `/vendor/stores/${store.id}/imports`).then(setHist).catch(() => setHist([])) }, [store])
  useEffect(() => { loadHist() }, [loadHist])
  const run = async (dry) => {
    setBusy(true); setError('')
    try { const r = await raw('POST', `/vendor/stores/${store.id}/import`, { csv, dry_run: dry }); setRes(r); if (!dry) loadHist() } catch (e) { setError(e.response?.data?.detail || e.message) } finally { setBusy(false) }
  }
  const template = async () => {
    const r = await fetch('/api/vendor/import-template', { credentials: 'include', headers: { 'x-area': 'vendor' } })
    const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = 'eazyfoods-import-template.csv'; a.click()
  }
  const card = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5'
  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Import from a spreadsheet</h1><p className="text-xs sm:text-sm text-gray-600 mt-1">Update prices and stock for many products at once, and add new products. A row whose barcode is not in the catalogue yet is created when it has a name.</p></div>
      <div className={card}>
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" onClick={template} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><Download className="h-4 w-4" /> Download the template</button>
          <button type="button" onClick={() => file.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><Upload className="h-4 w-4" /> Choose a CSV file</button>
          <input ref={file} type="file" accept=".csv,text/csv" className="hidden" aria-label="CSV file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setCsv(await f.text()); setRes(null) } e.target.value = '' }} />
        </div>
        <label htmlFor="csv" className="block text-sm font-medium text-gray-700 mb-1">CSV contents</label>
        <textarea id="csv" rows={8} value={csv} onChange={(e) => { setCsv(e.target.value); setRes(null) }} placeholder="barcode,sku,slug,name,unit,price,stock,active" className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" disabled={!csv.trim() || busy} onClick={() => run(true)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Check (dry run)</button>
          <button type="button" disabled={!csv.trim() || busy || !res?.dry_run || res.succeeded === 0} onClick={() => run(false)} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">Import {res?.dry_run ? `${res.succeeded} valid row(s)` : ''}</button>
        </div>
        {res && (
          <div className="mt-4 text-sm">
            <p className="font-medium">{res.dry_run ? 'Check result' : 'Imported'}: {res.succeeded} of {res.total_rows} rows OK{res.failed ? `, ${res.failed} need fixing` : ''}.{res.created ? ` ${res.created} new product${res.created === 1 ? '' : 's'} will be created${res.needs_review ? ' and checked by our team before shoppers see them' : ''}.` : ''}</p>
            {res.errors?.length > 0 && <ul className="mt-2 text-red-700 list-disc pl-5">{res.errors.slice(0, 20).map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}</ul>}
          </div>
        )}
      </div>
      <div className={card}>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Recent imports</h2>
        {hist.length ? <ul className="divide-y divide-gray-100 text-sm">{hist.map((h) => <li key={h.id} className="py-2 flex justify-between"><span>{new Date(h.created_at).toLocaleString()}</span><span>{h.succeeded} OK{h.failed ? `, ${h.failed} failed` : ''} of {h.total_rows}</span></li>)}</ul> : <p className="text-sm text-gray-500">No imports yet.</p>}
      </div>
    </div>
  )
}
