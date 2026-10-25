import { useEffect, useMemo, useState } from 'react';
import { SkelGrid, SkelStore } from '../skeletons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../api';
import { useApi } from '../hooks';
import { ProductArt, SafeImg, StoreBanner, StoreMark } from '../art';
import { AddToBasket, BasketBar } from '../cards';
import { paletteCss } from '../theme';
import { Badge, ErrorBox, Loading, Notice } from '../ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALLERGENS: [string, string][] = [['peanuts', 'Peanuts'], ['tree_nuts', 'Tree nuts'], ['sesame', 'Sesame'], ['milk', 'Milk'], ['eggs', 'Eggs'], ['fish', 'Fish'], ['crustaceans', 'Crustaceans'], ['molluscs', 'Molluscs'], ['soy', 'Soy'], ['wheat', 'Wheat'], ['gluten', 'Gluten'], ['mustard', 'Mustard'], ['sulphites', 'Sulphites']];
const label = (k: string) => ALLERGENS.find(([a]) => a === k)?.[1] ?? k.replace(/_/g, ' ');
const TAGS: Record<string, string> = { halal: 'Halal', vegan: 'Vegan', vegetarian: 'Vegetarian', pescatarian: 'Pescatarian', gluten_free: 'Gluten-free', dairy_free: 'Dairy-free' };

type KCard = { kitchen_type?: 'home' | 'restaurant'; address_line?: string | null; slug: string; name: string; description: string | null; city: string; area: string; is_open: boolean; min_order_cents: number | null; is_test_data: boolean; logo_url: string | null; cover_url: string | null; cuisines: string[]; ordering_paused: boolean; dish_count: number; from_cents: number | null };
type Dish = { slug: string; name: string; description: string | null; cuisine: string | null; spice_level: number | null; serves: string | null; prep_minutes: number | null; allergens: string[] | null; ingredients: string | null; dish_tags: string[];
  offer_id: string; price_cents: number; compare_at_cents: number | null; on_promotion: boolean; available: number; image_url: string | null; menu_section?: string | null; video_url?: string | null };
type K = Omit<KCard, 'dish_count' | 'from_cents'> & { postal_code?: string | null; phone?: string | null; video_url?: string | null; gallery?: string[]; preorders_enabled?: boolean; policies: string | null; offers_delivery: boolean; offers_pickup: boolean; hours: { dow: number; opens: string; closes: string }[]; dishes: Dish[]; allergen_notice: string;
  branding: { accent: { primary: string; deep: string; tint: string; glow: string } | null; tagline: string | null; story: string | null; announcement: string | null; website: string | null; instagram: string | null; facebook: string | null } | null };

function KitchenTile({ k }: { k: KCard }) {
  return (
    <Link to={`/k/${k.slug}`} className="stile">
      <div className="stile-cover">{k.cover_url ? <SafeImg src={k.cover_url} loading="lazy" fallback={<StoreBanner name={k.name} />} /> : <StoreBanner name={k.name} />}</div>
      <div className="stile-body">
        {k.logo_url ? <img src={k.logo_url} alt="" width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : <StoreMark name={k.name} size={44} />}
        <div><h3>{k.name}</h3><span className="muted small">{k.kitchen_type === 'restaurant' && k.address_line ? `${k.address_line}, ${k.city}` : k.area ? `${k.city} · ${k.area}` : k.city}{k.from_cents ? ` · dishes from ${money(k.from_cents)}` : ''}</span></div>
      </div>
      <div className="row wrap" style={{ padding: '0 14px 14px' }}>
        <Badge tone={k.is_open ? 'ok' : 'warn'}>{k.is_open ? 'Open now' : 'Closed now'}</Badge>
        {k.kitchen_type === 'restaurant' && <Badge tone="info">Restaurant</Badge>}
        {k.cuisines.slice(0, 2).map((c) => <Badge key={c}>{c}</Badge>)}
        {k.is_test_data && <Badge tone="demo">Demo cook</Badge>}
      </div>
    </Link>
  );
}

export function KitchenList({ items }: { items: KCard[] }) {
  return <ul className="sgrid" role="list">{items.map((k) => <li key={k.slug}><KitchenTile k={k} /></li>)}</ul>;
}

export function KitchensPage() {
  const [cuisine, setCuisine] = useState('');
  const [type, setType] = useState<'' | 'home' | 'restaurant'>('');
  const cuisines = useApi<{ name: string; kitchens: number }[]>('/kitchens/cuisines');
  const qs = [cuisine && `cuisine=${encodeURIComponent(cuisine)}`, type && `type=${type}`].filter(Boolean).join('&');
  const { data, loading, error, reload } = useApi<KCard[]>(`/kitchens${qs ? `?${qs}` : ''}`);
  return (
    <>
      <h1>Home chefs &amp; restaurants</h1>
      <p className="muted">Meals cooked to order by local home cooks and restaurants. Every seller uploads the permits we require, which our team checks before they can sell, and every dish lists its allergens.</p>
      <div className="catchips" role="group" aria-label="Type">{([['', 'All'], ['home', 'Home chefs'], ['restaurant', 'Restaurants']] as const).map(([v, l]) => <button key={v} className={type === v ? 'on' : ''} aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>)}</div>
      {!!cuisines.data?.length && <div className="catchips" role="group" aria-label="Cuisine"><button className={!cuisine ? 'on' : ''} onClick={() => setCuisine('')}>All</button>{cuisines.data.map((c) => <button key={c.name} className={cuisine === c.name ? 'on' : ''} onClick={() => setCuisine(c.name)}>{c.name}</button>)}</div>}
      {loading && !data && <SkelGrid n={6} label="Loading kitchens" />}
      {error && <ErrorBox message={error} retry={reload} />}
      {data && !data.length && <Notice>Nothing is available here yet{cuisine ? ` for ${cuisine}` : ''}. Check back soon, or <Link to="/vendor">sell with us</Link>.</Notice>}
      {data && <KitchenList items={data} />}
    </>
  );
}

const useAvoid = () => {
  const [avoid, setAvoid] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('ez_avoid_v1') ?? '[]'); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem('ez_avoid_v1', JSON.stringify(avoid)); } catch { /* storage unavailable */ } }, [avoid]);
  return [avoid, setAvoid] as const;
};

function DishCard({ d, k, avoid }: { d: Dish; k: K; avoid: string[] }) {
  const hits = (d.allergens ?? []).filter((a) => avoid.includes(a));
  const unknown = d.allergens == null;
  const blocked = hits.length > 0;
  return (
    <li className={`dish ${blocked ? 'blocked' : ''}`} id={`dish-${d.slug}`}>
      <div className="dish-art">{d.image_url ? <img src={d.image_url} alt={d.name} loading="lazy" /> : <ProductArt name={d.name} category="dish" bare />}</div>
      <div className="dish-body">
        <h3>{d.name}</h3>
        {d.description && <p className="muted small">{d.description}</p>}
        <div className="row wrap small">
          {d.spice_level != null && d.spice_level > 0 && <span title="Spice level">{'🌶'.repeat(d.spice_level)}<span className="sr-only"> Spice level {d.spice_level} of 3</span></span>}
          {d.serves && <span>{d.serves}</span>}{d.prep_minutes ? <span>Ready in about {d.prep_minutes} min</span> : null}
          {d.dish_tags.map((t) => <Badge key={t} tone="info">{TAGS[t] ?? t}</Badge>)}
        </div>
        <p className="small dish-allergens"><strong>Contains:</strong> {unknown ? 'allergen information not supplied; ask the cook' : d.allergens!.length ? d.allergens!.map(label).join(', ') : 'none of the priority allergens (declared by the cook)'}</p>
        {d.video_url && <details className="small"><summary>Watch a short video</summary><ClipPlayer src={d.video_url} label={`Video of ${d.name}`} /></details>}
        {d.ingredients && <details className="small"><summary>Ingredients</summary><p style={{ margin: '4px 0' }}>{d.ingredients}</p></details>}
        <div className="dish-buy">
          <strong className="dish-price">{money(d.price_cents)}</strong>
          {blocked ? <span className="dish-warn" role="note">Contains {hits.map(label).join(', ')}, which you avoid</span>
            : <AddToBasket size="sm" offer={{ offer_id: d.offer_id, slug: d.slug, name: d.name, unit_price_cents: d.price_cents, store_name: k.name, store_slug: k.slug, pack: d.serves ?? '', available: d.available, in_stock: d.available > 0 }} />}
        </div>
        {d.available > 0 && d.available <= 3 && !blocked && <span className="small" style={{ color: 'var(--deal-ink)' }}>Only {d.available} left today</span>}
      </div>
    </li>
  );
}

export function KitchenPage() {
  const { slug } = useParams();
  const { data: k, loading, error, reload } = useApi<K>(`/kitchens/${slug}`);
  const [avoid, setAvoid] = useAvoid();
  const [cuisine, setCuisine] = useState('');
  const br = k?.branding;
  const dishes = useMemo(() => (k?.dishes ?? []).filter((d) => !cuisine || d.cuisine === cuisine), [k, cuisine]);
  const cuisines = useMemo(() => [...new Set((k?.dishes ?? []).map((d) => d.cuisine).filter(Boolean))] as string[], [k]);
  if (loading) return <SkelStore />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!k) return null;
  const sections = [...dishes.reduce((m, d) => m.set(d.menu_section ?? '', [...(m.get(d.menu_section ?? '') ?? []), d]), new Map<string, Dish[]>())];
  const hidden = dishes.filter((d) => (d.allergens ?? []).some((a) => avoid.includes(a))).length;
  return (
    <>
      {br?.accent && <style>{paletteCss(br.accent, '.store-page')}</style>}
      <div className="store-page">
        <div className="shead">
          <div className="shead-cover">{k.cover_url ? <img src={k.cover_url} alt="" /> : <StoreBanner name={k.name} />}</div>
          <div className="shead-body">
            {k.logo_url ? <img className="logo-img" src={k.logo_url} alt="" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : <StoreMark name={k.name} size={64} />}
            <div className="grow"><h1>{k.name}</h1>{br?.tagline && <p className="tagline">{br.tagline}</p>}
              <div className="row wrap"><Badge tone={k.is_open ? 'ok' : 'warn'}>{k.is_open ? 'Open now' : 'Closed now'}</Badge>{k.cuisines.map((c) => <Badge key={c}>{c}</Badge>)}{k.offers_pickup && <Badge tone="info">Pickup available</Badge>}{k.preorders_enabled && <Badge tone="info">Pre-orders welcome</Badge>}{k.is_test_data && <Badge tone="demo">Demo cook</Badge>}</div></div>
          </div>
          <div className="shead-meta small muted">{k.kitchen_type === 'restaurant' ? <>Restaurant · {[k.address_line, k.city, k.postal_code].filter(Boolean).join(', ')}{k.phone ? ` · ${k.phone}` : ''}.</> : <>Home kitchen in {k.city}{k.area ? ` (${k.area})` : ''}. The cook’s address is shared only for pickup orders.</>}{k.min_order_cents ? ` · Minimum order ${money(k.min_order_cents)}` : ''}</div>
        </div>
        {br?.announcement && <div className="store-ann" role="note">{br.announcement}</div>}
        {k.is_test_data && <Notice tone="warn">Demo cook with invented data for development. This is not a real kitchen or permit.</Notice>}
        {k.ordering_paused && <Notice tone="warn">This cook has paused orders for now.</Notice>}
        {!k.is_open && !k.ordering_paused && <Notice>This kitchen is closed right now. You can fill your basket, but you can only check out while it is open.</Notice>}
        <p style={{ marginTop: 14 }}>{k.description}</p>
        {k.video_url && <ClipPlayer src={k.video_url} label={`Video from ${k.name}`} />}
        {!!k.gallery?.length && <ul className="kitchen-gallery" aria-label={`Photos from ${k.name}`} style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: 0, margin: '10px 0', listStyle: 'none' }}>{k.gallery.map((u, i) => <li key={u} style={{ flex: '0 0 auto' }}><SafeImg src={u} alt={`${k.name} photo ${i + 1}`} loading="lazy" fallback={null} style={{ height: 150, width: 'auto', borderRadius: 10, display: 'block' }} /></li>)}</ul>}
        {br?.story && <section className="store-story" aria-label={`About ${k.name}`}><h2>Our story</h2><p>{br.story}</p></section>}
        <Notice>{k.allergen_notice}</Notice>
        <details className="avoid" open={avoid.length > 0}>
          <summary>Allergens I avoid{avoid.length ? ` (${avoid.length})` : ''}</summary>
          <div className="catchips" role="group" aria-label="Allergens to avoid">{ALLERGENS.map(([a, l]) => <button key={a} className={avoid.includes(a) ? 'on' : ''} aria-pressed={avoid.includes(a)} onClick={() => setAvoid((x) => x.includes(a) ? x.filter((y) => y !== a) : [...x, a])}>{l}</button>)}</div>
          <p className="small muted">Saved on this device only. Dishes that declare an allergen you avoid can’t be added to your basket here.{hidden ? ` ${hidden} dish${hidden > 1 ? 'es are' : ' is'} marked.` : ''}</p>
        </details>
        {cuisines.length > 1 && <div className="catchips" role="group" aria-label="Cuisine"><button className={!cuisine ? 'on' : ''} onClick={() => setCuisine('')}>All dishes</button>{cuisines.map((c) => <button key={c} className={cuisine === c ? 'on' : ''} onClick={() => setCuisine(c)}>{c}</button>)}</div>}
        {!dishes.length ? <Notice>No dishes on the menu right now.</Notice> : sections.map(([name, list]) => (
          <section key={name || 'menu'} aria-label={name || 'Menu'}>
            {name && <h2 style={{ marginTop: 18 }}>{name}</h2>}
            <ul className="dishes" role="list">{list.map((d) => <DishCard key={d.slug} d={d} k={k} avoid={avoid} />)}</ul>
          </section>))}
        <details style={{ marginTop: 14 }}><summary style={{ cursor: 'pointer', minHeight: 32 }}>Opening hours{k.policies ? ' and policies' : ''}</summary>
          <ul role="list" style={{ paddingLeft: 18 }}>{k.hours.map((h, i) => <li key={i}>{DAYS[h.dow]} {h.opens.slice(0, 5)}–{h.closes.slice(0, 5)}</li>)}</ul>{k.policies && <p>{k.policies}</p>}</details>
        <p className="small muted">Sellers must hold the permits we require. <Link to="/pages/home-kitchen-rules">Read the rules for kitchens</Link>.</p>
      </div>
      <BasketBar />
    </>
  );
}

/** `/s/:slug` links (basket, orders) point at grocery stores; send kitchens to their own page. */
export function KitchenRedirect({ slug }: { slug: string }) {
  const nav = useNavigate();
  const k = useApi<{ slug: string }>(`/kitchens/${slug}`);
  useEffect(() => { if (k.data) nav(`/k/${slug}`, { replace: true }); }, [k.data, nav, slug]);
  return null;
}

export function DishRedirect({ slug }: { slug: string }) {
  const nav = useNavigate();
  const d = useApi<{ kitchen_slug: string }>(`/kitchens/dish/${slug}`);
  useEffect(() => { if (d.data) nav(`/k/${d.data.kitchen_slug}#dish-${slug}`, { replace: true }); }, [d.data, nav, slug]);
  return null;
}

/** A short vendor video. Never autoplays; loads nothing until asked when the visitor saves data. */
export function ClipPlayer({ src, label }: { src: string; label: string }) {
  const save = typeof navigator !== 'undefined' && (navigator as any).connection?.saveData;
  return <video className="clip" src={src} controls playsInline preload={save ? 'none' : 'metadata'} aria-label={label} style={{ width: '100%', maxHeight: 420, borderRadius: 12, background: '#000', margin: '10px 0' }} />;
}
