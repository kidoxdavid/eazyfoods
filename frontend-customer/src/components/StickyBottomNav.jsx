import { Link, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Utensils, ChefHat, ShoppingBag } from 'lucide-react'
import { useCart } from '../contexts/CartContext'

const ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/groceries', icon: LayoutGrid, label: 'Shop' },
  { path: '/meals', icon: Utensils, label: 'Meals' },
  { path: '/chefs', icon: ChefHat, label: 'Chefs' },
  { path: '/cart', icon: ShoppingBag, label: 'Cart' },
]

const StickyBottomNav = () => {
  const { pathname } = useLocation()
  const { getCartItemCount } = useCart()
  const count = getCartItemCount()
  const active = (p) => (p === '/' ? pathname === '/' : pathname.startsWith(p))

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 border-t border-paper-300 bg-paper-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-around">
        {ITEMS.map(({ path, icon: Icon, label }) => (
          <li key={path} className="flex-1">
            <Link to={path} aria-current={active(path) ? 'page' : undefined} className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-medium uppercase tracking-wider transition ${active(path) ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'}`}>
              {active(path) && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[2px] bg-ink-900" />}
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active(path) ? 2.2 : 1.7} />
                {path === '/cart' && count > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-nude-600 px-1 text-[10px] font-semibold text-white">{count > 9 ? '9+' : count}</span>
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default StickyBottomNav
