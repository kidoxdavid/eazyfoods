import { Link } from 'react-router-dom';
import { money, packLabel } from '../api';
import { useApi } from '../hooks';
import { AddToBasket } from '../cards';
import { ProductArt } from '../art';
import { Button, ErrorBox, Loading } from '../ui';

type Item = {
  slug: string; name: string; brand: string | null; pack_size: string | null; pack_unit: string | null; image_url: string | null; offer_id: string;
  price_cents: number; compare_at_cents: number | null; on_promotion: boolean; available: number; multibuy: { min_qty: number; unit_price_cents: number } | null;
};
type Flyer = { stores: { slug: string; name: string; items: Item[] }[] };

/** This week's offers from every store, in a layout that prints cleanly. Prices are live, so there is nothing to go out of date. */
export function FlyerPage() {
  const { data, loading, error, reload } = useApi<Flyer>('/flyer');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  return (
    <>
      <div className="row between wrap"><h1>This week’s flyer</h1><Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}>Print</Button></div>
      <p className="muted">Sale prices and multi-buy offers from local stores, as of today. Prices are live and stock is checked when you add to your basket.</p>
      {!data?.stores.length && <p>No offers are running right now. Check back soon, or see <Link to="/deals">deals</Link>.</p>}
      {data?.stores.map((s) => (
        <section key={s.slug} className="flyer-store"><h2><Link to={`/s/${s.slug}`}>{s.name}</Link></h2>
          <div className="flyer-grid">
            {s.items.map((i) => {
              const pack = packLabel(i);
              return (
                <article key={i.offer_id} className="flyer-item">
                  {i.image_url ? <img src={i.image_url} alt="" loading="lazy" /> : <ProductArt name={i.name} brand={i.brand} size={pack} />}
                  <Link to={`/p/${i.slug}`}><strong>{i.name}</strong></Link>
                  <span className="muted small">{[i.brand, pack].filter(Boolean).join(' · ')}</span>
                  <span><strong>{money(i.price_cents)}</strong>{i.compare_at_cents && i.compare_at_cents > i.price_cents && <s className="was"> {money(i.compare_at_cents)}</s>}</span>
                  {i.multibuy && <span className="multibuy">Buy {i.multibuy.min_qty}+: {money(i.multibuy.unit_price_cents)} each</span>}
                  <span className="no-print"><AddToBasket size="sm" offer={{ offer_id: i.offer_id, slug: i.slug, name: i.name, unit_price_cents: i.price_cents, store_name: s.name, store_slug: s.slug, pack, in_stock: true, available: i.available }} /></span>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
