import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { MapPin, Menu, X, Search, Sparkles, Truck, ArrowRight, Mail, Package } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useLocation as useLocationContext } from '../contexts/LocationContext'
import Breadcrumbs from './Breadcrumbs'
import AnimatedCartIcon from './AnimatedCartIcon'
import CartPreview from './CartPreview'
import SearchAutocomplete from './SearchAutocomplete'
import LocationPicker from './LocationPicker'

const PageBanner = lazy(() => import('./PageBanner'))

const NAV = [
  { name: 'Groceries', href: '/groceries' },
  { name: 'Meals', href: '/meals' },
  { name: 'Chefs', href: '/chefs' },
  { name: 'Markets', href: '/stores' },
  { name: 'Deals', href: '/top-market-deals' },
]

const MORE = [
  { name: 'Chef deals', href: '/top-chef-deals' },
  { name: 'Orders', href: '/orders' },
  { name: 'Profile & addresses', href: '/profile' },
  { name: 'Drive with us', href: '/become-a-driver' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const BANNER_PLACEMENTS = {
  '/': 'home_bottom_banner',
  '/groceries': 'products_bottom_banner',
  '/stores': 'stores_bottom_banner',
  '/chefs': 'chefs_bottom_banner',
  '/cart': 'cart_bottom_banner',
  '/orders': 'orders_bottom_banner',
  '/profile': 'profile_bottom_banner',
  '/about': 'about_bottom_banner',
  '/contact': 'contact_bottom_banner',
  '/meals': 'meals_bottom_banner',
  '/top-market-deals': 'top_market_deals_bottom_banner',
  '/top-chef-deals': 'top_chef_deals_bottom_banner',
  '/checkout': 'checkout_bottom_banner',
}

const driverCta = (
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
    <div className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><Truck className="h-6 w-6" /></span>
      <div>
        <h3 className="font-display text-xl font-bold sm:text-2xl">Drive with eazyfoods</h3>
        <p className="text-sm text-white/85">Deliver groceries and meals on your own schedule.</p>
      </div>
    </div>
    <Link to="/become-a-driver" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary-800 shadow-soft transition hover:shadow-lift">
      Apply to drive <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
)

const Layout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { getCartItemCount } = useCart()
  const { selectedCity, selectedProvince } = useLocationContext()
  const count = getCartItemCount()
  const place = selectedCity && selectedCity !== 'All' ? selectedCity : selectedProvince || 'All Canada'

  useEffect(() => { setMenuOpen(false); setCartOpen(false); window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keep the box in sync with ?search= on the groceries page
  useEffect(() => {
    if (location.pathname === '/groceries') setQuery(new URLSearchParams(location.search).get('search') || '')
    else setQuery('')
  }, [location.pathname, location.search])

  const submitSearch = (e) => {
    e?.preventDefault()
    const q = query.trim()
    navigate(q ? `/groceries?search=${encodeURIComponent(q)}` : '/groceries')
    setSearchFocused(false)
  }

  const askBot = () => window.dispatchEvent(new CustomEvent('eazybot:ask', { detail: {} }))
  const placement = BANNER_PLACEMENTS[location.pathname] || (location.pathname.startsWith('/products') ? 'products_bottom_banner' : 'home_bottom_banner')
  const dealsPage = location.pathname === '/top-chef-deals' || location.pathname === '/top-market-deals'

  const navClass = ({ isActive }) =>
    `rounded-full px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'bg-primary-100 text-primary-900' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`

  return (
    <div className="flex min-h-screen flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className={`sticky top-0 z-50 border-b bg-cream-50/90 backdrop-blur transition-shadow ${scrolled ? 'border-ink-100 shadow-soft' : 'border-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-2 rounded-full p-2 text-ink-700 hover:bg-ink-50 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>

          <Link to="/" className="flex shrink-0 items-center" aria-label="eazyfoods home">
            <img src="/eazy.PNG" alt="eazyfoods" className="h-10 w-32 object-cover mix-blend-multiply sm:h-11 sm:w-40" style={{ objectPosition: "center 46%" }} />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((n) => <NavLink key={n.href} to={n.href} className={navClass}>{n.name}</NavLink>)}
          </nav>

          <form onSubmit={submitSearch} className="relative mx-2 hidden min-w-0 flex-1 md:block lg:max-w-md xl:max-w-lg">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search egusi, plantain, palm oil…"
              aria-label="Search groceries"
              className="w-full rounded-full border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <SearchAutocomplete
              query={query}
              onQueryChange={setQuery}
              onSelect={(p) => { if (p) navigate(`/products/${p.id}`); else submitSearch(); setSearchFocused(false) }}
              isOpen={searchFocused}
              onClose={() => setSearchFocused(false)}
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setLocationOpen(true)} className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-primary-600" aria-label="Change location">
              <MapPin className="h-4 w-4 text-nude-600" />
              <span className="max-w-[84px] truncate">{place}</span>
            </button>
            <button type="button" onClick={askBot} className="hidden items-center gap-1.5 rounded-full bg-primary-800 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-900 sm:flex">
              <Sparkles className="h-4 w-4 text-nude-300" /> Ask EazyBot
            </button>
            <div className="relative">
              <button type="button" onClick={() => setCartOpen((v) => !v)} aria-label={`Cart, ${count} items`} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-800 shadow-soft transition hover:text-primary-800">
                <AnimatedCartIcon />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-nude-600 px-1 text-[11px] font-bold text-white">{count > 99 ? '99+' : count}</span>
                )}
              </button>
              <CartPreview isOpen={cartOpen} onClose={() => setCartOpen(false)} />
            </div>
          </div>
        </div>

        <form onSubmit={submitSearch} className="relative px-4 pb-3 md:hidden">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-[70%] text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search groceries…"
            aria-label="Search groceries"
            className="w-full rounded-full border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>
      </header>

      {/* Mobile / tablet drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-fade-up flex-col bg-cream-50 p-5 shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <img src="/eazy.PNG" alt="eazyfoods" className="h-10 w-36 object-cover mix-blend-multiply" style={{ objectPosition: "center 46%" }} />
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="rounded-full p-2 text-ink-500 hover:bg-ink-50"><X className="h-5 w-5" /></button>
            </div>
            <button type="button" onClick={() => { setMenuOpen(false); askBot() }} className="btn-primary mb-5 w-full"><Sparkles className="h-4 w-4" /> Ask EazyBot</button>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {[{ name: 'Home', href: '/' }, ...NAV, ...MORE].map((n) => (
                <NavLink key={n.href} to={n.href} end={n.href === '/'} className={({ isActive }) => `block rounded-xl px-4 py-3 text-base font-semibold ${isActive ? 'bg-primary-100 text-primary-900' : 'text-ink-700 hover:bg-ink-50'}`}>{n.name}</NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <Breadcrumbs />

      <main className="w-full flex-1">{children}</main>

      <Suspense fallback={<div className="min-h-[96px]" aria-hidden="true" />}>
        <PageBanner placement={placement} defaultContent={driverCta} variant={dealsPage ? 'orange' : 'primary'} size="tall" />
      </Suspense>

      <footer className="bg-ink-900 pb-16 text-ink-200 md:pb-0">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-1">
            <p className="font-display text-2xl font-bold text-white">eazyfoods</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">Authentic African groceries and chef-made meals from local stores and kitchens, delivered to your door.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/groceries">Groceries</Link></li>
              <li><Link className="hover:text-white" to="/meals">Meals &amp; plans</Link></li>
              <li><Link className="hover:text-white" to="/chefs">Chefs</Link></li>
              <li><Link className="hover:text-white" to="/stores">Local markets</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Your orders</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/orders">Order history</Link></li>
              <li><Link className="hover:text-white" to="/profile">Profile &amp; addresses</Link></li>
              <li><Link className="hover:text-white" to="/become-a-driver">Drive with us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Help</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/about">About</Link></li>
              <li><Link className="hover:text-white" to="/contact">Contact us</Link></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@eazyfoods.ca</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-ink-400 sm:flex-row sm:px-6 lg:px-8">
            <p>&copy; {new Date().getFullYear()} eazyfoods. All rights reserved.</p>
            <a href={(import.meta.env.VITE_PORTALS_URL || 'https://portals.eazyfoods.ca').trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary-300 hover:text-primary-200">
              <Package className="h-4 w-4" /> For vendors &amp; partners
            </a>
          </div>
        </div>
      </footer>

      <LocationPicker open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  )
}

export default Layout
