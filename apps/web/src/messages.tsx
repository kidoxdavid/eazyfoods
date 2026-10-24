import { useEffect, useRef, useState } from 'react';
import { api, fmtDate, post } from './api';
import { useAction, useApi } from './hooks';
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, Notice, PageHeader, Select, Textarea } from './ui';

type Thread = { id: string; subject: string; status: 'open' | 'closed'; last_message_at: string; vendor_name: string; preview: string | null; unread: number };
type Detail = { thread: { id: string; subject: string; status: string; vendor_name?: string }; messages: { id: number; body: string; from_staff: boolean; created_at: string; author: string }[] };

/** Shared conversation screen. `base` is '/vendor/messages' or '/admin/messages'; staff sees every vendor, a vendor sees their own. */
export function MessagesPage({ base, staff }: { base: string; staff: boolean }) {
  const list = useApi<Thread[]>(base);
  const [sel, setSel] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  useEffect(() => { const t = setInterval(list.reload, 20000); return () => clearInterval(t); }, [list.reload]);
  return (
    <>
      <PageHeader title="Messages" sub={staff ? 'Conversations with vendors: onboarding, catalogue and payout questions.' : 'Talk to the EAZyfoods team about your store, catalogue or payouts.'} />
      <div className="row end" style={{ marginTop: 0, marginBottom: 10 }}><Button onClick={() => setComposing(true)}>New conversation</Button></div>
      {list.loading && !list.data && <Loading />}
      {list.error && <ErrorBox message={list.error} retry={list.reload} />}
      {list.data && !list.data.length && <Empty title="No conversations yet" />}
      <div className="msg-layout">
        <ul className="thread-list" role="list" aria-label="Conversations">
          {list.data?.map((t) => (
            <li key={t.id}><button className={`thread ${sel === t.id ? 'on' : ''}`} onClick={() => setSel(t.id)} aria-current={sel === t.id}>
              <span className="thread-top"><strong>{t.subject}</strong>{t.unread > 0 && <span className="count" aria-label={`${t.unread} unread`}>{t.unread}</span>}</span>
              <span className="small muted">{staff ? `${t.vendor_name} · ` : ''}{fmtDate(t.last_message_at)}{t.status === 'closed' ? ' · closed' : ''}</span>
              {t.preview && <span className="small thread-prev">{t.preview}</span>}
            </button></li>
          ))}
        </ul>
        {sel && <ThreadView key={sel} base={base} id={sel} staff={staff} onChanged={list.reload} onBack={() => setSel(null)} />}
      </div>
      {composing && <Compose base={base} staff={staff} onClose={() => setComposing(false)} onSent={(id) => { setComposing(false); list.reload(); setSel(id); }} />}
    </>
  );
}

function ThreadView({ base, id, staff, onChanged, onBack }: { base: string; id: string; staff: boolean; onChanged: () => void; onBack: () => void }) {
  const d = useApi<Detail>(`${base}/${id}`);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setInterval(d.reload, 15000); return () => clearInterval(t); }, [d.reload]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [d.data?.messages.length]);
  const send = useAction(async () => { await post(`${base}/${id}/reply`, { body: text }); setText(''); d.reload(); onChanged(); });
  const setStatus = useAction(async (status: string) => { await post(`${base}/${id}/status`, { status }); d.reload(); onChanged(); });
  if (d.loading && !d.data) return <Card><Loading /></Card>;
  if (d.error) return <ErrorBox message={d.error} retry={d.reload} />;
  if (!d.data) return null;
  const { thread, messages } = d.data;
  return (
    <Card className="thread-view">
      <div className="row between wrap">
        <div><Button variant="ghost" size="sm" className="back-only" onClick={onBack}>← All conversations</Button><h2 style={{ margin: 0 }}>{thread.subject}</h2>{thread.vendor_name && <span className="muted small">{thread.vendor_name}</span>}</div>
        <div className="row">{thread.status === 'closed' && <Badge>Closed</Badge>}{staff && <Button size="sm" variant="secondary" busy={setStatus.busy} onClick={() => setStatus.run(thread.status === 'open' ? 'closed' : 'open')}>{thread.status === 'open' ? 'Close' : 'Reopen'}</Button>}</div>
      </div>
      <div className="bubbles" role="log" aria-label="Messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.from_staff === staff ? 'mine' : 'theirs'}`}>
            <div className="small muted">{m.from_staff ? 'EAZyfoods team' : m.author} · {fmtDate(m.created_at)}</div>
            <p>{m.body}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      {send.error && <Notice tone="error">{send.error}</Notice>}
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.run(); }}>
        <Field label={thread.status === 'closed' && !staff ? 'Reply (this reopens the conversation)' : 'Reply'}><Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} style={{ minHeight: 80 }} /></Field>
        <div className="row end"><Button type="submit" busy={send.busy} disabled={!text.trim()}>Send</Button></div>
      </form>
    </Card>
  );
}

function Compose({ base, staff, onClose, onSent }: { base: string; staff: boolean; onClose: () => void; onSent: (id: string) => void }) {
  const vendors = useApi<{ id: string; name: string }[]>(staff ? '/admin/vendors' : null);
  const [vendor, setVendor] = useState(''); const [subject, setSubject] = useState(''); const [text, setText] = useState('');
  const send = useAction(async () => { const r = await api<{ id: string }>(base, { method: 'POST', json: { ...(staff ? { vendor_id: vendor } : {}), subject, body: text } }); onSent(r.id); });
  return (
    <Modal open onClose={onClose} title="New conversation">
      {send.error && <Notice tone="error">{send.error}</Notice>}
      {staff && <Field label="Vendor"><Select value={vendor} onChange={(e) => setVendor(e.target.value)}><option value="">Choose a vendor…</option>{vendors.data?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>}
      <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} /></Field>
      <Field label="Message"><Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} /></Field>
      <div className="row end"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button busy={send.busy} disabled={subject.trim().length < 2 || !text.trim() || (staff && !vendor)} onClick={() => send.run()}>Send</Button></div>
    </Modal>
  );
}
