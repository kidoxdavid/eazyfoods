import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ChevronRight, Home, Package, Store, Utensils, ShoppingCart, CreditCard, ListOrdered, User, ChefHat, TrendingUp, Info, Mail, Search, Truck } from 'lucide-react'

const segmentNameMap = {
  'stores': { name: 'Local Markets', icon: Store },
  'groceries': { name: 'Groceries', icon: Package },
  'products': { name: 'Groceries', icon: Package },
  'meals': { name: 'Meals', icon: Utensils },
  'cart': { name: 'Cart', icon: ShoppingCart },
  'checkout': { name: 'Checkout', icon: CreditCard },
  'orders': { name: 'Orders', icon: ListOrdered },
  'profile': { name: 'Profile', icon: User },
  'chefs': { name: 'Chefs', icon: ChefHat },
  'top-market-deals': { name: 'Top Market Deals', icon: TrendingUp },
  'about': { name: 'About', icon: Info },
  'contact': { name: 'Contact Us', icon: Mail },
  'become-a-driver': { name: 'Become a Driver', icon: Truck }
}

const Breadcrumbs = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { pathname } = location

  // Don't show breadcrumbs on home
  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  const searchQuery = searchParams.get('search')
  const categoryId = searchParams.get('category_id')

  const buildPath = (index) => '/' + segments.slice(0, index + 1).join('/')

  return (
    <nav className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 shadow-sm">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        <li>
          <Link 
            to="/" 
            className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 transition-colors font-medium hover:bg-primary-50 px-2 py-1 rounded-md"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </li>
        {segments.map((seg, index) => {
          const isLast = index === segments.length - 1
          // From product detail (/products/123), "Groceries" should link to /groceries, not /products (no route)
          const path = seg === 'products' && !isLast ? '/groceries' : buildPath(index)
          const mapped = segmentNameMap[seg]
          const segmentInfo = mapped || { name: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '), icon: Package }
          const Icon = segmentInfo.icon || Package
          const label = segmentInfo.name || segmentInfo

          return (
            <li key={`${path}-${index}`} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
              {isLast ? (
                <span className="flex items-center gap-1.5 font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs px-2 py-1 bg-gray-100 rounded-md">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </span>
              ) : (
                <Link
                  to={path}
                  className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 hover:underline truncate max-w-[150px] sm:max-w-xs transition-colors hover:bg-primary-50 px-2 py-1 rounded-md"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              )}
            </li>
          )
        })}
        {/* Show search query if present */}
        {searchQuery && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="flex items-center gap-1.5 text-gray-600 truncate max-w-[200px] px-2 py-1 bg-blue-50 rounded-md">
              <Search className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
              <span className="font-medium">"{searchQuery}"</span>
            </span>
          </>
        )}
        {/* Show category if present */}
        {categoryId && !pathname.includes('products') && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="flex items-center gap-1.5 text-gray-600 truncate max-w-[200px] px-2 py-1 bg-green-50 rounded-md">
              <Package className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="font-medium">Category</span>
            </span>
          </>
        )}
      </ol>
    </nav>
  )
}

export default Breadcrumbs


