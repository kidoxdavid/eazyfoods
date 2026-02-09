import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Package, Utensils, ChefHat, Zap } from 'lucide-react'

const StickyBottomNav = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/groceries', icon: Package, label: 'Groceries' },
    { path: '/top-market-deals', icon: Zap, label: 'Deals' },
    { path: '/meals', icon: Utensils, label: 'Meals' },
    { path: '/chefs', icon: ChefHat, label: 'Chefs' },
    { path: '/cart', icon: ShoppingBag, label: 'Cart' }
  ]

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors flex-1 ${
                active
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default StickyBottomNav

