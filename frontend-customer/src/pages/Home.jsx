import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowUpRight, ArrowRight, Star, Clock } from 'lucide-react'
import api from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import { resolveImageUrl } from '../utils/imageUtils'
import ProductCard from '../components/ProductCard'
import Section from '../components/Section'
import AdCarousel from '../components/AdCarousel'

const PROMPTS = [
  { label: 'Egusi soup tonight', ask: 'What do I need to make egusi soup for 4 people?' },
  { label: 'Plan my week', ask: 'Build me a weekly meal plan for 2 people' },
  { label: 'Holiday feast', ask: 'Plan a Christmas feast for 8 people' },
  { label: 'Dinner under $30', ask: 'Suggest a budget-friendly dinner under $30' },
]

const STEPS = [
  ['01', 'Choose', 'Browse groceries from local African stores and meals from home chefs, all in one basket.'],
  ['02', 'We prepare', 'Stores pack your order and chefs cook to order, so it reaches you ready to go.'],
  ['03', 'Delivered', 'Choose delivery to your door or collect it yourself, then follow the order from your account.'],
]

const asList = (d, key) => (Array.isArray(d) ? d : d?.[key] || [])
const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} />

const Photo = ({ src, name, className = '' }) => {
  const url = resolveImageUrl(src)
  return url
    ? <img src={url} alt={name} loading="lazy" className={`h-full w-full object-cover ${className}`} />
    : <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-paper-200 to-paper-300 font-display text-4xl text-ink-400 ${className}`}>{(name || '?').charAt(0)}</div>
}

const Hero = ({ categories }) => {
  const [text, setText] = useState('')
  const ask = (message) => window.dispatchEvent(new CustomEvent('eazybot:ask', { detail: { message } }))
  const submit = (e) => { e.preventDefault(); if (text.trim()) { ask(text.trim()); setText('') } }
  const tiles = categories.slice(0, 4)

  return (
    <section className="border-b border-paper-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-14 lg:px-8 lg:py-20">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-5">African groceries &amp; chef-made meals</p>
          <h1 className="display-xl text-[2.6rem] sm:text-6xl lg:text-[4.25rem]">
            The taste of home,<br />
            <em className="font-normal italic text-primary-600">delivered.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            Shop local African stores and cook-to-order chefs in a single basket. Or tell EazyBot what you&apos;re making and it fills the cart for you.
          </p>

          <form onSubmit={submit} className="mt-8 max-w-xl" role="search" aria-label="Ask EazyBot">
            <label htmlFor="hero-ask" className="label">Ask EazyBot</label>
            <div className="flex overflow-hidden rounded-md border border-ink-900 bg-white focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2">
              <input id="hero-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="What are you cooking this week?" className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base text-ink-900 placeholder:text-ink-400 focus:outline-none" />
              <button type="submit" aria-label="Send to EazyBot" disabled={!text.trim()} className="flex w-14 items-center justify-center bg-ink-900 text-paper-100 transition hover:bg-primary-700 disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
              <span className="text-ink-500">Try:</span>
              {PROMPTS.map((p) => (
                <button key={p.label} type="button" onClick={() => ask(p.ask)} className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">{p.label}</button>
              ))}
            </p>
          </form>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/groceries" className="btn-primary">Shop groceries</Link>
            <Link to="/meals" className="btn-secondary">Browse meals &amp; plans</Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="eyebrow mb-4">Start with a category</p>
          <ul className="grid grid-cols-2 gap-3">
            {(tiles.length ? tiles : Array.from({ length: 4 })).map((c, i) => (
              <li key={c?.id || i}>
                {c ? (
                  <Link to={`/groceries?category=${c.id || c.category_id}`} className="group flex aspect-[4/3] flex-col justify-between rounded-lg border border-paper-300 bg-paper-200 p-4 transition hover:border-ink-900 hover:bg-paper-300">
                    <span className="text-xs tabular-nums text-ink-500">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex items-end justify-between gap-2">
                      <span className="font-display text-xl leading-tight text-ink-900">{c.name || c.category_name}</span>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-ink-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ) : <Skeleton className="aspect-[4/3]" />}
              </li>
            ))}
          </ul>
          <Link to="/groceries" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900 underline decoration-ink-300 underline-offset-[6px] hover:decoration-ink-900">All categories <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  )
}

const Home = () => {
  const { selectedCity } = useLocation()
  const [data, setData] = useState({ deals: [], fresh: [], categories: [], chefs: [], stores: [], recipes: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const city = selectedCity && selectedCity !== 'All' ? { city: selectedCity } : {}
    const safe = (p) => p.catch(() => ({ data: null }))
    setLoading(true)
    Promise.all([
      safe(api.get('/customer/home-products', { params: { ...city, limit: 24 } })),
      safe(api.get('/customer/categories', { params: city })),
      safe(api.get('/customer/chefs', { params: { limit: 8, ...city } })),
      safe(api.get('/customer/stores/', { params: city })),
      safe(api.get('/customer/recipes/', { params: { limit: 8 } })),
    ]).then(([prods, cats, chefs, stores, recipes]) => {
      if (cancelled) return
      const hp = prods.data || {}
      setData({
        deals: asList(hp.discounted),
        fresh: asList(hp.new_arrivals).length ? asList(hp.new_arrivals) : asList(hp.products).slice(0, 12),
        categories: asList(cats.data, 'categories').slice(0, 14),
        chefs: asList(chefs.data, 'chefs'),
        stores: asList(stores.data, 'stores').slice(0, 6),
        recipes: asList(recipes.data, 'recipes'),
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedCity])

  const rowSkeleton = <div className="flex gap-5 overflow-hidden">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[4/6] w-44 shrink-0 sm:w-52" />)}</div>

  return (
    <div className="pb-8">
      <Hero categories={data.categories} />
      <AdCarousel className="mt-10" />

      <div className="mt-16 space-y-20">
        {(loading || data.deals.length > 0) && (
          <Section eyebrow="Limited time" title="Offers worth a look" to="/top-market-deals" scroll>
            {loading ? rowSkeleton : data.deals.map((p) => <ProductCard key={p.id} product={p} variant="row" />)}
          </Section>
        )}

        {(loading || data.fresh.length > 0) && (
          <Section eyebrow="Just in" title="Fresh on the shelves" to="/groceries?sort=newest" scroll>
            {loading ? rowSkeleton : data.fresh.map((p) => <ProductCard key={p.id} product={p} variant="row" />)}
          </Section>
        )}

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="how-it-works">
          <p className="eyebrow mb-3">How it works</p>
          <h2 id="how-it-works" className="section-title mb-8 max-w-xl">One basket for the market and the kitchen.</h2>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-paper-300 bg-paper-300 md:grid-cols-3">
            {STEPS.map(([n, t, d]) => (
              <li key={n} className="bg-paper-100 p-7">
                <span className="font-display text-4xl text-nude-600">{n}</span>
                <h3 className="mt-4 font-display text-xl text-ink-900">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {data.chefs.length > 0 && (
          <Section eyebrow="Home cooking" title="Chefs cooking near you" to="/chefs" scroll>
            {data.chefs.map((c) => (
              <Link key={c.id} to={`/chefs/${c.id}`} className="group w-60 shrink-0 snap-start">
                <div className="aspect-square overflow-hidden rounded-lg bg-paper-200"><Photo src={c.profile_image_url || c.banner_image_url} name={c.chef_name} className="transition duration-700 group-hover:scale-[1.04]" /></div>
                <p className="mt-3 font-display text-lg text-ink-900 group-hover:underline group-hover:decoration-ink-300 group-hover:underline-offset-4">{c.chef_name}</p>
                <p className="mt-0.5 truncate text-sm text-ink-600">{(c.cuisines || []).slice(0, 3).join(' · ') || 'Home kitchen'}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                  {c.average_rating && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-ochre-400 text-ochre-400" />{c.average_rating.toFixed(1)}</span>}
                  {c.city && <span>{c.city}</span>}
                </p>
              </Link>
            ))}
          </Section>
        )}

        {data.recipes.length > 0 && (
          <Section eyebrow="Cook it yourself" title="Recipes & meal plans" to="/meals" scroll>
            {data.recipes.map((r) => (
              <Link key={r.id} to={`/meals/${r.id}`} className="group w-64 shrink-0 snap-start">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-paper-200"><Photo src={r.image_url} name={r.name} className="transition duration-700 group-hover:scale-[1.04]" /></div>
                <p className="mt-3 font-display text-lg leading-snug text-ink-900 group-hover:underline group-hover:decoration-ink-300 group-hover:underline-offset-4">{r.name}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                  {(r.prep_time_minutes || r.cook_time_minutes) && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{(r.prep_time_minutes || 0) + (r.cook_time_minutes || 0)} min</span>}
                  {r.servings && <span>Serves {r.servings}</span>}
                </p>
              </Link>
            ))}
          </Section>
        )}

        {data.stores.length > 0 && (
          <Section eyebrow="Shop local" title="African markets near you" to="/stores">
            <ul className="divide-y divide-paper-300 border-y border-paper-300">
              {data.stores.map((s) => (
                <li key={s.id}>
                  <Link to={`/stores/${s.id}`} className="group grid grid-cols-12 items-center gap-4 py-5 transition hover:bg-paper-200/60">
                    <span className="col-span-12 font-display text-xl text-ink-900 sm:col-span-5">{s.store_name || s.business_name}</span>
                    <span className="col-span-7 text-sm text-ink-600 sm:col-span-3">{[s.city, s.state].filter(Boolean).join(', ')}</span>
                    <span className="col-span-5 text-sm text-ink-600 sm:col-span-3">{[s.delivery_available && 'Delivery', s.pickup_available && 'Pickup'].filter(Boolean).join(' · ')}</span>
                    <ArrowUpRight className="col-span-1 hidden h-5 w-5 justify-self-end text-ink-500 transition group-hover:text-ink-900 sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 rounded-lg bg-primary-900 px-7 py-12 text-paper-100 sm:px-12 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="eyebrow mb-3 !text-ochre-300">For stores &amp; chefs</p>
              <h2 className="font-display text-3xl font-medium leading-tight tracking-tight !text-white sm:text-4xl">Sell where people are already looking for the taste of home.</h2>
              <p className="mt-3 max-w-xl text-paper-300">Open a store or a chef kitchen on eazyfoods and reach customers across the city.</p>
            </div>
            <div className="md:col-span-4 md:justify-self-end">
              <a href={(import.meta.env.VITE_PORTALS_URL || 'https://portals.eazyfoods.ca').trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-paper-100 px-6 py-3 text-sm font-semibold tracking-wide text-primary-900 transition hover:bg-white">Become a partner <ArrowUpRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home
