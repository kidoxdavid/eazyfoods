import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, fmtDate, post } from '../api';
import { Button } from '../ui';

type Msg = { id: string; sender: 'customer' | 'store'; body: string; created_at: string };
type Chat = { open: boolean; store_name: string; messages: Msg[] };

/** Chat with the store about one order. Opens under "Message the store"; new messages appear by themselves. */
export function OrderChat({ suborderId, storeName }: { suborderId: string; storeName: string }) {
  const [chat, setChat] = useState<Chat | null>(null); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [shown, setShown] = useState(false); const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => { try { setChat(await api<Chat>(`/orders/suborders/${suborderId}/messages`)); } catch { /* the order may not be chat-able yet */ } }, [suborderId]);
  useEffect(() => { load(); const f = () => load(); window.addEventListener('ez-live', f); return () => window.removeEventListener('ez-live', f); }, [load]);
  useEffect(() => { if (shown) end.current?.scrollIntoView({ block: 'nearest' }); }, [shown, chat?.messages.length]);
  if (!chat) return null;
  const unread = chat.messages.filter((m) => m.sender === 'store').length;
  const send = async (e: FormEvent) => {
    e.preventDefault(); if (!text.trim()) return; setBusy(true); setErr('');
    try { setChat(await post<Chat>(`/orders/suborders/${suborderId}/messages`, { body: text.trim() })); setText(''); } catch (er: any) { setErr(er.message ?? 'Could not send.'); } finally { setBusy(false); }
  };
  return (
    <details className="ochat" onToggle={(e) => setShown((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Message {storeName}{chat.messages.length > 0 && <span className="muted small"> · {chat.messages.length} message{chat.messages.length === 1 ? '' : 's'}{unread ? `, ${unread} from the store` : ''}</span>}</summary>
      <div className="ochat-list" role="log" aria-live="polite" aria-label={`Messages with ${storeName}`}>
        {chat.messages.length === 0 && <p className="muted small">No messages yet. Ask the store anything about this order.</p>}
        {chat.messages.map((m) => <div key={m.id} className={`ochat-msg ${m.sender}`}><span>{m.body}</span><small>{m.sender === 'store' ? storeName : 'You'} · {fmtDate(m.created_at, { dateStyle: 'short', timeStyle: 'short' })}</small></div>)}
        <div ref={end} />
      </div>
      {chat.open ? (
        <form className="row ochat-form" onSubmit={send}>
          <input className="input" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" aria-label={`Message to ${storeName}`} />
          <Button type="submit" busy={busy} disabled={!text.trim()}>Send</Button>
        </form>) : <p className="muted small">This conversation is closed.</p>}
      {err && <p className="error-text small">{err}</p>}
    </details>
  );
}
