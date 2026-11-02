import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { makeHttp } from '../http'

const { raw } = makeHttp('vendor')

/** Chat with the customer about this order (store and kitchen portals). New messages appear by themselves. */
const OrderChat = ({ suborderId }) => {
  const [chat, setChat] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const end = useRef(null)
  const load = useCallback(async () => { try { setChat(await raw('GET', `/vendor/suborders/${suborderId}/messages`)) } catch { /* not available */ } }, [suborderId])
  useEffect(() => { load(); const f = () => load(); window.addEventListener('ez-live', f); return () => window.removeEventListener('ez-live', f) }, [load])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [chat?.messages?.length])
  if (!chat) return null
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return
    setBusy(true); setErr('')
    try { setChat(await raw('POST', `/vendor/suborders/${suborderId}/messages`, { body: text.trim() })); setText('') } catch (er) { setErr(er.response?.data?.detail || er.message || 'Could not send.') } finally { setBusy(false) }
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary-600" /> Messages with the customer</h2>
      <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5 py-1" role="log" aria-live="polite" aria-label="Messages with the customer">
        {chat.messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
        {chat.messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm break-words ${m.sender === 'store' ? 'ml-auto bg-primary-600 text-white rounded-br-sm' : 'mr-auto bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
            {m.body}
            <div className={`text-[10px] mt-0.5 ${m.sender === 'store' ? 'text-white/80' : 'text-gray-500'}`}>{m.sender === 'store' ? 'You' : 'Customer'} · {new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
          </div>))}
        <div ref={end} />
      </div>
      {chat.open ? (
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" aria-label="Message to the customer" className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
          <button type="submit" disabled={busy || !text.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">Send</button>
        </form>) : <p className="mt-2 text-sm text-gray-500">This conversation is closed.</p>}
      {err && <p role="alert" className="mt-1 text-sm text-red-600">{err}</p>}
    </div>
  )
}

export default OrderChat
