import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MapPin, Menu, X, Search, Sparkles, ShoppingBag, ArrowUpRight, ClipboardList } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useLocation as useLocationContext } from '../contexts/LocationContext'
import Breadcrumbs from './Breadcrumbs'
import CartPreview from './CartPreview'
import SearchAutocomplete from './SearchAutocomplete'
import LocationPicker from './LocationPicker'
import PageBanner from './PageBanner'

const NAV = [
  { name: 'Groceries', href: '/groceries' },
  { name: 'Meals & recipes', href: '/meals' },
  { name: 'Chefs', href: '/chefs' },
  { name: 'Local markets', href: '/stores' },
  { name: 'Market deals', href: '/top-market-deals' },
  { name: 'Chef deals', href: '/top-chef-deals' },
]

const MORE = [
  { name: 'Orders', href: '/orders' },
  { name: 'Profile & addresses', href: '/profile' },
  { name: 'Drive with us', href: '/become-a-driver' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const BANNER_PLACEMENTS = {
  '/': 'home_bottom_banner', '/groceries': 'products_bottom_banner', '/stores': 'stores_bottom_banner',
  '/chefs': 'chefs_bottom_banner', '/cart': 'cart_bottom_banner', '/orders': 'orders_bottom_banner',
  '/profile': 'profile_bottom_banner', '/about': 'about_bottom_banner', '/contact': 'contact_bottom_banner',
  '/meals': 'meals_bottom_banner', '/top-market-deals': 'top_market_deals_bottom_banner',
  '/top-chef-deals': 'top_chef_deals_bottom_banner', '/checkout': 'checkout_bottom_banner',
}

const portalsUrl = () => (import.meta.env.VITE_PORTALS_URL || 'https://portals.eazyfoods.ca').trim()

const driverCta = (
  <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col items-start justify-between gap-6 border-y border-paper-300 py-10 sm:flex-row sm:items-center">
      <div>
        <p className="eyebrow mb-2">eazydrive</p>
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink-900">Deliver with eazyfoods</h2>
        <p className="mt-2 max-w-md text-ink-600">Drive on your own schedule and deliver groceries and meals from local African stores and chefs.</p>
      </div>
      <Link to="/become-a-driver" className="btn-primary shrink-0">Apply to drive <ArrowUpRight className="h-4 w-4" /></Link>
    </div>
  </section>
)

const Layout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { getCartItemCount } = useCart()
  const { selectedCity, selectedProvince } = useLocationContext()
  const count = getCartItemCount()
  const place = selectedCity && selectedCity !== 'All' ? selectedCity : selectedProvince || 'All of Canada'

  useEffect(() => { setMenuOpen(false); setCartOpen(false); window.scrollTo(0, 0) }, [location.pathname])

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

  const navClass = ({ isActive }) =>
    `relative whitespace-nowrap py-3 text-[13px] font-medium tracking-wide transition ${isActive ? 'text-ink-900 after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-ink-900' : 'text-ink-600 hover:text-ink-900'}`

  const searchBox = (
    <form onSubmit={submitSearch} className="relative w-full" role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
        placeholder="Search for egusi, plantain, palm oil…"
        aria-label="Search groceries"
        className="w-full rounded-md border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
      />
      <SearchAutocomplete
        query={query}
        onQueryChange={setQuery}
        onSelect={(p) => { if (p) navigate(`/products/${p.id}`); else submitSearch(); setSearchFocused(false) }}
        isOpen={searchFocused}
        onClose={() => setSearchFocused(false)}
      />
    </form>
  )

  return (
    <div className="flex min-h-screen flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Utility bar */}
      <div className="hidden bg-ink-900 text-paper-200 lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-8 text-xs">
          <button type="button" onClick={() => setLocationOpen(true)} className="inline-flex items-center gap-1.5 hover:text-white" aria-label="Change delivery location">
            <MapPin className="h-3.5 w-3.5" /> Delivering to <span className="font-semibold text-white underline decoration-white/40 underline-offset-4">{place}</span>
          </button>
          <nav aria-label="Secondary" className="flex items-center gap-6">
            <a href={portalsUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-white">Sell on eazyfoods</a>
            <Link to="/become-a-driver" className="hover:text-white">Drive with us</Link>
            <Link to="/contact" className="hover:text-white">Help</Link>
          </nav>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-paper-300 bg-paper-100/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-[72px] lg:gap-8 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-2 rounded-md p-2 text-ink-800 hover:bg-ink-100 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>

          <Link to="/" className="flex shrink-0 items-center" aria-label="eazyfoods home">
            <img src="/eazy.PNG" alt="eazyfoods" className="h-10 w-32 object-cover mix-blend-multiply lg:h-11 lg:w-40" style={{ objectPosition: 'center 46%' }} />
          </Link>

          <div className="mx-auto hidden w-full max-w-xl flex-1 md:block">{searchBox}</div>

          <div className="ml-auto flex items-center gap-1 md:ml-0 sm:gap-2">
            <button type="button" onClick={() => setLocationOpen(true)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100 lg:hidden" aria-label="Change delivery location">
              <MapPin className="h-5 w-5 text-nude-600" /><span className="hidden max-w-[88px] truncate sm:inline">{place}</span>
            </button>
            <button type="button" onClick={askBot} className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100 md:inline-flex">
              <Sparkles className="h-4 w-4 text-nude-600" /> Ask EazyBot
            </button>
            <Link to="/orders" className="hidden rounded-md p-2 text-ink-800 hover:bg-ink-100 md:inline-flex" aria-label="Your orders"><ClipboardList className="h-5 w-5" /></Link>
            <div className="relative">
              <button type="button" onClick={() => setCartOpen((v) => !v)} aria-label={`Cart, ${count} items`} aria-expanded={cartOpen} className="relative inline-flex items-center gap-2 rounded-md bg-ink-900 px-3.5 py-2 text-sm font-semibold text-paper-100 transition hover:bg-primary-700">
                <ShoppingBag className="h-[18px] w-[18px]" />
                <span className="tabular-nums">{count}</span>
              </button>
              <CartPreview isOpen={cartOpen} onClose={() => setCartOpen(false)} />
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden">{searchBox}</div>

        <nav aria-label="Primary" className="hidden border-t border-paper-300 lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-8">
            {NAV.map((n) => <NavLink key={n.href} to={n.href} className={navClass}>{n.name}</NavLink>)}
          </div>
        </nav>
      </header>

      {/* Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-fade-up flex-col bg-paper-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-paper-300 px-5 py-4">
              <img src="/eazy.PNG" alt="eazyfoods" className="h-10 w-36 object-cover mix-blend-multiply" style={{ objectPosition: 'center 46%' }} />
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="rounded-md p-2 text-ink-700 hover:bg-ink-100"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-4">
              <p className="eyebrow mb-2">Shop</p>
              <ul className="mb-6">
                {[{ name: 'Home', href: '/' }, ...NAV].map((n) => (
                  <li key={n.href}><NavLink to={n.href} end={n.href === '/'} className={({ isActive }) => `block border-b border-paper-300 py-3 font-display text-xl ${isActive ? 'text-primary-600' : 'text-ink-900'}`}>{n.name}</NavLink></li>
                ))}
              </ul>
              <p className="eyebrow mb-2">Account & help</p>
              <ul>
                {MORE.map((n) => <li key={n.href}><NavLink to={n.href} className="block py-2.5 text-[15px] text-ink-700 hover:text-ink-900">{n.name}</NavLink></li>)}
              </ul>
            </nav>
            <div className="border-t border-paper-300 p-5">
              <button type="button" onClick={() => { setMenuOpen(false); askBot() }} className="btn-primary w-full"><Sparkles className="h-4 w-4" /> Ask EazyBot</button>
            </div>
          </aside>
        </div>
      )}

      <Breadcrumbs />

      <main className="w-full flex-1">{children}</main>

      <PageBanner placement={placement} defaultContent={location.pathname === '/' ? null : driverCta} size="tall" />

      <footer className="mt-20 bg-primary-900 pb-16 text-paper-200 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-display text-4xl font-medium tracking-tight text-white">eazyfoods</p>
              <p className="mt-4 max-w-sm leading-relaxed text-paper-300">Authentic African groceries and chef-made meals from local stores and kitchens, delivered to your door.</p>
              <button type="button" onClick={askBot} className="mt-6 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-sm font-medium text-white hover:border-white"><Sparkles className="h-4 w-4" /> Not sure what to cook? Ask EazyBot</button>
            </div>
            <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
              <div>
                <h4 className="eyebrow mb-4 !text-paper-300">Shop</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link className="hover:text-white" to="/groceries">Groceries</Link></li>
                  <li><Link className="hover:text-white" to="/meals">Meals &amp; recipes</Link></li>
                  <li><Link className="hover:text-white" to="/chefs">Chefs</Link></li>
                  <li><Link className="hover:text-white" to="/stores">Local markets</Link></li>
                  <li><Link className="hover:text-white" to="/top-market-deals">Deals</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="eyebrow mb-4 !text-paper-300">Your account</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link className="hover:text-white" to="/orders">Orders</Link></li>
                  <li><Link className="hover:text-white" to="/profile">Profile &amp; addresses</Link></li>
                  <li><Link className="hover:text-white" to="/cart">Cart</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="eyebrow mb-4 !text-paper-300">Company</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link className="hover:text-white" to="/about">About</Link></li>
                  <li><Link className="hover:text-white" to="/contact">Contact</Link></li>
                  <li><Link className="hover:text-white" to="/become-a-driver">Drive with us</Link></li>
                  <li><a className="hover:text-white" href={portalsUrl()} target="_blank" rel="noopener noreferrer">Sell on eazyfoods</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 text-xs text-paper-300 sm:flex-row sm:items-center">
            <p>&copy; {new Date().getFullYear()} eazyfoods. All rights reserved.</p>
            <p>support@eazyfoods.ca</p>
          </div>
        </div>
      </footer>

      <LocationPicker open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  )
}

export default Layout
