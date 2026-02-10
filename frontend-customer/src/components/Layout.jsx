import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { ShoppingCart, User, LogOut, Search, Home, Store, Package, ShoppingBag, Settings, Menu, X, Utensils, MapPin, Info, Mail, Zap, ChefHat, Truck, DollarSign, Clock, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import Breadcrumbs from './Breadcrumbs'
import PageBanner from './PageBanner'
import { useLocation as useLocationContext } from '../contexts/LocationContext'
import AnimatedCartIcon from './AnimatedCartIcon'
import CartPreview from './CartPreview'
import SearchAutocomplete from './SearchAutocomplete'

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Default to closed, opens only when hamburger is clicked
  const [searchQuery, setSearchQuery] = useState('')
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  
  // Access contexts without destructuring to prevent errors
  const authContext = useAuth()
  const cartContext = useCart()
  const locationContext = useLocationContext()
  
  // Extract values safely
  const user = (authContext && authContext.user) ? authContext.user : null
  const logout = (authContext && authContext.logout) ? authContext.logout : (() => {})
  const token = (authContext && authContext.token) ? authContext.token : null
  const getCartItemCount = (cartContext && cartContext.getCartItemCount) ? cartContext.getCartItemCount : (() => 0)
  const deliveryAddress = (locationContext && locationContext.deliveryAddress) ? locationContext.deliveryAddress : null
  const updateAddress = (locationContext && locationContext.updateAddress) ? locationContext.updateAddress : (() => {})
  const selectedCity = (locationContext && locationContext.selectedCity) ? locationContext.selectedCity : 'All'
  const updateCity = (locationContext && locationContext.updateCity) ? locationContext.updateCity : (() => {})
  
  const availableLocations = ['All', 'Calgary', 'Edmonton', 'Red Deer']
  
  // Initialize city from context (which reads from localStorage)
  useEffect(() => {
    if (!selectedCity || selectedCity === '') {
      updateCity('All') // Default to 'All' to show all stores/products
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery) {
      navigate(`/groceries?search=${encodeURIComponent(trimmedQuery)}`)
    } else {
      navigate('/groceries')
    }
  }
  
  // Handle real-time search as user types (debounced)
  useEffect(() => {
    // Only trigger search if we're on the groceries page or navigating to it
    if (location.pathname === '/groceries' || searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        const trimmedQuery = searchQuery.trim()
        const currentSearch = new URLSearchParams(location.search).get('search') || ''
        
        // Only navigate if the search query has actually changed
        if (trimmedQuery !== currentSearch) {
          const newParams = new URLSearchParams(location.search)
          if (trimmedQuery) {
            newParams.set('search', trimmedQuery)
          } else {
            newParams.delete('search')
          }
          navigate(`/groceries?${newParams.toString()}`, { replace: true })
        }
      }, 500) // 500ms debounce delay
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, location.pathname])
  
  // Also handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e)
    }
  }
  
  // Sync search query with URL params when on groceries page
  useEffect(() => {
    if (location.pathname === '/groceries') {
      const searchParam = new URLSearchParams(location.search).get('search') || ''
      if (searchParam !== searchQuery) {
        setSearchQuery(searchParam)
      }
    } else if (location.pathname !== '/groceries' && searchQuery) {
      // Clear search when navigating away from groceries page
      setSearchQuery('')
    }
  }, [location])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navigationLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Top Market Deals', href: '/top-market-deals', icon: Zap },
    { name: 'Local Markets', href: '/stores', icon: Store },
    { name: 'Groceries', href: '/groceries', icon: Package },
    { name: 'Meals', href: '/meals', icon: Utensils },
    { name: 'Chefs', href: '/chefs', icon: ChefHat },
    { name: 'Cart', href: '/cart', icon: ShoppingCart },
    { name: 'Become a Driver', href: '/become-a-driver', icon: Truck },
    { name: 'About', href: '/about', icon: Info },
    { name: 'Contact Us', href: '/contact', icon: Mail },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    ...(token ? [{ name: 'Profile', href: '/profile', icon: Settings }] : [])
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar Overlay - Shows on all screen sizes when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Can be toggled on all screen sizes */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[60] w-72 bg-gradient-to-b from-primary-50 to-white shadow-2xl transform transition-transform duration-300 ease-in-out flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-1 h-20 bg-white border-b border-gray-200">
            <Link to="/" className="flex items-center w-full h-full" onClick={() => setSidebarOpen(false)}>
              <img 
                src="/eazy.PNG" 
                alt="EAZY Foods" 
                className="h-[65%] w-[65%] object-cover mx-auto"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-600 hover:text-gray-800 transition-colors z-10"
              type="button"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto bg-white">
            {navigationLinks.map((link, index) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href || 
                (link.href !== '/' && location.pathname.startsWith(link.href))
              // Alternate between two nude shades for visual distinction
              const isEven = index % 2 === 0
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg transform scale-105'
                      : isEven
                        ? 'text-gray-700 hover:bg-gradient-to-r hover:from-nude-100 hover:to-nude-200 hover:shadow-md bg-nude-50/50'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-nude-100 hover:to-nude-200 hover:shadow-md bg-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <span className="font-medium">{link.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          {token && (
            <div className="p-4 border-t border-primary-200 bg-gradient-to-b from-white to-primary-50">
              <div className="flex items-center space-x-3 mb-3 p-3 bg-gradient-to-r from-primary-100 to-white rounded-xl shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                type="button"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden">
        {/* Header - Enhanced Sticky Header */}
        <header className="shadow-lg sticky top-0 z-50 w-full backdrop-blur-sm bg-opacity-95" style={{ backgroundColor: '#ff6b35' }}>
          <div className="w-full px-2 sm:px-4 lg:px-8">
            {/* Mobile Layout - Stacked */}
            <div className="md:hidden">
              {/* Top Row: Menu, Search, Cart */}
              <div className="flex items-center py-1.5 gap-2">
                {/* Hamburger Menu */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-white hover:text-gray-100 transition-colors flex-shrink-0 z-10"
                  type="button"
                  aria-label="Toggle menu"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {/* Search Bar - Takes remaining space */}
                <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        if (location.pathname !== '/groceries') {
                          navigate('/groceries')
                        }
                      }}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                      onKeyPress={handleSearchKeyPress}
                      placeholder="Search for groceries..."
                      className="w-full pl-8 pr-8 py-1.5 border border-white/30 bg-white/90 rounded-lg focus:ring-2 focus:ring-white focus:border-white focus:bg-white text-gray-900 placeholder-gray-500 text-sm"
                    />
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <SearchAutocomplete
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    onSelect={(product) => {
                      if (product) {
                        navigate(`/products/${product.id}`)
                      } else {
                        handleSearch()
                      }
                      setSearchFocused(false)
                    }}
                    isOpen={searchFocused}
                    onClose={() => setSearchFocused(false)}
                  />
                </form>

                {/* Right Icons */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all"
                    type="button"
                    aria-label="Change location"
                  >
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                    <span className="text-sm font-medium truncate max-w-[60px] sm:max-w-[80px]">{selectedCity || 'All'}</span>
                  </button>
                  {token ? (
                    <>
                      <div className="relative">
                        <button
                          onClick={() => setCartPreviewOpen(!cartPreviewOpen)}
                          className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all"
                          type="button"
                        >
                          <AnimatedCartIcon />
                        </button>
                        <CartPreview
                          isOpen={cartPreviewOpen}
                          onClose={() => setCartPreviewOpen(false)}
                        />
                      </div>
                      <Link
                        to="/profile"
                        className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all flex items-center justify-center"
                      >
                        <User className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <button
                          onClick={() => setCartPreviewOpen(!cartPreviewOpen)}
                          className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all"
                          type="button"
                        >
                          <AnimatedCartIcon />
                        </button>
                        <CartPreview
                          isOpen={cartPreviewOpen}
                          onClose={() => setCartPreviewOpen(false)}
                        />
                      </div>
                      <Link
                        to="/login"
                        className="px-3 py-2 text-sm font-medium text-white hover:bg-white/25 rounded-full transition-all"
                      >
                        Login
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-center py-1.5 gap-4">
              {/* Hamburger Menu - Left */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-white hover:text-gray-100 transition-colors flex-shrink-0"
                type="button"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              {/* Search Bar - Centered */}
              <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 relative">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (location.pathname !== '/groceries') {
                        navigate('/groceries')
                      }
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="Search for products..."
                    className="w-full pl-10 pr-20 py-2 border border-white/30 bg-white/90 rounded-lg focus:ring-2 focus:ring-white focus:border-white focus:bg-white text-gray-900 placeholder-gray-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary-600 hover:text-primary-700 font-medium text-sm px-2 py-1"
                  >
                    Search
                  </button>
                </div>
                <SearchAutocomplete
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  onSelect={(product) => {
                    if (product) {
                      navigate(`/products/${product.id}`)
                    } else {
                      handleSearch()
                    }
                    setSearchFocused(false)
                  }}
                  isOpen={searchFocused}
                  onClose={() => setSearchFocused(false)}
                />
              </form>

              {/* Right Menu - Location, Cart, User */}
              <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                {/* Location Selector */}
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all min-w-0"
                  type="button"
                >
                  <MapPin className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium truncate max-w-[90px]">{selectedCity || 'All'}</span>
                  <span className="text-sm font-medium underline decoration-white/70 underline-offset-2">Change</span>
                </button>

                {token ? (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => setCartPreviewOpen(!cartPreviewOpen)}
                        className="p-3 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all flex-shrink-0"
                        type="button"
                      >
                        <AnimatedCartIcon />
                      </button>
                      <CartPreview
                        isOpen={cartPreviewOpen}
                        onClose={() => setCartPreviewOpen(false)}
                      />
                    </div>
                    <div className="relative group flex-shrink-0">
                      <button className="p-3 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all flex items-center justify-center" type="button">
                        <User className="h-5 w-5" />
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                        <Link
                          to="/profile"
                          className="block px-4 py-3 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                          type="button"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => setCartPreviewOpen(!cartPreviewOpen)}
                        className="p-3 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all flex-shrink-0"
                        type="button"
                      >
                        <AnimatedCartIcon />
                      </button>
                      <CartPreview
                        isOpen={cartPreviewOpen}
                        onClose={() => setCartPreviewOpen(false)}
                      />
                    </div>
                    <Link
                      to="/login"
                      className="px-4 py-2.5 text-sm font-medium text-white hover:bg-white/25 rounded-full transition-all"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="px-4 py-2.5 text-sm font-medium bg-white text-primary-600 rounded-full hover:bg-gray-100 transition-all shadow-sm"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-4 py-4 space-y-4">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="Search for products..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </form>
                {token && (
                  <div className="space-y-2">
                    <Link
                      to="/cart"
                      className="block px-4 py-2 text-gray-700 hover:bg-nude-100 rounded-lg"
                    >
                      Cart ({getCartItemCount()})
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-4 py-2 text-gray-700 hover:bg-nude-100 rounded-lg"
                    >
                      Orders
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-gray-700 hover:bg-nude-100 rounded-lg"
                    >
                      Profile
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Main Content */}
        <main className="flex-1 w-full">{children}</main>

        {/* Bottom Banner - Shows ads when available, else Driver Signup default */}
        {(() => {
          const pathToPlacement = {
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
            '/checkout': 'checkout_bottom_banner'
          }
          const placement = pathToPlacement[location.pathname] || (location.pathname.startsWith('/products') ? 'products_bottom_banner' : 'home_bottom_banner')
          const driverSignupContent = (
            <div className="relative max-w-7xl mx-auto w-full">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-xl" />
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                        <Truck className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">Become a Delivery Driver</h3>
                      <p className="text-sm sm:text-base text-white/90">Earn money on your own schedule</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 mt-4">
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">Flexible Earnings</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">Work Your Hours</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">Quick Signup</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href="http://localhost:3004"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary-600 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="relative z-10">Get Started</span>
                    <ArrowRight className="h-5 w-5 relative z-10 transform group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          )
          return (
            <PageBanner
              placement={placement}
              defaultContent={driverSignupContent}
              variant="primary"
              size="tall"
            />
          )
        })()}

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-12">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-primary-600">eazyfoods</h3>
                <p className="text-gray-400">
                  Your trusted source for authentic African groceries
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Shop</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link to="/groceries" className="hover:text-white">All Groceries</Link></li>
                  <li><Link to="/groceries?featured=true" className="hover:text-white">Featured</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Account</h4>
                <ul className="space-y-2 text-gray-400">
                  {token ? (
                    <>
                      <li><Link to="/orders" className="hover:text-white">Orders</Link></li>
                      <li><Link to="/profile" className="hover:text-white">Profile</Link></li>
                    </>
                  ) : (
                    <>
                      <li><Link to="/login" className="hover:text-white">Login</Link></li>
                      <li><Link to="/signup" className="hover:text-white">Sign Up</Link></li>
                    </>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>support@eazyfoods.com</li>
                  <li>1-800-EAZYFOOD</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-gray-400 text-sm">
              <p>&copy; 2024 eazyfoods. All rights reserved.</p>
              <a
                href={(import.meta.env.VITE_PORTALS_URL || 'http://localhost:3001').trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-400 transition-colors underline"
              >
                For vendors & partners – Portals
              </a>
            </div>
          </div>
        </footer>

        {/* Location Selection Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowLocationModal(false)}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Select Your Location</h2>
              <div className="space-y-2">
                {availableLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      updateCity(loc)
                      if (loc !== 'All') {
                        updateAddress({ address: loc }, { lat: 0, lng: 0 })
                      }
                      setShowLocationModal(false)
                      // Reload the page to apply city filter
                      window.location.reload()
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedCity === loc
                        ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                    type="button"
                  >
                    {loc}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Layout

