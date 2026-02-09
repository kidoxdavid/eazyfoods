import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { Star, MapPin, Clock, ShoppingCart, Heart, Eye, Search, Filter, Grid3x3, List, SlidersHorizontal } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useLocation } from '../contexts/LocationContext'
import QuickViewModal from '../components/QuickViewModal'
import StarRating from '../components/StarRating'
import ProductBadges from '../components/ProductBadges'
import Pagination from '../components/Pagination'
import { ProductGridSkeleton, StoreDetailSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'
import AnimatedHeart from '../components/AnimatedHeart'
import { useToast } from '../contexts/ToastContext'

const StoreDetail = () => {
  const { id } = useParams()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [storeLoading, setStoreLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)
  const [favorites, setFavorites] = useState(new Set())
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalProducts, setTotalProducts] = useState(0)
  const { addToCart } = useCart()
  const { success: showSuccessToast, info: showInfoToast } = useToast()

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites')
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)))
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }
    }
  }, [])

  const toggleFavorite = (productId, productName) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
      showInfoToast(`${productName || 'Product'} removed from favorites`)
    } else {
      newFavorites.add(productId)
      showSuccessToast(`${productName || 'Product'} added to favorites`)
    }
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify(Array.from(newFavorites)))
  }

  // Check if store is currently open based on operating hours
  const isStoreOpen = (operatingHours) => {
    // If no operating hours specified, default to closed (not open)
    if (!operatingHours || typeof operatingHours !== 'object') {
      return false
    }
    
    const now = new Date()
    // Map JavaScript day index (0=Sunday) to full day names used in vendor portal
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const day = dayNames[now.getDay()]
    const hours = operatingHours[day]
    
    // If no hours for this day, store is closed
    if (!hours) {
      return false
    }
    
    // Check if the day is explicitly marked as closed
    if (hours.closed === true) {
      return false
    }
    
    // If no open/close times, store is closed
    if (!hours.open || !hours.close) {
      return false
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [openHour, openMin] = hours.open.split(':').map(Number)
    const [closeHour, closeMin] = hours.close.split(':').map(Number)
    const openTime = openHour * 60 + openMin
    const closeTime = closeHour * 60 + closeMin
    
    return currentTime >= openTime && currentTime <= closeTime
  }

  useEffect(() => {
    fetchStore()
  }, [id])

  useEffect(() => {
    if (store && store.vendor_id) {
      setCurrentPage(1) // Reset to first page when filters change
    }
  }, [store, selectedCategory, searchQuery, sortBy])

  useEffect(() => {
    if (store && store.vendor_id) {
      fetchProducts()
    }
  }, [store, selectedCategory, searchQuery, sortBy, currentPage, itemsPerPage])

  const fetchStore = async () => {
    setStoreLoading(true)
    try {
      const response = await api.get(`/customer/stores/${id}`)
      setStore(response.data)
    } catch (error) {
      console.error('Failed to fetch store:', error)
    } finally {
      setStoreLoading(false)
    }
  }

  const fetchProducts = async () => {
    if (!store || !store.vendor_id) {
      console.log('Store or vendor_id not available yet', { store, vendor_id: store?.vendor_id })
      return
    }
    
    setProductsLoading(true)
    try {
      const params = { 
        vendor_id: store.vendor_id,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      }
      if (selectedCategory) params.category_id = selectedCategory
      if (searchQuery) params.search = searchQuery
      // Don't apply city filter when viewing a specific store - show all their products
      
      console.log('Fetching products for store:', { 
        store_id: id, 
        vendor_id: store.vendor_id, 
        params 
      })
      
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/customer/products', { params }),
        api.get('/customer/categories')
      ])
      
      console.log('Products response:', {
        status: productsRes.status,
        dataType: Array.isArray(productsRes.data) ? 'array' : typeof productsRes.data,
        productsCount: Array.isArray(productsRes.data) 
          ? productsRes.data.length 
          : (productsRes.data?.products?.length || 0),
        fullResponse: productsRes.data
      })
      
      // Handle different response structures
      const productsData = Array.isArray(productsRes.data) 
        ? productsRes.data 
        : (productsRes.data?.products || [])
      const categoriesData = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : (categoriesRes.data?.categories || [])
      
      // Get total count from response
      // If total is not in response, estimate based on whether we got a full page
      const total = productsRes.data?.total || (productsData.length === itemsPerPage ? (currentPage * itemsPerPage) + 1 : productsData.length)
      setTotalProducts(total)
      
      console.log('Processed products:', { count: productsData.length, products: productsData })
      
      // Apply sorting
      let sortedProducts = [...productsData]
      switch (sortBy) {
        case 'newest':
          sortedProducts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          break
        case 'oldest':
          sortedProducts.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
          break
        case 'price_low':
          sortedProducts.sort((a, b) => a.price - b.price)
          break
        case 'price_high':
          sortedProducts.sort((a, b) => b.price - a.price)
          break
        case 'name_asc':
          sortedProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          break
        case 'name_desc':
          sortedProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
          break
        case 'rating':
          sortedProducts.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
          break
        default:
          break
      }
      
      setProducts(sortedProducts)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      console.error('Error details:', error.response?.data || error.message)
      setProducts([])
      setCategories([])
    } finally {
      setProductsLoading(false)
    }
  }

  if (storeLoading || !store) {
    return <StoreDetailSkeleton />
  }

  return (
    <div>
      {/* Store Header - Same height as home page banner (240px) */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden" style={{ height: '240px', minHeight: '240px', maxHeight: '240px' }}>
        <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="flex items-center space-x-4 sm:space-x-6 w-full">
            {store.store_profile_image_url && (
              <img
                src={resolveImageUrl(store.store_profile_image_url)}
                alt={store.business_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
                onError={(e) => {
                  console.error('[StoreDetail] Store image failed to load:', store.store_profile_image_url)
                  e.target.style.display = 'none'
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 truncate">{store.business_name}</h1>
              {store.average_rating && (
                <div className="flex items-center space-x-1 sm:space-x-2 mb-2">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current flex-shrink-0" />
                  <span className="text-sm sm:text-base font-semibold">{store.average_rating.toFixed(1)}</span>
                  <span className="text-xs sm:text-sm text-primary-200">({store.total_reviews} reviews)</span>
                </div>
              )}
              <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-white/90">
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span>{store.street_address}, {store.city}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{isStoreOpen(store.operating_hours) ? 'Open Now' : 'Closed'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {store.delivery_available && (
                  <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white/20 rounded-md backdrop-blur-sm">Delivery</span>
                )}
                {store.pickup_available && (
                  <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white/20 rounded-md backdrop-blur-sm">Pickup</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Groceries Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        {/* Results Count and View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {products.length > 0 ? (
              <span>
                Showing <span className="font-semibold text-gray-900">{products.length}</span> groceries
              </span>
            ) : (
              <span>No groceries found</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
        {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groceries..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

        {/* Filters Row - single row on mobile, wraps on larger screens */}
        <div className="flex items-center gap-3 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0">
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-shrink-0"
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Category Filter */}
            {categories.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
                <Filter className="h-4 w-4 text-gray-600" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* Clear Filters */}
          {(selectedCategory || searchQuery || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setSelectedCategory('')
                  setSearchQuery('')
                  setSortBy('newest')
                }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                type="button"
              >
                Clear All
              </button>
            )}
          </div>

        {/* Quick Category Filters - horizontal scroll on mobile */}
          {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-2 sm:mb-3 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
            <span className="text-xs text-gray-600 font-medium flex-shrink-0 hidden sm:inline">Quick filters:</span>
            <span className="text-xs text-gray-600 font-medium flex-shrink-0 sm:hidden">Quick:</span>
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Advanced Filters</h3>
              <p className="text-sm text-gray-600">Additional filters coming soon...</p>
            </div>
          )}
        </div>

        {/* Groceries Grid */}
        {productsLoading ? (
          <ProductGridSkeleton count={12} />
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No groceries found</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6"
            : "space-y-4"
          }>
            {products.map((product) => {
              // List View
              if (viewMode === 'list') {
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group relative w-full">
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      <Link to={`/products/${product.id}`} className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <Link to={`/products/${product.id}`}>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">
                                  {product.name}
                                </h3>
                              </Link>
                              <div className="mb-2">
                                <StarRating 
                                  rating={product.average_rating} 
                                  totalReviews={product.total_reviews || 0}
                                  size="sm"
                                />
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(product.id, product.name)
                              }}
                              className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all z-20"
                              type="button"
                            >
                              <AnimatedHeart
                                isFavorited={favorites.has(product.id)}
                                size={14}
                              />
                            </button>
                          </div>
                          <div className="mb-2">
                            {(product.promotions && product.promotions.length > 0) || (product.compare_at_price && product.compare_at_price > product.price) ? (
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <p className="text-xl font-bold text-green-600">
                                  ${product.price.toFixed(2)}
                                </p>
                                {product.compare_at_price && product.compare_at_price > product.price && (
                                  <p className="text-sm text-gray-400 line-through">
                                    ${product.compare_at_price.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xl font-bold text-gray-900">
                                ${product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {product.stock_quantity === 0 && (
                            <p className="text-sm text-red-600 font-medium">Out of Stock</p>
                          )}
                          {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                            <p className="text-sm text-orange-600 font-medium">
                              Only {product.stock_quantity} left!
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setQuickViewProduct(product)
                            }}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all flex items-center gap-2"
                            type="button"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">Quick View</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              addToCart(product, 1)
                              showSuccessToast(`${product.name} added to cart!`)
                            }}
                            disabled={product.stock_quantity === 0}
                            className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            type="button"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="text-sm font-medium">Add to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              
              // Grid View
              return (
              <div key={product.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group relative w-full">
                <Link to={`/products/${product.id}`} className="block">
                  <div className="relative aspect-square bg-gray-100 rounded-t-xl overflow-hidden">
                    {product.image_url ? (
                      <>
                        <img
                          src={resolveImageUrl(product.image_url)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            const resolvedUrl = resolveImageUrl(product.image_url)
                            console.error('[StoreDetail] Product image failed to load:', {
                              originalUrl: product.image_url,
                              resolvedUrl: resolvedUrl,
                              fullUrl: window.location.origin + resolvedUrl,
                              productId: product.id,
                              productName: product.name,
                              userAgent: navigator.userAgent,
                              isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                              currentOrigin: window.location.origin
                            })
                            e.target.style.display = 'none'
                            const fallback = e.target.parentElement.querySelector('.image-fallback')
                            if (fallback) {
                              fallback.style.display = 'flex'
                            }
                          }}
                          onLoad={() => {
                            console.log('[StoreDetail] Image loaded successfully:', {
                              productId: product.id,
                              url: resolveImageUrl(product.image_url)
                            })
                          }}
                        />
                        <div className="image-fallback absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 text-[10px] hidden">
                          No Image
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                        No Image
                      </div>
                    )}
                    {/* Product Badges with inline stock level */}
                    <ProductBadges product={product} stockLevelPosition="inline" />
                    {/* Discount Badge - Top Right (aligned with stock level badge) */}
                    {((product.promotions && product.promotions.length > 0) || 
                      (product.compare_at_price && product.compare_at_price > product.price)) && (
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                          {product.promotions && product.promotions.length > 0 && product.promotions[0] ? (
                            product.promotions[0].discount_type === 'percentage' && product.promotions[0].discount_value != null
                              ? `${Math.round(Number(product.promotions[0].discount_value))}% off`
                              : product.promotions[0].discount_type === 'fixed_amount' && product.promotions[0].discount_value != null
                                ? `$${Number(product.promotions[0].discount_value).toFixed(0)} OFF`
                                : 'SALE'
                          ) : (
                            `${Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% off`
                          )}
                        </span>
                      </div>
                    )}
                    {/* Favorite Heart - Bottom Right */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(product.id, product.name)
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all z-20"
                      type="button"
                      title={favorites.has(product.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <AnimatedHeart
                        isFavorited={favorites.has(product.id)}
                        size={14}
                      />
                    </button>
                  </div>
                  <div className="px-1.5 pb-1.5 pt-1">
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 min-h-[2rem] group-hover:text-primary-600 transition-colors leading-tight">
                      {product.name}
                    </h3>
                    <div className="mb-1">
                      {(product.promotions && product.promotions.length > 0) || (product.compare_at_price && product.compare_at_price > product.price) ? (
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <p className="text-base font-bold text-green-600">
                            ${product.price.toFixed(2)}
                          </p>
                          {product.compare_at_price && product.compare_at_price > product.price && (
                            <p className="text-[9px] text-gray-400 line-through">
                              ${product.compare_at_price.toFixed(2)}
                            </p>
                          )}
                          {product.promotions && product.promotions.length > 0 && product.promotions[0] && product.promotions[0].name && (
                            <span className="text-xs text-primary-600 font-semibold bg-primary-50 px-2 py-0.5 rounded">
                              {String(product.promotions[0].name).trim()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-base font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {/* Star Rating */}
                    <div className="mb-1">
                      <StarRating 
                        rating={product.average_rating} 
                        totalReviews={product.total_reviews || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                </Link>
                <div className="px-1.5 pb-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setQuickViewProduct(product)
                      }}
                      className="flex-1 p-1.5 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all group/btn"
                      type="button"
                      title="Quick View"
                    >
                      <Eye className="h-3.5 w-3.5 text-gray-600 group-hover/btn:text-primary-600 mx-auto transition-colors" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        addToCart(product, 1)
                        showSuccessToast(`${product.name} added to cart!`)
                      }}
                      disabled={product.stock_quantity === 0}
                      className="flex-1 p-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-xs font-medium"
                      type="button"
                      title="Add to Cart"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mx-auto" />
                    </button>
                  </div>
                  {product.stock_quantity === 0 && (
                    <p className="text-[10px] text-red-600 font-medium text-center bg-red-50 py-0.5 rounded">Out of Stock</p>
                  )}
                  {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                    <p className="text-[10px] text-orange-600 font-medium text-center bg-orange-50 py-0.5 rounded">
                      Only {product.stock_quantity} left!
                    </p>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* Pagination and Items Per Page */}
        {!productsLoading && products.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalProducts / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  )
}

export default StoreDetail

