import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBasket, Utensils, ChefHat, ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'

const ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/groceries', icon: ShoppingBasket, label: 'Shop' },
  { path: '/meals', icon: Utensils, label: 'Meals' },
  { path: '/chefs', icon: ChefHat, label: 'Chefs' },
  { path: '/cart', icon: ShoppingCart, label: 'Cart' },
]

const StickyBottomNav = () => {
  const { pathname } = useLocation()
  const { getCartItemCount } = useCart()
  const count = getCartItemCount()
  const active = (p) => (p === '/' ? pathname === '/' : pathname.startsWith(p))

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {ITEMS.map(({ path, icon: Icon, label }) => (
          <li key={path} className="flex-1">
            <Link to={path} aria-current={active(path) ? 'page' : undefined} className={`relative mx-auto flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${active(path) ? 'text-primary-800' : 'text-ink-400 hover:text-ink-700'}`}>
              <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition ${active(path) ? 'bg-primary-100' : ''}`}>
                <Icon className="h-5 w-5" />
                {path === '/cart' && count > 0 && (
                  <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-nude-700 px-1 text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</span>
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
