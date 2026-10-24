import { useState } from 'react';
import { SkelRows } from '../skeletons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { del, post, put } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { useAction, useApi } from '../hooks';
import { useToast } from '../toast';
import { Badge, Button, Confirm, Empty, ErrorBox, Input, Loading, Notice, Stepper } from '../ui';
import { ProductGrid, type Card } from '../cards';
import { packLabel, money } from '../api';

type Item = Card & { list_quantity: number; unavailable?: boolean };

export function ListsPage() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useApi<{ id: string; name: string; shared: boolean; items: number }[]>('/lists');
  const [name, setName] = useState('');
  const create = useAction(async () => { const r = await post<{ id: string }>('/lists', { name }); nav(`/lists/${r.id}`); });
  return (
    <>
      <h1>Shopping lists</h1>
      <p className="muted">Keep your regular shops, plan a feast, and share a list with family. Save any product from its page.</p>
      <form className="row top" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.run(); }}>
        <div className="grow"><Input aria-label="New list name" placeholder="New list, e.g. Sunday jollof" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button type="submit" busy={create.busy} disabled={!name.trim()}>Create list</Button>
      </form>
      {create.error && <ErrorBox message={create.error} />}
      {loading && <SkelRows n={3} />}{error && <ErrorBox message={error} retry={reload} />}
      {data && !data.length && <Empty title="No lists yet"><p>Create one above, or press “Save to a list” on a product.</p></Empty>}
      <ul className="lists" role="list">{data?.map((l) => <li key={l.id}><Link to={`/lists/${l.id}`} className="panel"><strong>{l.name}</strong><span className="muted small">{l.items} item{l.items === 1 ? '' : 's'}{l.shared && ' · shared'}</span></Link></li>)}</ul>
    </>
  );
}

function AddAll({ items }: { items: Item[] }) {
  const { setQty, qtyOf } = useCart(); const toast = useToast();
  const buyable = items.filter((i) => !i.unavailable && i.in_stock && i.offer_id);
  const go = () => {
    for (const i of buyable) setQty({ offer_id: i.offer_id!, slug: i.slug, name: i.name, unit_price_cents: i.min_price, store_name: i.store_name ?? '', store_slug: i.store_slug ?? '', pack: packLabel(i) }, Math.min(99, Math.max(qtyOf(i.offer_id!), i.list_quantity), i.available ?? 99));
    toast(`${buyable.length} item${buyable.length === 1 ? '' : 's'} added to your basket`);
  };
  const missing = items.length - buyable.length;
  return <div className="row wrap"><Button onClick={go} disabled={!buyable.length}>Add all to basket ({buyable.length})</Button>{missing > 0 && <span className="muted small">{missing} not available right now</span>}</div>;
}

export function ListPage() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast();
  const { data, loading, error, reload } = useApi<{ id: string; name: string; share_token: string | null; reminder: { every_days: number } | null; items: Item[] }>(`/lists/${id}`);
  const [rename, setRename] = useState<string | null>(null);
  const setQty = useAction(async (slug: string, quantity: number) => { await put(`/lists/${id}/items`, { slug, quantity }); reload(); });
  const share = useAction(async (on: boolean) => { if (on) await post(`/lists/${id}/share`); else await del(`/lists/${id}/share`); reload(); });
  const doRename = useAction(async () => { await put(`/lists/${id}`, { name: rename }); setRename(null); reload(); });
  const remind = useAction(async (days: number | null) => { await put(`/lists/${id}/reminder`, { every_days: days }); toast(days ? `We will remind you every ${days} days.` : 'Reminders stopped.'); reload(); });
  const remove = useAction(async () => { await del(`/lists/${id}`); nav('/lists'); });
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!data) return null;
  const link = data.share_token ? `${window.location.origin}/l/${data.share_token}` : null;
  const copy = async () => { try { await navigator.clipboard.writeText(link!); toast('Link copied'); } catch { toast('Copy failed', 'error'); } };
  return (
    <>
      <p><Link to="/lists">← All lists</Link></p>
      {rename === null ? <div className="row between wrap"><h1 style={{ margin: 0 }}>{data.name}</h1><Button variant="ghost" size="sm" onClick={() => setRename(data.name)}>Rename</Button></div>
        : <form className="row" onSubmit={(e) => { e.preventDefault(); doRename.run(); }}><Input aria-label="List name" value={rename} maxLength={60} onChange={(e) => setRename(e.target.value)} /><Button type="submit" busy={doRename.busy} disabled={!rename.trim()}>Save</Button><Button type="button" variant="ghost" onClick={() => setRename(null)}>Cancel</Button></form>}
      {!data.items.length && <Empty title="This list is empty"><p>Open a product and press “Save to a list”.</p><Link to="/search" className="btn primary">Browse products</Link></Empty>}
      {data.items.length > 0 && <>
        <AddAll items={data.items} />
        <ul className="list-items" role="list">{data.items.map((i) => (
          <li key={i.slug} className="panel row between wrap">
            <div className="grow">{i.unavailable ? <span className="muted">{i.slug.replace(/-/g, ' ')} <Badge tone="warn">Not available</Badge></span> : <><Link to={`/p/${i.slug}`}><strong>{i.name}</strong></Link><div className="muted small">{[i.brand, packLabel(i)].filter(Boolean).join(' · ')} · from {money(i.min_price)}{!i.in_stock && ' · out of stock'}</div></>}</div>
            <Stepper value={i.list_quantity} max={99} label={`${i.name ?? i.slug} on this list`} onChange={(n) => setQty.run(i.slug, n)} />
          </li>))}</ul>
      </>}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Remind me to restock</h2>
        <p className="small muted">We email you a link that adds this whole list to your basket. Nothing is ordered or charged automatically.</p>
        <label className="small">Remind me <select aria-label="Reminder every" value={data.reminder?.every_days ?? ''} onChange={(e) => remind.run(e.target.value ? Number(e.target.value) : null)}>
          <option value="">never</option><option value="7">every week</option><option value="14">every 2 weeks</option><option value="30">every month</option><option value="60">every 2 months</option></select></label>
      </div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Share this list</h2>
        {link ? <><p className="small">Anyone with this link can see the list (not change it). Your email and address are never shown.</p><div className="row wrap"><Input readOnly aria-label="Share link" value={link} onFocus={(e) => e.currentTarget.select()} /><Button variant="secondary" onClick={copy}>Copy link</Button><Button variant="ghost" busy={share.busy} onClick={() => share.run(false)}>Stop sharing</Button></div></>
          : <Button variant="secondary" busy={share.busy} onClick={() => share.run(true)}>Create a share link</Button>}
      </div>
      <p><Confirm size="sm" message={`Delete the list “${data.name}”?`} onConfirm={() => remove.run()}>Delete list</Confirm></p>
    </>
  );
}

export function SharedListPage() {
  const { token } = useParams(); const { me } = useAuth(); const nav = useNavigate();
  const { data, loading, error } = useApi<{ name: string; owner: string; items: Item[] }>(`/lists/shared/${token}`);
  const copy = useAction(async () => { const r = await post<{ id: string }>(`/lists/shared/${token}/copy`); nav(`/lists/${r.id}`); });
  if (loading) return <Loading />;
  if (error || !data) return <Notice tone="warn">This list is not shared any more. Ask the person who sent it for a new link.</Notice>;
  return (
    <>
      <h1>{data.name}</h1>
      <p className="muted">Shared by {data.owner}</p>
      <div className="row wrap"><AddAll items={data.items} />{me ? <Button variant="secondary" busy={copy.busy} onClick={() => copy.run()}>Save a copy to my lists</Button> : <Link to={`/signin?next=/l/${token}`} className="btn secondary">Sign in to save a copy</Link>}</div>
      <ProductGrid products={data.items.filter((i) => !i.unavailable)} />
    </>
  );
}

export function AlertsPage() {
  const { data, loading, error, reload } = useApi<{ id: string; kind: string; slug: string; name: string; price_at_creation_cents: number | null }[]>('/alerts');
  const remove = useAction(async (id: string) => { await del(`/alerts/${id}`); reload(); });
  return (
    <>
      <h1>Your alerts</h1>
      <p className="muted">We email you once when a product is back in stock or its price drops, then the alert switches itself off.</p>
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && !data.length && <Empty title="No alerts"><p>Open a product that is out of stock, or one you are watching, and press the bell.</p></Empty>}
      <ul className="list-items" role="list">{data?.map((a) => (
        <li key={a.id} className="panel row between wrap"><div><Link to={`/p/${a.slug}`}><strong>{a.name}</strong></Link><div className="muted small">{a.kind === 'back_in_stock' ? 'Tell me when it is back in stock' : `Tell me if the price drops below ${money(a.price_at_creation_cents ?? 0)}`}</div></div>
          <Button variant="ghost" size="sm" onClick={() => remove.run(a.id)}>Remove</Button></li>))}</ul>
    </>
  );
}
