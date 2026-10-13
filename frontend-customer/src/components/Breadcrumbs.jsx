import { Link, useLocation, useSearchParams } from 'react-router-dom'

const LABELS = {
  stores: 'Local markets', groceries: 'Groceries', products: 'Groceries', meals: 'Meals & recipes', 'meal-plans': 'Meal plans',
  cart: 'Cart', checkout: 'Checkout', orders: 'Orders', profile: 'Profile', chefs: 'Chefs',
  'top-market-deals': 'Market deals', 'top-chef-deals': 'Chef deals', about: 'About', contact: 'Contact',
  'become-a-driver': 'Drive with us', 'driver-signup': 'Driver application', 'order-confirmation': 'Order confirmation',
}

const isId = (seg) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg) || /^\d+$/.test(seg)

/** Quiet text trail. Only shown on pages deeper than a top-level section, where it helps people get back. */
const Breadcrumbs = () => {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null // home and top-level pages have their own header

  const search = params.get('search')
  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
        <li><Link to="/" className="hover:text-ink-900">Home</Link></li>
        {segments.map((seg, i) => {
          const last = i === segments.length - 1
          const label = LABELS[seg] || (isId(seg) ? 'Details' : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '))
          const to = seg === 'products' && !last ? '/groceries' : '/' + segments.slice(0, i + 1).join('/')
          return (
            <li key={to} className="flex items-center gap-2">
              <span aria-hidden="true" className="text-ink-300">/</span>
              {last ? <span aria-current="page" className="font-medium text-ink-900">{label}</span> : <Link to={to} className="hover:text-ink-900">{label}</Link>}
            </li>
          )
        })}
        {search && <li className="flex items-center gap-2"><span aria-hidden="true" className="text-ink-300">/</span><span className="font-medium text-ink-900">&ldquo;{search}&rdquo;</span></li>}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
