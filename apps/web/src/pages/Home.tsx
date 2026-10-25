import { useRef } from 'react';
import { SkelShelf } from '../skeletons';
import { useFeature } from '../features';
import { Link } from 'react-router-dom';
import { recentSlugs, type Region, type StoreCard } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { DeptArt, ProductArt, RegionArt } from '../art';
import { RecentStrip, Shelf, StoreList, type Card } from '../cards';
import { HeroCarousel, type Slide } from '../carousel';
import { ErrorBox, Loading, Notice } from '../ui';
import { IconShield, IconStore, IconSwap, IconTruck, IconBook } from '../icons';
import { post } from '../api';
import { useAdImpression } from '../cards';
import { useSiteTheme } from '../theme';
import { KitchenList } from './Kitchens';

type Layout = { sections: { id: string; enabled: boolean }[] };
const DEFAULT_LAYOUT = ['regions', 'deals', 'departments', 'collections_a', 'new', 'collections_b', 'stores', 'kitchens', 'recipes', 'trust'];

type Search = { results: Card[] };
const REGION_COLOURS: [string, string][] = [['#0f5a3a', '#1f8f5b'], ['#a3470f', '#e08a1e'], ['#254e8f', '#4a86d4'], ['#7a2e5d', '#b4508a'], ['#136f63', '#2bb3a1'], ['#8c2f39', '#d4564a']];

type Shape = { regions: { slug: string; name: string }[]; departments: { slug: string; name: string }[]; collections: { slug: string }[]; deals: number; fresh: number; stores: number; kitchens: number; recipes: number };

/** The home page only ever draws what the server says exists (see /home/shape), so nothing appears and then disappears. */
function RegionQuad({ r }: { r: { slug: string; name: string } }) {
  return (
    <Link to={`/search?region=${r.slug}`} className="quad">
      <h3>Shop {r.name} groceries</h3>
      <div className="quad-art"><RegionArt slug={r.slug} /></div>
      <span className="go">See all {r.name.split(' ')[0]} products</span>
    </Link>
  );
}

function HomeBanner() {
  const { data } = useApi<{ id: string; title: string; body: string | null; image_url: string | null; store: { slug: string } | null }[]>('/ads?placement=home_banner');
  const ad = data?.[0];
  useAdImpression(ad?.id);
  if (!ad) return null;
  return (
    <Link to={ad.store ? `/s/${ad.store.slug}` : '/stores'} className="banner" onClick={() => post(`/ads/${ad.id}/event`, { type: 'click' }).catch(() => {})}>
      {ad.image_url && <img src={ad.image_url} alt="" />}
      <div><span className="sponsor">Sponsored</span><h3 style={{ margin: '4px 0 2px' }}>{ad.title}</h3>{ad.body && <span className="muted">{ad.body}</span>}</div>
    </Link>
  );
}

function CollectionShelf({ slug }: { slug: string }) {
  const { data } = useApi<{ collection: { title: string; subtitle: string }; products: Card[] }>(`/collections/${slug}`);
  if (!data?.products.length) return null;
  return <Shelf title={data.collection.title} subtitle={data.collection.subtitle} to={`/c/${slug}`} items={data.products} />;
}

/** Personal shelves: what you buy often, and what you looked at lately. Both stay empty (and invisible) for new visitors. */
function Personal() {
  const on = useFeature('shop.lists');
  const { me } = useAuth();
  const again = useApi<Card[]>(me && on ? '/me/buy-again' : null);
  const slugs = recentSlugs();
  const recent = useApi<Card[]>(slugs.length ? `/products-cards?slugs=${slugs.join(',')}` : null);
  return (
    <>
      {!!again.data?.length && <Shelf title="Buy it again" subtitle="Things you have ordered before" items={again.data} />}
      {!!recent.data?.length && <RecentStrip items={recent.data} />}
    </>
  );
}

export function Home() {
  const content = useApi<{ home_hero?: { title: string; subtitle: string }; home_layout?: Layout }>('/content/home');
  const { theme, loading: themeLoading } = useSiteTheme();
  const banners = useApi<{ id: string; title: string; subtitle: string; cta_label: string; cta_link: string; image_url: string | null; video_url: string | null; from_color: string; to_color: string }[]>('/home/banners');
  const shape = useApi<Shape>('/home/shape');
  const regions = useApi<Region[]>('/regions');
  const stores = useApi<StoreCard[]>('/stores');
  const deals = useApi<Card[]>('/deals');
  const fresh = useApi<Card[]>('/new-arrivals');
  const kitchens = useApi<any[]>('/kitchens');
  const recipes = useApi<{ slug: string; title: string; summary: string }[]>('/recipes');
  const featured = useApi<Search>('/search?in_stock=1&sort=price_desc');
  const eastSearch = useApi<Search>(`/search?region=${regions.data?.[1]?.slug ?? 'east-africa'}&in_stock=1`);
  const hero = content.data?.home_hero;
  const east = regions.data?.[1];

  // The first slide must never move. Theme, banners and the welcome text come embedded in the page, so slide 1 is right from the very first paint.
  // Slides that depend on product data are only ever added AFTER it, in a fixed order, so nothing flashes or jumps while they arrive.
  // Without embedded data (the dev server), wait for those three small answers and show a neutral placeholder meanwhile.
  const head = !themeLoading && !banners.loading && !content.loading;
  const slides: Slide[] = [];
  if (head && theme) slides.push({ id: 'theme', from: theme.palette.hero_from, to: theme.palette.hero_to, eyebrow: `${theme.emoji} ${theme.name}`.trim(), title: theme.headline, text: theme.subtitle, cta: { to: theme.cta_link || '/search', label: theme.cta_label || 'Start shopping' }, art: featured.data?.results ?? [], motif: theme.motif });
  if (head) for (const b of banners.data ?? []) slides.push({ id: `banner-${b.id}`, from: b.from_color, to: b.to_color, eyebrow: 'Featured', title: b.title, text: b.subtitle, cta: { to: b.cta_link || '/', label: b.cta_label || 'Learn more' }, art: b.image_url || b.video_url ? [] : featured.data?.results ?? [], image: b.image_url, video: b.video_url });
  if (head) slides.push({ id: 'welcome', from: '#0b3a24', to: '#1d7a4c', eyebrow: 'Calgary · African groceries', title: (hero?.title ?? 'African groceries, from the stores you trust.').replace('\n', ' '), text: hero?.subtitle ?? 'Compare each store’s own price and stock, then have it delivered.', cta: { to: '/search', label: 'Start shopping' }, art: featured.data?.results ?? [] });
  if (head && deals.data?.length) slides.push({ id: 'deals', from: '#b8260f', to: '#f0701f', eyebrow: 'Weekly deals', title: 'Save on pantry staples this week', text: 'Live promotions from local stores, priced as you’ll pay.', cta: { to: '/deals', label: 'Shop deals' }, art: deals.data });
  if (head && east && eastSearch.data?.results.length) slides.push({ id: 'east', from: '#7a3a0b', to: '#d98b1f', eyebrow: east.name, title: `Discover ${east.name.replace(' Africa', '')} African ingredients`, text: east.countries.slice(0, 4).map((c) => c.name).join(' · '), cta: { to: `/search?region=${east.slug}`, label: `Shop ${east.name}` }, art: eastSearch.data.results });
  if (head && recipes.data?.length && featured.data) slides.push({ id: 'cook', from: '#3b2a6b', to: '#7a4bb8', eyebrow: 'Cook tonight', title: recipes.data[0].title, text: 'Add the ingredients that are in stock to your basket in one tap.', cta: { to: `/recipes`, label: 'See recipes' }, art: [...featured.data.results].reverse() });

  // Show slides in the order they first appeared: a slide whose data arrives late is added at the end and never pushes earlier slides around.
  const seen = useRef<string[]>([]);
  for (const sl of slides) if (!seen.current.includes(sl.id)) seen.current.push(sl.id);
  slides.sort((a, b) => seen.current.indexOf(a.id) - seen.current.indexOf(b.id));

  const sh: Shape = shape.data ?? { regions: [], departments: [], collections: [], deals: 0, fresh: 0, stores: 0, kitchens: 0, recipes: 0 };
  const parts: Record<string, JSX.Element | null> = {
    regions: sh.regions.length ? <div key="regions" className="quads">{sh.regions.slice(0, 4).map((r) => <RegionQuad key={r.slug} r={r} />)}</div> : null,
    deals: sh.deals > 0 ? (deals.data ? <Shelf key="deals" title="Today’s deals" subtitle="Live promotions — the price shown is what you pay" to="/deals" items={deals.data} /> : <SkelShelf key="deals" />) : null,
    departments: sh.departments.length ? (
      <section key="departments" className="block" aria-labelledby="dept-h">
        <h2 id="dept-h">Shop by department</h2>
        <ul className="depts" role="list">{sh.departments.map((c) => <CatTile key={c.slug} slug={c.slug} name={c.name} />)}</ul>
      </section>) : null,
    collections_a: <div key="collections_a">{sh.collections.slice(0, 2).map((c) => <CollectionShelf key={c.slug} slug={c.slug} />)}</div>,
    new: sh.fresh > 0 ? (fresh.data ? <Shelf key="new" title="New arrivals" subtitle="Just added to the catalogue" to="/new" items={fresh.data} /> : <SkelShelf key="new" />) : null,
    collections_b: <div key="collections_b">{sh.collections.slice(2, 4).map((c) => <CollectionShelf key={c.slug} slug={c.slug} />)}</div>,
    stores: sh.stores > 0 ? (
      <section key="stores" className="block" aria-labelledby="stores-h">
        <div className="shelf-head"><h2 id="stores-h">Stores near you</h2><Link to="/stores" className="seeall">All stores</Link></div>
        {stores.loading && <SkelShelf />}{stores.error && <ErrorBox message={stores.error} retry={stores.reload} />}
        {stores.data && <StoreList stores={stores.data} />}
      </section>) : null,
    kitchens: sh.kitchens > 0 && kitchens.data?.length ? (
      <section key="kitchens" className="block" aria-labelledby="kit-h">
        <div className="shelf-head"><div><h2 id="kit-h">Home chefs</h2><p className="muted">Meals cooked to order by local home cooks.</p></div><Link to="/kitchens" className="seeall">All home chefs</Link></div>
        <KitchenList items={kitchens.data.slice(0, 4)} />
      </section>) : null,
    recipes: sh.recipes > 0 && recipes.data?.length ? (
      <section key="recipes" className="block" aria-labelledby="rec-h">
        <div className="shelf-head"><div><h2 id="rec-h">Cook something tonight</h2><p className="muted">Recipes linked to what’s in stock.</p></div><Link to="/recipes" className="seeall">All recipes</Link></div>
        <ul className="recipe-tiles" role="list">{recipes.data.slice(0, 4).map((r, i) => <li key={r.slug}><Link to={`/recipes/${r.slug}`} className="rtile" style={{ background: `linear-gradient(135deg, ${REGION_COLOURS[i % 6][0]}, ${REGION_COLOURS[i % 6][1]})` }}><h3>{r.title}</h3><p>{r.summary}</p></Link></li>)}</ul>
      </section>) : null,
    trust: (
      <div key="trust" className="trust">
        <div><IconStore /><span><b>Local African grocers</b>Real stores, each with its own stock and prices.</span></div>
        <div><IconSwap /><span><b>Compare stores</b>See every store’s price side by side.</span></div>
        <div><IconTruck /><span><b>Delivery you can see</b>Fees and times shown per store before you pay.</span></div>
        <div><IconShield /><span><b>Help when it goes wrong</b>Report a problem and we’ll make it right. <Link to="/pages/refund-policy">Policy</Link></span></div>
      </div>),
  };
  const order = content.data?.home_layout?.sections ?? DEFAULT_LAYOUT.map((id) => ({ id, enabled: true }));
  return (
    <>
      {slides.length ? <HeroCarousel slides={slides} /> : <div className="hero-skel" aria-hidden="true" />}
      {stores.data?.some((s) => s.is_test_data) && <Notice tone="warn"><strong>Development data.</strong> Stores marked “Demo store” are invented for testing and are not real businesses. Product pictures are illustrations until stores upload photos.</Notice>}
      <Personal />
      <HomeBanner />
      {regions.error && <ErrorBox message={regions.error} retry={regions.reload} />}
      {shape.data ? order.filter((x) => x.enabled).map((x) => parts[x.id]) : <><div className="quads" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="quad quad-skel" />)}</div><SkelShelf /></>}
      <span hidden><IconBook /></span>
    </>
  );
}

function CatTile({ slug, name }: { slug: string; name: string }) {
  return <li><Link to={`/search?category=${slug}`} className="dept"><div><DeptArt slug={slug} /></div>{name}</Link></li>;
}
