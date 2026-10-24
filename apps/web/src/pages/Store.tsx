import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { money, type StoreCard } from '../api';
import { useApi } from '../hooks';
import { usePlace } from '../place';
import { StoreBanner, StoreMark } from '../art';
import { Badge, ErrorBox, Loading, Notice } from '../ui';
import { BasketBar, ProductGrid, StoreList, type Card } from '../cards';
import { IconPin } from '../icons';
import { paletteCss } from '../theme';
import { KitchenRedirect } from './Kitchens';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type SP = Card & { offer_id: string; price_cents: number; compare_at_cents: number | null; on_promotion: boolean; available: number; category: string | null; category_slug: string | null };
type S = {
  name: string; description: string; address_line: string | null; city: string; province: string; postal_code: string | null; phone: string | null; is_open: boolean; min_order_cents: number | null; is_test_data: boolean;
  logo_url: string | null; cover_url: string | null; policies: string | null; offers_delivery: boolean; offers_pickup: boolean; ordering_paused: boolean;
  branding: { accent: { primary: string; deep: string; tint: string; glow: string } | null; tagline: string | null; story: string | null; announcement: string | null; featured_slugs: string[]; website: string | null; instagram: string | null; facebook: string | null } | null;
  hours: { dow: number; opens: string; closes: string }[]; regions: { slug: string; name: string }[]; products: SP[];
};
type Reviews = { count: number; average: number | null };

type Cmp = { fsa: string; serviceable: boolean; fee_cents?: number; free_over_cents?: number | null; eta_minutes?: number; stores: { slug: string; name: string; is_open: boolean; min_order_cents: number | null; rating_avg: number | null; items_in_stock: number; is_test_data: boolean }[] };
/** Which stores deliver to my area, at what fee, how fast, and what the minimum order is. */
function CompareStores() {
  const { place } = usePlace();
  const [postal, setPostal] = useState(place?.fsa ?? '');
  const [asked, setAsked] = useState<string | null>(place?.fsa ?? null);
  const { data, loading, error } = useApi<Cmp>(asked ? `/stores-compare?postal=${encodeURIComponent(asked)}` : null);
  return (
    <section className="panel" aria-label="Compare stores for your area"><h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Compare delivery to your area</h2>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setAsked(postal.trim() || null); }}><input className="input" aria-label="Postal code" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Postal code, e.g. T2A 0A0" maxLength={7} autoComplete="postal-code" /><button className="btn secondary" type="submit">Compare</button></form>
      {loading && <Loading />}{error && <p className="error-text">{error}</p>}
      {data && !data.serviceable && <p className="muted">We do not deliver to {data.fsa} yet.</p>}
      {data?.serviceable && <>
        <p className="small muted">Delivery to {data.fsa}: {money(data.fee_cents!)} per store{data.free_over_cents ? `, free over ${money(data.free_over_cents)}` : ''}, about {data.eta_minutes} min once the store confirms.</p>
        <table className="compare"><thead><tr><th>Store</th><th>Status</th><th>Minimum order</th><th>Rating</th><th>Items in stock</th></tr></thead>
          <tbody>{data.stores.map((s) => <tr key={s.slug}><td data-l="Store"><Link to={`/s/${s.slug}`}><strong>{s.name}</strong></Link></td><td data-l="Status">{s.is_open ? 'Open now' : 'Closed now'}</td><td data-l="Minimum order">{s.min_order_cents ? money(s.min_order_cents) : 'None'}</td><td data-l="Rating">{s.rating_avg ?? '—'}</td><td data-l="Items in stock">{s.items_in_stock}</td></tr>)}</tbody></table></>}
    </section>
  );
}

export function StoresPage() {
  const { data, loading, error, reload } = useApi<StoreCard[]>('/stores');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  return <><h1>Stores</h1><p className="muted">Independent African grocers, each with its own prices and stock.</p><CompareStores />{data && <StoreList stores={data} />}</>;
}

export function StorePage() {
  const { slug } = useParams();
  const { data: s, loading, error, reload } = useApi<S>(`/stores/${slug}`);
  const rev = useApi<Reviews>(`/stores/${slug}/reviews`);
  const [cat, setCat] = useState<string>('');
  const cats = useMemo(() => { const m = new Map<string, string>(); s?.products.forEach((p) => p.category_slug && m.set(p.category_slug, p.category ?? p.category_slug)); return [...m.entries()]; }, [s]);
  if (loading) return <Loading />;
  if (error) return <><KitchenRedirect slug={slug!} /><ErrorBox message={error} retry={reload} /></>;
  if (!s) return null;
  const items: Card[] = s.products.filter((p) => !cat || p.category_slug === cat).map((p) => ({ ...p, min_price: p.price_cents, was_price: p.compare_at_cents, in_stock: p.available > 0, on_sale: p.on_promotion, store_count: 1, store_name: s.name, store_slug: slug!, available: p.available }));
  const br = s.branding;
  const featured = items.filter((p) => br?.featured_slugs.includes(p.slug));
  const links = [['Website', br?.website], ['Instagram', br?.instagram], ['Facebook', br?.facebook]].filter(([, u]) => u) as [string, string][];
  return (
    <>
      {br?.accent && <style>{paletteCss(br.accent, '.store-page')}</style>}
      <div className="store-page">
      <div className="shead">
        <div className="shead-cover">{s.cover_url ? <img src={s.cover_url} alt="" /> : <StoreBanner name={s.name} />}</div>
        <div className="shead-body">
          {s.logo_url ? <img className="logo-img" src={s.logo_url} alt="" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : <StoreMark name={s.name} size={64} />}
          <div className="grow"><h1>{s.name}</h1>{br?.tagline && <p className="tagline">{br.tagline}</p>}
            <div className="row wrap"><Badge tone={s.is_open ? 'ok' : 'warn'}>{s.is_open ? 'Open now' : 'Closed now'}</Badge>{s.regions.map((r) => <Link key={r.slug} to={`/search?region=${r.slug}&store=${slug}`}><Badge>{r.name}</Badge></Link>)}{s.offers_pickup && <Badge tone="info">Pickup available</Badge>}{rev.data?.average != null && <Badge tone="info">★ {rev.data.average} ({rev.data.count})</Badge>}{s.is_test_data && <Badge tone="demo">Demo store</Badge>}</div></div>
        </div>
        <div className="shead-meta small muted"><IconPin width={16} height={16} style={{ verticalAlign: -3 }} /> {[s.address_line, s.city, s.province, s.postal_code].filter(Boolean).join(', ')}{s.phone ? ` · ${s.phone}` : ''}{s.min_order_cents ? ` · Minimum order ${money(s.min_order_cents)}` : ''}</div>
      </div>
      {br?.announcement && <div className="store-ann" role="note">{br.announcement}</div>}
      {s.is_test_data && <Notice tone="warn">Demo store with invented data for development. It is not a real business.</Notice>}
      {s.ordering_paused && <Notice tone="warn">This store has paused online orders for now.</Notice>}
      {!s.is_open && !s.ordering_paused && <Notice>This store is closed right now. You can fill your basket, but you can only check out while it is open.</Notice>}
      <p style={{ marginTop: 14 }}>{s.description}</p>
      {br?.story && <section className="store-story" aria-label={`About ${s.name}`}><h2>Our story</h2><p>{br.story}</p>{!!links.length && <p className="store-links">{links.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noopener noreferrer">{l}</a>)}</p>}</section>}
      {!!featured.length && <section className="block" aria-labelledby="feat-h"><h2 id="feat-h">Featured by {s.name}</h2><ProductGrid products={featured} /></section>}
      <details><summary style={{ cursor: 'pointer', minHeight: 32 }}>Opening hours{s.policies ? ' and store policies' : ''}</summary>
        <ul role="list" style={{ paddingLeft: 18 }}>{s.hours.map((h, i) => <li key={i}>{DAYS[h.dow]} {h.opens.slice(0, 5)}–{h.closes.slice(0, 5)}</li>)}</ul>{s.policies && <p>{s.policies}</p>}</details>
      <div className="catchips" role="group" aria-label="Departments in this store">
        <button className={!cat ? 'on' : ''} onClick={() => setCat('')}>All ({s.products.length})</button>
        {cats.map(([k, n]) => <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{n}</button>)}
      </div>
      <ProductGrid products={items} />
      </div>
      <BasketBar />
    </>
  );
}
