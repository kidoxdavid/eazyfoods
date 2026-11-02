import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmtDate, money, post, put } from '../api';
import { useToast } from '../toast';
import { Badge, Button, ErrorBox, Notice } from '../ui';
import { SkelRows } from '../skeletons';
import { ProductArt, SafeImg } from '../art';

type Item = { offer_id: string; who: string; mine: boolean; quantity: number; price_cents: number; name: string; brand: string | null; pack_size: string | null; pack_unit: string | null; store_name: string; image_url: string | null };
type Group = { token: string; name: string; owner_name: string; is_owner: boolean; status: string; deadline: string | null; open: boolean; items: Item[]; people: string[]; item_count: number; total_cents: number; my_item_count: number };
type Hit = { offer_id: string | null; name: string; brand: string | null; store_name?: string | null; min_price?: number | null; image_url?: string | null; slug: string };

/** A shared basket: the link goes to friends and family, each adds their own items, and the person who started it checks out. */
export function GroupOrderPage() {
  const { token } = useParams();
  const nav = useNavigate(); const toast = useToast();
  const [g, setG] = useState<Group | null>(null); const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Hit[] | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setG(await api<Group>(`/group-orders/${token}`)); setErr(null); } catch (e: any) { setErr(e.message ?? 'Could not load this group order.'); } }, [token]);
  useEffect(() => { load(); const f = () => load(); window.addEventListener('ez-live', f); return () => window.removeEventListener('ez-live', f); }, [load]);
  const link = `${window.location.origin}/group/${token}`;
  const mineOf = (offer: string) => g?.items.find((i) => i.mine && i.offer_id === offer)?.quantity ?? 0;
  const setQty = async (offer: string, qty: number) => { try { setG(await put<Group>(`/group-orders/${token}/items/${offer}`, { quantity: Math.max(0, qty) })); } catch (e: any) { toast(e.message ?? 'Could not change that.', 'error'); } };
  const search = async (e: FormEvent) => { e.preventDefault(); if (!q.trim()) return; setBusy(true); try { setHits((await api<{ results: Hit[] }>(`/search?q=${encodeURIComponent(q.trim())}`)).results.filter((r) => r.offer_id).slice(0, 12)); } finally { setBusy(false); } };
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Link copied. Send it to the people ordering with you.'); } catch { toast(link); } };
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: g?.name, text: `Add what you want to our group order "${g?.name}"`, url: link }); } catch { /* closed */ } } else await copy(); };
  const toBasket = async () => { try { const r = await post<{ moved: number; skipped: number }>(`/group-orders/${token}/to-basket`); toast(`${r.moved} item${r.moved === 1 ? '' : 's'} added to your basket.`); nav('/cart'); } catch (e: any) { toast(e.message ?? 'Could not move the items.', 'error'); } };
  const close = async () => { try { setG(await post<Group>(`/group-orders/${token}/close`)); } catch (e: any) { toast(e.message ?? 'Could not close it.', 'error'); } };

  if (err && !g) return <><h1>Group order</h1><ErrorBox message={err} retry={load} /></>;
  if (!g) return <><h1>Group order</h1><SkelRows n={4} /></>;
  const byPerson = new Map<string, Item[]>();
  g.items.forEach((i) => byPerson.set(i.mine ? 'You' : i.who, [...(byPerson.get(i.mine ? 'You' : i.who) ?? []), i]));
  const people = [...byPerson.entries()].sort((a) => (a[0] === 'You' ? -1 : 1));
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>{g.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>Started by {g.is_owner ? 'you' : g.owner_name} · {g.open ? (g.deadline ? `adding closes ${fmtDate(g.deadline, { dateStyle: 'medium', timeStyle: 'short' })}` : 'no deadline') : 'closed'} <Badge tone={g.open ? 'ok' : 'warn'}>{g.open ? 'Open' : 'Closed'}</Badge></p>
      {g.open && (
        <section className="panel" aria-label="Share this group order">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Share the link</h2>
          <div className="row"><input className="input" readOnly value={link} aria-label="Group order link" onFocus={(e) => e.currentTarget.select()} /><Button onClick={copy}>Copy</Button><Button className="secondary" onClick={share}>Share…</Button></div>
          <p className="small muted" style={{ marginBottom: 0 }}>Everyone signs in, adds what they want, and {g.is_owner ? 'you check out when everyone has added their items' : g.owner_name + ' checks out'}.</p>
        </section>)}
      {!g.open && <Notice>This group order is closed. {g.is_owner ? 'Its items are in your basket if you moved them.' : `${g.owner_name} will check out.`}</Notice>}
      {g.open && (
        <section className="panel" aria-label="Add items">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Add your items</h2>
          <form className="row" onSubmit={search}><input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search garri, shito, berbere…" aria-label="Search products to add" /><Button type="submit" busy={busy}>Search</Button></form>
          {hits && !hits.length && <p className="muted">Nothing found. Try another word.</p>}
          {!!hits?.length && <ul className="gline-list" role="list">{hits.map((h) => (
            <li key={h.offer_id!} className="gline"><span className="gline-img">{h.image_url ? <SafeImg src={h.image_url} alt="" loading="lazy" fallback={<ProductArt name={h.name} />} /> : <ProductArt name={h.name} />}</span>
              <span className="gline-name"><b>{h.name}</b><small>{[h.brand, h.store_name].filter(Boolean).join(' · ')}{h.min_price != null ? ` · ${money(h.min_price)}` : ''}</small></span>
              <span className="gline-step"><button type="button" aria-label={`Fewer ${h.name}`} onClick={() => setQty(h.offer_id!, mineOf(h.offer_id!) - 1)} disabled={!mineOf(h.offer_id!)}>−</button><b aria-live="polite">{mineOf(h.offer_id!)}</b><button type="button" aria-label={`More ${h.name}`} onClick={() => setQty(h.offer_id!, mineOf(h.offer_id!) + 1)}>+</button></span></li>))}</ul>}
        </section>)}
      <section className="panel" aria-label="What everyone added">
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>What everyone added {g.item_count > 0 && <span className="muted small">· {g.item_count} item{g.item_count === 1 ? '' : 's'}, {money(g.total_cents)}</span>}</h2>
        {!people.length && <p className="muted">Nothing yet. Share the link and start adding.</p>}
        {people.map(([who, items]) => (
          <div key={who} className="gperson"><h3>{who}</h3>
            <ul className="gline-list" role="list">{items.map((i) => (
              <li key={i.offer_id + who} className="gline"><span className="gline-img">{i.image_url ? <SafeImg src={i.image_url} alt="" loading="lazy" fallback={<ProductArt name={i.name} />} /> : <ProductArt name={i.name} />}</span>
                <span className="gline-name"><b>{i.name}</b><small>{[i.brand, i.store_name].filter(Boolean).join(' · ')}</small></span>
                {i.mine && g.open ? <span className="gline-step"><button type="button" aria-label={`Fewer ${i.name}`} onClick={() => setQty(i.offer_id, i.quantity - 1)}>−</button><b>{i.quantity}</b><button type="button" aria-label={`More ${i.name}`} onClick={() => setQty(i.offer_id, i.quantity + 1)}>+</button></span>
                  : <span className="gline-amt">{i.quantity} × {money(i.price_cents)}</span>}</li>))}</ul></div>))}
      </section>
      {g.is_owner && g.open && <div className="row"><Button onClick={toBasket} disabled={!g.item_count}>Move everything to my basket</Button><Button className="secondary" onClick={close}>Close without checking out</Button></div>}
      {!g.is_owner && <p className="small muted"><Link to="/">Back to the shop</Link></p>}
    </>
  );
}
