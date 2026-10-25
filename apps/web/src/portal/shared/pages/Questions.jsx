import { useCallback, useEffect, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { raw } from './useStore'

/** Customer questions about what you sell. Your answer is shown on the product page for every shopper, so keep it short and honest. */
export default function Questions() {
  const [list, setList] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(() => raw('GET', '/questions/open').then(setList).catch(() => setList([])), [])
  useEffect(() => { load() }, [load])
  const send = async (id, body) => {
    setBusy(id); setError('')
    try { await raw('POST', `/questions/${id}/answer`, body); await load() } catch (e) { setError(e.response?.data?.detail || e.message) } finally { setBusy('') }
  }
  if (!list) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Customer questions</h1><p className="text-xs sm:text-sm text-gray-600 mt-1">Answer briefly and honestly. Do not share personal details. Answers are public.</p></div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>}
      {!list.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center"><MessageCircleQuestion className="h-10 w-10 text-gray-400 mx-auto mb-2" /><p className="text-gray-600">No questions waiting</p></div>
      ) : list.map((q) => (
        <form key={q.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5" onSubmit={(e) => { e.preventDefault(); send(q.id, { answer: new FormData(e.currentTarget).get('a') }) }}>
          <p className="font-medium text-gray-900">{q.product_name} <span className="text-xs text-gray-500 font-normal">· {new Date(q.created_at).toLocaleDateString()}</span></p>
          <p className="text-gray-700 my-2">“{q.question}”</p>
          <textarea name="a" rows={2} required minLength={2} maxLength={1000} placeholder="Your answer" aria-label={`Answer about ${q.product_name}`} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={busy === q.id} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">Publish answer</button>
            <button type="button" disabled={busy === q.id} onClick={() => send(q.id, { hide: true })} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Hide question</button>
          </div>
        </form>
      ))}
    </div>
  )
}
