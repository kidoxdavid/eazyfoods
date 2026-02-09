import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, Eye, Heart, Package, Search, Filter, Grid3x3, List, Sparkles, TrendingUp, Users, SlidersHorizontal } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { useLocation } from '../contexts/LocationContext'
import QuickViewModal from '../components/QuickViewModal'
import Pagination from '../components/Pagination'
import StarRating from '../components/StarRating'
import ProductBadges from '../components/ProductBadges'
import CategoryBadge from '../components/CategoryBadge'
import PageBanner from '../components/PageBanner'
import { ProductGridSkeleton } from '../components/SkeletonLoader'
import { resolveImageUrl } from '../utils/imageUtils'

const Groceries = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [featuredFilter, setFeaturedFilter] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'in_stock', 'out_of_stock'
  const [minRating, setMinRating] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false)

  const { addToCart } = useCart()
  const { selectedCity } = useLocation()
  const { success: showSuccessToast } = useToast()

  useEffect(() => {
    loadFavorites()
    fetchCategories()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, searchQuery, sortBy, featuredFilter, priceMin, priceMax, stockFilter, minRating, itemsPerPage])

  useEffect(() => {
    fetchProducts()
  }, [currentPage, selectedCity, categoryFilter, searchQuery, sortBy, featuredFilter, priceMin, priceMax, stockFilter, minRating, itemsPerPage])

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('favorites')
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)))
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }
    }
  }

  const toggleFavorite = (productId) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify(Array.from(newFavorites)))
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/customer/categories')
      const categoriesData = Array.isArray(response.data) ? response.data : (response.data?.categories || [])
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategories([])
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      }
      
      if (selectedCity && selectedCity !== 'All') {
        params.city = selectedCity
      }
      if (categoryFilter) {
        params.category_id = categoryFilter
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      if (sortBy && sortBy !== 'newest') {
        params.sort_by = sortBy
      }
      if (featuredFilter) {
        params.featured = true
      }
      if (priceMin) {
        params.min_price = parseFloat(priceMin)
      }
      if (priceMax) {
        params.max_price = parseFloat(priceMax)
      }
      if (stockFilter === 'in_stock') {
        params.in_stock = true
      } else if (stockFilter === 'out_of_stock') {
        params.out_of_stock = true
      }
      if (minRating) {
        params.min_rating = parseFloat(minRating)
      }

      const response = await api.get('/customer/products', { params })
      
      // Handle different response structures safely
      const productsData = response.data?.products || response.data || []
      const total = response.data?.total || 0
      
      // Remove duplicates based on product ID to prevent items from appearing on multiple pages
      const uniqueProducts = Array.isArray(productsData) 
        ? productsData.filter((product, index, self) => 
            product && product.id && index === self.findIndex((p) => p && p.id === product.id)
          )
        : []
      
      setProducts(uniqueProducts)
      setTotalProducts(total)
      setTotalPages(Math.ceil(total / itemsPerPage) || 1)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
    }
  }

  const clearAllFilters = () => {
    setCategoryFilter('')
    setSearchQuery('')
    setSortBy('newest')
    setFeaturedFilter(false)
    setPriceMin('')
    setPriceMax('')
    setStockFilter('all')
    setMinRating('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white relative">
        {/* Banner Header - Match final render exactly */}
        <PageBanner
          title="Groceries"
          subtitle="Discover authentic African groceries, spices, and ingredients. Fresh, quality products delivered to your door!"
          placement="products_top_banner"
          defaultContent={
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-4 mb-3">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Groceries
                </h1>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
                Discover authentic African groceries, spices, and ingredients. Fresh, quality products delivered to your door!
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Featured Items</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Top Sellers</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-semibold">Popular Now</span>
                </div>
              </div>
            </div>
          }
        />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
          <ProductGridSkeleton count={20} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Banner Header */}
      <PageBanner
        title="Groceries"
        subtitle="Discover authentic African groceries, spices, and ingredients. Fresh, quality products delivered to your door!"
        placement="products_top_banner"
        defaultContent={
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-4 mb-3">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Groceries
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Discover authentic African groceries, spices, and ingredients. Fresh, quality products delivered to your door!
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Featured Items</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Top Sellers</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Popular Now</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        {/* Results Count and View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {totalProducts > 0 ? (
              <span>
                Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalProducts)}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalProducts}</span> groceries
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                      {cat.name || cat.category_name || 'Unnamed Category'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Featured Filter */}
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm flex-shrink-0">
              <input
                type="checkbox"
                checked={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.checked)}
                className="rounded"
              />
              <span>Featured Only</span>
            </label>

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
          {(categoryFilter || searchQuery || sortBy !== 'newest' || featuredFilter || priceMin || priceMax || stockFilter !== 'all' || minRating) && (
              <button
                onClick={clearAllFilters}
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
                  key={cat.id || cat.category_id}
                  onClick={() => setCategoryFilter(categoryFilter === (cat.id || cat.category_id) ? '' : (cat.id || cat.category_id))}
                className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                    categoryFilter === (cat.id || cat.category_id)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {cat.name || cat.category_name}
                </button>
              ))}
            </div>
          )}

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Advanced Filters</h3>
              
              {/* Price Range */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Min Price ($)</label>
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Max Price ($)</label>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="999.99"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Status</h4>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Items</option>
                  <option value="in_stock">In Stock Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Minimum Rating</h4>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>

              {/* Items Per Page */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Items Per Page</h4>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="12">12 per page</option>
                  <option value="20">20 per page</option>
                  <option value="40">40 per page</option>
                  <option value="60">60 per page</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">No groceries found</h2>
            <p className="text-sm text-gray-600 mb-4">Try adjusting your filters or search terms</p>
            {(categoryFilter || searchQuery || featuredFilter || priceMin || priceMax) && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6"
            : "space-y-4"
          }>
            {products.map((product) => {
              const isFavorite = favorites.has(product.id)
              
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
                        <ProductBadges product={product} />
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
                              <div className="flex items-center gap-2 mb-2">
                                {product.category && (
                                  <CategoryBadge category={product.category} size="sm" />
                                )}
                                {product.vendor?.business_name && (
                                  <p className="text-xs text-gray-500">
                                    {product.vendor.business_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(product.id)
                              }}
                              className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all"
                              type="button"
                              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart 
                                className={`h-5 w-5 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'}`} 
                              />
                            </button>
                          </div>
                          <div className="mb-2">
                            <StarRating 
                              rating={product.average_rating || 0} 
                              totalReviews={product.total_reviews || 0}
                              size="sm"
                            />
                          </div>
                          <div className="mb-3">
                            {((product.promotions && product.promotions.length > 0) || 
                              (product.compare_at_price && product.compare_at_price > product.price)) ? (
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-green-600">
                                  ${product.price.toFixed(2)}
                                </p>
                                {product.compare_at_price && product.compare_at_price > product.price && (
                                  <p className="text-sm text-gray-400 line-through">
                                    ${product.compare_at_price.toFixed(2)}
                                  </p>
                                )}
                                {product.promotions && product.promotions.length > 0 && product.promotions[0]?.name && (
                                  <span className="text-xs text-primary-600 font-semibold bg-primary-50 px-2 py-0.5 rounded">
                                    {String(product.promotions[0].name).trim()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xl font-bold text-gray-900">
                                ${product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setQuickViewProduct(product)
                            }}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all flex items-center gap-2"
                            type="button"
                            title="Quick View"
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
                            title="Add to Cart"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="text-sm">Add to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {product.stock_quantity === 0 && (
                      <div className="px-4 pb-2">
                        <p className="text-xs text-red-600 text-center">Out of Stock</p>
                      </div>
                    )}
                  </div>
                )
              }
              
              // Grid View
              return (
                <div key={product.id} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group relative w-full">
                  <Link to={`/products/${product.id}`}>
                    <div className="relative aspect-square bg-gray-100 rounded-t-xl overflow-hidden">
                      {product.image_url ? (
                        <>
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.parentElement?.querySelector('.image-fallback')
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="image-fallback absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 text-[10px] hidden">
                            No Image
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                          No Image
                        </div>
                      )}
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
                          toggleFavorite(product.id)
                        }}
                        className="absolute bottom-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all z-20"
                        type="button"
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart 
                          className={`h-4 w-4 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'}`} 
                        />
                      </button>
                    </div>
                    <div className="px-1.5 pb-1.5 pt-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 min-h-[2rem] group-hover:text-primary-600 transition-colors leading-tight">
                            {product.name}
                          </h3>
                          {product.category && (
                            <div className="mt-1">
                              <CategoryBadge category={product.category} size="sm" />
                            </div>
                          )}
                        </div>
                        {product.vendor?.business_name && (
                          <p className="text-[9px] text-gray-500 font-medium whitespace-nowrap flex-shrink-0 mt-0.5">
                            {product.vendor.business_name}
                          </p>
                        )}
                      </div>
                      <div className="mb-1">
                        {((product.promotions && product.promotions.length > 0) || 
                          (product.compare_at_price && product.compare_at_price > product.price)) ? (
                          <div className="flex items-baseline gap-1">
                            <p className="text-base font-bold text-green-600">
                              ${product.price.toFixed(2)}
                            </p>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <p className="text-[10px] text-gray-400 line-through">
                                ${product.compare_at_price.toFixed(2)}
                              </p>
                            )}
                            {product.promotions && product.promotions.length > 0 && product.promotions[0]?.name && (
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
                      <div className="px-1.5 mb-1">
                        <StarRating 
                          rating={product.average_rating || 0} 
                          totalReviews={product.total_reviews || 0}
                          size="sm"
                        />
                      </div>
                    </div>
                  </Link>
                  <div className="px-1.5 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setQuickViewProduct(product)
                        }}
                        className="flex-1 p-1.5 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all"
                        type="button"
                        title="Quick View"
                      >
                        <Eye className="h-4 w-4 text-gray-600 mx-auto" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          addToCart(product, 1)
                          showSuccessToast(`${product.name} added to cart!`)
                        }}
                        disabled={product.stock_quantity === 0}
                        className="flex-1 p-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        type="button"
                        title="Add to Cart"
                      >
                        <ShoppingCart className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                  {product.stock_quantity === 0 && (
                    <p className="text-[10px] text-red-600 mt-0.5 text-center">Out of Stock</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        <QuickViewModal
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      </div>
    </div>
  )
}

export default Groceries

