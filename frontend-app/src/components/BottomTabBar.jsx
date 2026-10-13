import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, ShoppingCart, ClipboardList, User } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { haptic } from '../services/haptics'

const TABS = [
  { path: '/home',    icon: Home,          label: 'Home' },
  { path: '/shop',    icon: Search,        label: 'Shop' },
  { path: '/cart',    icon: ShoppingCart,  label: 'Cart' },
  { path: '/orders',  icon: ClipboardList, label: 'Orders' },
  { path: '/profile', icon: User,          label: 'Profile' },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cartCount } = useCart()

  const tap = async (path) => {
    await haptic('light')
    navigate(path)
  }

  const activeRoot = '/' + (location.pathname.split('/')[1] || 'home')

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxShadow: '0 -1px 12px rgba(0,0,0,0.08)' }}
    >
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = activeRoot === path || (path === '/home' && location.pathname === '/')
        const isCart = path === '/cart'
        return (
          <button
            key={path}
            onClick={() => tap(path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 press-scale relative ${
              active ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <Icon className={`h-6 w-6 transition-transform ${active ? 'scale-110' : ''}`}
                    strokeWidth={active ? 2.5 : 1.8} />
              {isCart && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-nude-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium leading-none ${active ? 'text-primary-600' : 'text-gray-400'}`}>
              {label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary-600 rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
