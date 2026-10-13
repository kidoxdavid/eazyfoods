import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowUp, ChefHat, Store, Truck, ShieldCheck, Star, MapPin, Clock, Flame } from 'lucide-react'
import api from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import { resolveImageUrl } from '../utils/imageUtils'
import ProductTile from '../components/ProductTile'
import Section from '../components/Section'

const PROMPTS = [
  { emoji: '🍲', label: 'Egusi soup tonight', ask: 'What do I need to make egusi soup for 4 people?' },
  { emoji: '🗓️', label: 'Plan my week', ask: 'Build me a weekly meal plan for 2 people' },
  { emoji: '🎄', label: 'Holiday feast', ask: 'Plan a Christmas feast for 8 people' },
  { emoji: '🌶️', label: 'Jollof party rice', ask: 'Ingredients for party jollof rice for 10' },
  { emoji: '💸', label: 'Under $30', ask: 'Suggest a budget-friendly dinner under $30' },
]

const asList = (d, key) => (Array.isArray(d) ? d : d?.[key] || [])

const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} />

const AskHero = () => {
  const [text, setText] = useState('')
  const ask = (message) => window.dispatchEvent(new CustomEvent('eazybot:ask', { detail: { message } }))
  const submit = (e) => { e.preventDefault(); if (text.trim()) { ask(text.trim()); setText('') } }

  return (
    <section className="relative overflow-hidden bg-primary-900 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #ff8c00 0, transparent 38%), radial-gradient(circle at 85% 80%, #22c55e 0, transparent 40%)' }} />
      <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:py-24">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-nude-200 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered shopping
        </p>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          Taste of home,<br className="hidden sm:block" /> delivered to your door.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/80 sm:text-lg">
          Tell EazyBot what you&apos;re craving. It finds the ingredients, builds the meal plan, and fills your cart from local African stores and chefs.
        </p>

        <form onSubmit={submit} className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-white p-2 pl-5 shadow-lift">
          <Sparkles className="hidden h-5 w-5 shrink-0 text-nude-600 sm:block" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What are you cooking this week?"
            aria-label="Ask EazyBot"
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
          <button type="submit" aria-label="Ask" disabled={!text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nude-700 text-white transition hover:bg-nude-800 disabled:opacity-40">
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {PROMPTS.map((p) => (
            <button key={p.label} type="button" onClick={() => ask(p.ask)} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20">
              <span className="mr-1.5">{p.emoji}</span>{p.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

const TrustStrip = () => (
  <div className="border-b border-ink-100 bg-white">
    <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 text-sm sm:px-6 md:grid-cols-4 lg:px-8">
      {[
        [Store, 'Local African stores', 'Verified vendors near you'],
        [ChefHat, 'Chef-made meals', 'Cooked fresh to order'],
        [Truck, 'Delivery or pickup', 'Your choice at checkout'],
        [ShieldCheck, 'Secure payment', 'Card payments, protected'],
      ].map(([Icon, title, sub]) => (
        <li key={title} className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Icon className="h-5 w-5" /></span>
          <span className="leading-tight"><span className="block font-semibold text-ink-900">{title}</span><span className="text-xs text-ink-500">{sub}</span></span>
        </li>
      ))}
    </ul>
  </div>
)

const Avatar = ({ src, name, className = '' }) => {
  const url = resolveImageUrl(src)
  return url
    ? <img src={url} alt={name} loading="lazy" className={`object-cover ${className}`} />
    : <div className={`flex items-center justify-center bg-primary-100 font-display text-2xl font-bold text-primary-800 ${className}`}>{(name || '?').charAt(0)}</div>
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

  const rowSkeleton = (
    <div className="flex gap-4 overflow-hidden">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 w-44 shrink-0 sm:w-52" />)}</div>
  )

  return (
    <div className="pb-16">
      <AskHero />
      <TrustStrip />

      <div className="mt-10 space-y-14">
        {(loading || data.categories.length > 0) && (
          <Section title="Shop by category" to="/groceries" linkLabel="All groceries">
            {loading ? (
              <div className="flex gap-2 overflow-hidden">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-28 !rounded-full" />)}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.categories.map((c) => (
                  <Link key={c.id || c.category_id} to={`/groceries?category=${c.id || c.category_id}`} className="chip">{c.name || c.category_name}</Link>
                ))}
              </div>
            )}
          </Section>
        )}

        {(loading || data.deals.length > 0) && (
          <Section eyebrow="Limited time" title="Deals worth grabbing" to="/top-market-deals" scroll>
            {loading ? rowSkeleton : data.deals.map((p) => <div key={p.id} className="snap-start"><ProductTile product={p} /></div>)}
          </Section>
        )}

        {(loading || data.fresh.length > 0) && (
          <Section eyebrow="Just in" title="Fresh on the shelves" to="/groceries?sort=newest" scroll>
            {loading ? rowSkeleton : data.fresh.map((p) => <div key={p.id} className="snap-start"><ProductTile product={p} /></div>)}
          </Section>
        )}

        {data.chefs.length > 0 && (
          <Section eyebrow="Home cooking" title="Chefs cooking near you" to="/chefs" scroll>
            {data.chefs.map((c) => (
              <Link key={c.id} to={`/chefs/${c.id}`} className="group w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative h-28 bg-primary-100">
                  {c.banner_image_url && <img src={resolveImageUrl(c.banner_image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  <Avatar src={c.profile_image_url} name={c.chef_name} className="absolute -bottom-7 left-4 h-14 w-14 rounded-full border-4 border-white" />
                </div>
                <div className="px-4 pb-4 pt-9">
                  <p className="truncate font-semibold text-ink-900">{c.chef_name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">{(c.cuisines || []).slice(0, 3).join(' · ') || 'Home kitchen'}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-ink-600">
                    {c.average_rating && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-nude-500 text-nude-500" />{c.average_rating.toFixed(1)}</span>}
                    {c.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.city}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </Section>
        )}

        {data.recipes.length > 0 && (
          <Section eyebrow="Cook it yourself" title="Recipes & meal plans" to="/meals" scroll>
            {data.recipes.map((r) => (
              <Link key={r.id} to={`/meals/${r.id}`} className="group relative h-64 w-60 shrink-0 snap-start overflow-hidden rounded-2xl bg-ink-800 shadow-soft transition hover:shadow-lift">
                {r.image_url && <img src={resolveImageUrl(r.image_url)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="font-display text-lg font-bold leading-tight">{r.name}</p>
                  <p className="mt-1 flex items-center gap-3 text-xs text-white/80">
                    {(r.prep_time_minutes || r.cook_time_minutes) && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{(r.prep_time_minutes || 0) + (r.cook_time_minutes || 0)} min</span>}
                    {r.servings && <span>Serves {r.servings}</span>}
                  </p>
                </div>
              </Link>
            ))}
          </Section>
        )}

        {data.stores.length > 0 && (
          <Section eyebrow="Shop local" title="African markets near you" to="/stores">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.stores.map((s) => (
                <Link key={s.id} to={`/stores/${s.id}`} className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <Avatar src={s.store_profile_image_url} name={s.store_name || s.business_name} className="h-16 w-16 shrink-0 rounded-2xl" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{s.store_name || s.business_name}</p>
                    <p className="truncate text-xs text-ink-500">{[s.city, s.state].filter(Boolean).join(', ')}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                      {s.average_rating && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-nude-500 text-nude-500" />{s.average_rating.toFixed(1)}</span>}
                      {s.delivery_available && <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" />Delivery</span>}
                      {s.pickup_available && <span>Pickup</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-4xl bg-nude-700 px-6 py-10 text-white sm:px-12">
            <Flame aria-hidden="true" className="absolute -right-6 -top-6 h-48 w-48 text-white/10" />
            <div className="relative max-w-xl">
              <h2 className="font-display text-3xl font-bold">Cook for a living? Sell with eazyfoods.</h2>
              <p className="mt-2 text-white/90">Open a store or a chef kitchen and reach customers who miss the taste of home.</p>
              <a href={(import.meta.env.VITE_PORTALS_URL || 'https://portals.eazyfoods.ca').trim()} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-nude-800 shadow-soft transition hover:shadow-lift">Become a partner</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home
