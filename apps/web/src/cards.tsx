import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SkelRows } from './skeletons';
import { useFeature } from './features';
import { useT } from './i18n';
import { Link } from 'react-router-dom';
import { money, packLabel, post, unitPrice, unitText, type StoreCard } from './api';
import { SaveToList } from './savelist';
import { ProductArt, SafeImg, StoreBanner, StoreMark, Stars } from './art';
import { useCart } from './cart';
import { IconChevron, IconChevronL, IconEye, IconMinus, IconPlus } from './icons';
import { Badge, Button, Loading, Modal, Notice, Stepper } from './ui';
import { useApi } from './hooks';

export type Card = {
  slug: string; name: string; brand: string | null; pack_size: string | null; pack_unit: string | null; category?: string | null; category_slug?: string | null; image_url?: string | null;
  min_price: number; was_price?: number | null; in_stock: boolean; on_sale?: boolean; store_count?: number; matched_alias?: string | null;
  unit_price_cents?: number | null; unit_basis?: '100g' | '100ml' | null; multibuy?: { min_qty: number; unit_price_cents: number } | null; dietary?: Record<string, boolean> | null;
  offer_id?: string | null; store_name?: string | null; store_slug?: string | null; available?: number | null; rating_avg?: number | null; rating_count?: number; sponsored_campaign_id?: string | null;
};

/** $12.99 shown retail-style: small dollar sign and cents, large dollars. */
export function Price({ cents, className = '' }: { cents: number; className?: string }) {
  const d = Math.floor(cents / 100), c = String(cents % 100).padStart(2, '0');
  return <span className={`pr ${className}`}><span className="sr-only">{money(cents)}</span><sup aria-hidden="true">$</sup><span aria-hidden="true">{d}</span><sup aria-hidden="true">{c}</sup></span>;
}

const seen = new Set<string>();
export function useAdImpression(id: string | null | undefined) {
  useEffect(() => { if (!id || seen.has(id)) return; seen.add(id); post(`/ads/${id}/event`, { type: 'impression' }).catch(() => {}); }, [id]);
}

export function QuickAdd({ p }: { p: Card }) {
  const t = useT();
  const { qtyOf, setQty } = useCart();
  if (!p.offer_id || !p.in_stock) return <Link to={`/p/${p.slug}`} className="btn secondary sm wide">{p.in_stock ? t('View') : t('Out of stock')}</Link>;
  const offer = { offer_id: p.offer_id, slug: p.slug, name: p.name, unit_price_cents: p.min_price, store_name: p.store_name ?? '', store_slug: p.store_slug ?? '', pack: packLabel(p) };
  const q = qtyOf(p.offer_id);
  if (q === 0) return <button className="addbtn" onClick={() => setQty(offer, 1)} aria-label={`Add ${p.name} from ${p.store_name} to basket`}><IconPlus width={18} height={18} /> Add</button>;
  return (
    <div className="addstep" role="group" aria-label={`Quantity of ${p.name}`}>
      <button aria-label={`Remove one ${p.name}`} onClick={() => setQty(offer, q - 1)}><IconMinus width={18} height={18} /></button>
      <span aria-live="polite">{q}</span>
      <button aria-label={`Add one ${p.name}`} disabled={q >= Math.min(99, p.available ?? 99)} onClick={() => setQty(offer, q + 1)}><IconPlus width={18} height={18} /></button>
    </div>
  );
}

export function ProductCard({ p }: { p: Card }) {
  const t = useT();
  const mbOn = useFeature('shop.multibuy');
  useAdImpression(p.sponsored_campaign_id);
  const [quick, setQuick] = useState(false);
  const click = () => { if (p.sponsored_campaign_id) post(`/ads/${p.sponsored_campaign_id}/event`, { type: 'click' }).catch(() => {}); };
  const was = p.was_price && p.was_price > p.min_price ? p.was_price : null;
  const off = was ? Math.round((1 - p.min_price / was) * 100) : 0;
  return (
    <article className="pcard">
      <Link to={`/p/${p.slug}`} className="pimg" onClick={click} tabIndex={-1} aria-hidden="true">
        {p.image_url ? <SafeImg src={p.image_url} loading="lazy" decoding="async" fallback={<ProductArt name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} />} /> : <ProductArt name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} />}
        {p.on_sale && off > 0 && <span className="ribbon">{off}% off</span>}
        {p.on_sale && off <= 0 && <span className="ribbon">Deal</span>}
        {!p.in_stock && <span className="ribbon grey">{t('Out of stock')}</span>}
      </Link>
      <button type="button" className="qv" onClick={() => setQuick(true)} aria-label={`Quick view: ${p.name}`}><IconEye width={16} height={16} /><span className="qv-txt">{t('Quick view')}</span></button>
      {quick && <QuickView slug={p.slug} onClose={() => setQuick(false)} />}
      <div className="pbody">
        {p.sponsored_campaign_id && <span className="sponsor">Sponsored</span>}
        <div className="prow">
          <Price cents={p.min_price} className={p.on_sale ? 'sale' : ''} />
          {was && <s className="was">{money(was)}</s>}
        </div>
        {p.unit_price_cents != null && p.unit_basis && <span className="unit">{unitText({ cents: p.unit_price_cents, basis: p.unit_basis })}</span>}
        {p.multibuy && mbOn && <span className="multibuy">Buy {p.multibuy.min_qty}+: {money(p.multibuy.unit_price_cents)} each</span>}
        {(p.store_count ?? 1) > 1 && <span className="from">lowest of {p.store_count} stores</span>}
        <Link to={`/p/${p.slug}`} className="pname" onClick={click}>{p.name}</Link>
        <span className="pmeta">{[p.brand, packLabel(p)].filter(Boolean).join(' · ')}</span>
        {p.matched_alias && <Badge>Also known as “{p.matched_alias}”</Badge>}
        <Stars value={p.rating_avg} count={p.rating_count} />
        {p.store_name && <span className="psold">at {p.store_name}</span>}
        <div className="pact"><QuickAdd p={p} /></div>
      </div>
    </article>
  );
}


type QOffer = { store_slug: string; store_name: string; is_open: boolean; is_test_data: boolean; offer_id: string; price_cents: number; compare_at_cents: number | null; on_promotion: boolean; in_stock: boolean; available: number };
type QP = { name: string; brand: string | null; description: string | null; pack_size: string | null; pack_unit: string | null; category: string | null; category_slug: string | null; allergens: string[] | null; images: { url: string; alt: string }[]; offers: QOffer[] };

/** Look at a product without leaving the page: picture, price per store, allergens, and add to basket. */
export function QuickView({ slug, onClose }: { slug: string; onClose: () => void }) {
  const t = useT();
  const { data: p, loading, error } = useApi<QP>(`/products/${slug}`);
  const [sel, setSel] = useState<string | null>(null);
  const best = p ? [...p.offers].sort((a, b) => Number(b.in_stock) - Number(a.in_stock) || a.price_cents - b.price_cents)[0] : undefined;
  const cur = p?.offers.find((o) => o.offer_id === sel) ?? best;
  return (
    <Modal open onClose={onClose} title={p?.name ?? 'Quick view'} className="qv-modal">
      {loading && <SkelRows n={1} label="Loading product" />}
      {error && <Notice tone="error">Could not load this product. <Link to={`/p/${slug}`} onClick={onClose}>Open the full page</Link></Notice>}
      {p && (
        <div className="qv-body">
          <div className="qv-art">{p.images[0] ? <SafeImg src={p.images[0].url} alt={p.images[0].alt} fallback={<ProductArt name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} />} /> : <ProductArt name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} />}</div>
          <div className="qv-info">
            <span className="muted small">{[p.brand, packLabel(p), cur ? unitText(unitPrice(cur.price_cents, p.pack_size, p.pack_unit)) : ''].filter(Boolean).join(' · ')}</span>
            {cur ? (<>
              <div className="row wrap" style={{ justifyContent: 'space-between' }}><span className="row"><Price cents={cur.price_cents} className={`big ${cur.on_promotion ? 'sale' : ''}`} />{cur.compare_at_cents && cur.compare_at_cents > cur.price_cents && <s className="was">{money(cur.compare_at_cents)}</s>}</span>
                <span className={`stock ${cur.in_stock ? '' : 'out'}`}>{cur.in_stock ? (cur.available <= 5 ? `Only ${cur.available} left` : t('In stock')) : t('Out of stock')}</span></div>
              {p.offers.length > 1 && <label className="small"><span className="muted">Sold by</span>
                <select className="input" aria-label="Sold by" value={cur.offer_id} onChange={(e) => setSel(e.target.value)}>{p.offers.map((o) => <option key={o.offer_id} value={o.offer_id}>{o.store_name} — {money(o.price_cents)}{o.in_stock ? '' : ' (out of stock)'}</option>)}</select></label>}
              {p.offers.length === 1 && <span className="small">Sold by <strong>{cur.store_name}</strong></span>}
              {!cur.is_open && <span className="small muted">This store is closed now. You can add it but only check out while it is open.</span>}
              <AddToBasket cta offer={{ offer_id: cur.offer_id, slug, name: p.name, unit_price_cents: cur.price_cents, store_name: cur.store_name, store_slug: cur.store_slug, pack: packLabel(p), available: cur.available, in_stock: cur.in_stock }} />
            </>) : <Notice tone="warn">No store is currently selling this.</Notice>}
            {p.description && <p className="small qv-desc">{p.description.length > 220 ? `${p.description.slice(0, 220)}…` : p.description}</p>}
            <p className="small"><strong>Allergens:</strong> {p.allergens === null ? 'not supplied; check the package' : p.allergens.length ? p.allergens.join(', ') : 'none declared'}</p>
            <div className="row wrap qv-actions"><SaveToList slug={slug} /><Link to={`/p/${slug}`} onClick={onClose} className="small">Full details →</Link></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ProductGrid({ products }: { products: Card[] }) {
  return <ul className="pgrid" role="list">{products.map((p) => <li key={p.slug}><ProductCard p={p} /></li>)}</ul>;
}

/** Horizontally scrolling shelf with arrows on desktop and swipe on touch. */
export function Shelf({ title, subtitle, to, items, children }: { title: string; subtitle?: string; to?: string; items?: Card[]; children?: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ l: true, r: false });
  const upd = () => { const e = ref.current; if (e) setEdge({ l: e.scrollLeft < 4, r: e.scrollLeft + e.clientWidth >= e.scrollWidth - 4 }); };
  useEffect(() => { upd(); }, [items]);
  const go = (dir: number) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.85), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (items && !items.length) return null;
  return (
    <section className="shelf" aria-label={title}>
      <div className="shelf-head"><div><h2>{title}</h2>{subtitle && <p className="muted">{subtitle}</p>}</div>{to && <Link to={to} className="seeall">See all <IconChevron width={16} height={16} /></Link>}</div>
      <div className="shelf-wrap">
        <button className="shelf-btn l" aria-label={`Scroll ${title} left`} disabled={edge.l} onClick={() => go(-1)}><IconChevronL /></button>
        <ul className="shelf-row" role="list" ref={ref} onScroll={upd}>{children ?? items!.map((p) => <li key={p.slug}><ProductCard p={p} /></li>)}</ul>
        <button className="shelf-btn r" aria-label={`Scroll ${title} right`} disabled={edge.r} onClick={() => go(1)}><IconChevron /></button>
      </div>
    </section>
  );
}

/** Recently viewed: small tiles in one row. When they do not fit the screen the row drifts sideways on its own (pauses on hover or focus; still, and swipeable, for reduced motion). */
export function RecentStrip({ items }: { items: Card[] }) {
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    const measure = () => {
      const b = box.current, t = track.current; if (!b || !t) return;
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // when moving the track holds two copies, so one copy is half of it
      const one = moving ? t.scrollWidth / 2 : t.scrollWidth;
      setMoving(!still && one > b.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure); if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [items, moving]);
  if (!items.length) return null;
  const tile = (p: Card, hidden = false) => (
    <li key={(hidden ? 'c' : '') + p.slug} aria-hidden={hidden || undefined}>
      <Link to={`/p/${p.slug}`} className="rvtile" tabIndex={hidden ? -1 : undefined}>
        <span className="rvimg">{p.image_url ? <SafeImg src={p.image_url} loading="lazy" decoding="async" fallback={<ProductArt name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} />} /> : <ProductArt name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} />}</span>
        <span className="rvtext"><span className="rvname">{p.name}</span><span className="rvprice">{money(p.min_price)}</span></span>
      </Link>
    </li>
  );
  return (
    <section className="shelf recent" aria-label="Recently viewed">
      <h2 className="rhead">Recently viewed</h2>
      <div className={`rbox ${moving ? 'moving' : ''}`} ref={box}>
        <ul className="rtrack" role="list" ref={track} style={moving ? { animationDuration: `${Math.max(12, items.length * 4)}s` } : undefined}>
          {items.map((p) => tile(p))}{moving && items.map((p) => tile(p, true))}
        </ul>
      </div>
    </section>
  );
}

export function StoreTile({ s }: { s: StoreCard }) {
  return (
    <Link to={`/s/${s.slug}`} className="stile">
      <div className="stile-cover">{s.cover_url ? <SafeImg src={s.cover_url} loading="lazy" fallback={<StoreBanner name={s.name} />} /> : <StoreBanner name={s.name} />}</div>
      <div className="stile-body">
        {s.logo_url ? <img src={s.logo_url} alt="" width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : <StoreMark name={s.name} size={44} />}
        <div><h3>{s.name}</h3><span className="muted small">{s.city}{s.min_order_cents ? ` · $${(s.min_order_cents / 100).toFixed(0)} minimum` : ''}</span></div>
      </div>
      <div className="row wrap" style={{ padding: '0 14px 14px' }}>
        <Badge tone={s.is_open ? 'ok' : 'warn'}>{s.is_open ? 'Open now' : 'Closed now'}</Badge>
        {s.regions.slice(0, 2).map((r) => <Badge key={r.slug}>{r.name}</Badge>)}
        {s.is_test_data && <Badge tone="demo">Demo store</Badge>}
      </div>
    </Link>
  );
}
export function StoreList({ stores }: { stores: StoreCard[] }) {
  return <ul className="sgrid" role="list">{stores.map((s) => <li key={s.slug}><StoreTile s={s} /></li>)}</ul>;
}

export function BasketBar() {
  const t = useT();
  const { count, cart, guest } = useCart();
  if (!count) return null;
  const subtotal = cart ? cart.subtotal_cents : guest.reduce((a, g) => a + g.unit_price_cents * g.quantity, 0);
  return (
    <div className="sticky-bar" role="region" aria-label="Basket summary">
      <span><strong>{count}</strong> item{count === 1 ? '' : 's'} · <strong>{money(subtotal)}</strong></span>
      <Link to="/cart" className="btn cta">{t('View basket')}</Link>
    </div>
  );
}

export type OfferInfo = { offer_id: string; slug: string; name: string; unit_price_cents: number; store_name: string; store_slug: string; pack: string; available: number; in_stock: boolean };
export function AddToBasket({ offer, size, cta }: { offer: OfferInfo; size?: 'sm' | 'lg'; cta?: boolean }) {
  const t = useT();
  const { qtyOf, setQty } = useCart();
  const q = qtyOf(offer.offer_id);
  if (!offer.in_stock) return <Button variant="secondary" size={size} disabled>{t('Out of stock')}</Button>;
  if (q === 0) return <button className={`btn ${cta ? 'cta' : 'primary'} ${size ?? ''} wide`} onClick={() => setQty(offer, 1)} aria-label={`Add to basket: ${offer.name} from ${offer.store_name}`}>{t('Add to basket')}</button>;
  return <Stepper value={q} max={Math.min(99, offer.available)} label={`${offer.name} from ${offer.store_name}`} onChange={(n) => setQty(offer, Math.max(0, n))} />;
}
export function useOnVisible(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { cb(); io.disconnect(); } }); io.observe(el); return () => io.disconnect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
