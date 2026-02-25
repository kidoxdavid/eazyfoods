import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, Star, TrendingUp, MapPin, Sparkles, AlertCircle, Eye, Heart, Tag, Calendar, Apple, Fish, Wheat, Beef, Milk, Coffee, Cookie, Cherry, Carrot, UtensilsCrossed, Package, ChefHat, IceCream, Candy, Soup, Drumstick, Grape, Banana, Nut, ShoppingBag, Wine, Flame, Zap, Store } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useLocation } from '../contexts/LocationContext'
import { getCitiesForProvince } from '../constants/canadaLocations'
import { useToast } from '../contexts/ToastContext'
import QuickViewModal from '../components/QuickViewModal'
import AdBanner from '../components/AdBanner'
import PageBanner from '../components/PageBanner'
import StarRating from '../components/StarRating'
import { resolveImageUrl } from '../utils/imageUtils'

const Home = () => {
  const [newProducts, setNewProducts] = useState([])
  const [discountedProducts, setDiscountedProducts] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [nearbyStores, setNearbyStores] = useState([])
  const [promotions, setPromotions] = useState([])
  const [chefs, setChefs] = useState([])
  const [chefDeals, setChefDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToCart } = useCart()
  const { coordinates, selectedCity, selectedProvince } = useLocation()
  const { success: showSuccessToast } = useToast()
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [favorites, setFavorites] = useState(new Set())

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
    if (hours.closed === true || hours.closed === 'true') {
      return false
    }
    
    // If no open/close times, store is closed
    if (!hours.open || !hours.close) {
      return false
    }
    
    try {
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const [openHour, openMin] = hours.open.split(':').map(Number)
      const [closeHour, closeMin] = hours.close.split(':').map(Number)
      const openTime = openHour * 60 + openMin
      const closeTime = closeHour * 60 + closeMin
      
      return currentTime >= openTime && currentTime <= closeTime
    } catch (error) {
      console.error('Error parsing operating hours:', error, hours)
      return false
    }
  }

  // Get next opening time for a closed store
  const getNextOpeningTime = (operatingHours) => {
    if (!operatingHours || typeof operatingHours !== 'object') {
      return null
    }
    
    const now = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    // Check today first (if store opens later today)
    const todayHours = operatingHours[dayNames[currentDay]]
    if (todayHours && !todayHours.closed && todayHours.open) {
      const [openHour, openMin] = todayHours.open.split(':').map(Number)
      const openTimeMinutes = openHour * 60 + openMin
      if (currentTime < openTimeMinutes) {
        return `Opens ${todayHours.open}`
      }
    }
    
    // Check next 7 days
    for (let i = 1; i < 7; i++) {
      const checkDay = (currentDay + i) % 7
      const dayName = dayNames[checkDay]
      const hours = operatingHours[dayName]
      
      if (hours && !hours.closed && hours.open) {
        if (i === 1) {
          return `Opens ${hours.open} tomorrow`
        } else {
          const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1)
          return `Opens ${hours.open} ${dayLabel}`
        }
      }
    }
    
    return null
  }

  useEffect(() => {
    fetchData()
  }, [coordinates, selectedCity, selectedProvince])

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log('Fetching data...', { 
        hasCoordinates: !!(coordinates && coordinates.lat && coordinates.lng),
        apiBaseURL: localStorage.getItem('API_BASE_URL') || '/api/v1'
      })
      
      // When province is selected and "All cities" is chosen, restrict to province's cities (don't show whole Canada)
      const provinceCities = selectedProvince && selectedCity === 'All' ? getCitiesForProvince(selectedProvince) : null
      const effectiveCity = selectedProvince && selectedCity === 'All' ? null : selectedCity

      // Build product params with city filter
      const productParams = {}
      if (effectiveCity && effectiveCity.trim() !== '' && effectiveCity.trim().toLowerCase() !== 'all') {
        productParams.city = effectiveCity.trim()
      }

      // Build store params: when "All" (and no province) don't pass city; when province+All cities we fetch all then filter by province
      const storeParams = {}
      if (effectiveCity && effectiveCity !== 'All') {
        storeParams.city = effectiveCity
        if (coordinates && coordinates.lat && coordinates.lng) {
          storeParams.latitude = coordinates.lat
          storeParams.longitude = coordinates.lng
          storeParams.radius_km = 50
        }
      }
      
      console.log('Home: Fetching with params:', { 
        selectedCity, 
        productParams, 
        storeParams,
        hasCoordinates: !!(coordinates && coordinates.lat && coordinates.lng)
      })
      
      const allProductsParams = { ...productParams, limit: 100 }
      console.log('Making all products API call with params:', allProductsParams)
      
      const [
        newRes,
        discountedRes,
        lowStockRes,
        allProductsRes,
        categoriesRes,
        storesRes,
        promotionsRes,
        chefsRes,
        recipesRes,
        chefDealsRes
      ] = await Promise.all([
        api.get('/customer/products', { params: { ...productParams, new_arrivals: true, limit: 20 } }),
        api.get('/customer/products', { params: { ...productParams, discounted: true, limit: 20 } }),
        api.get('/customer/products', { params: { ...productParams, low_stock: true, limit: 20 } }),
        api.get('/customer/products', { params: allProductsParams }),
        api.get('/customer/categories', { params: effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {} }),
        Object.keys(storeParams).length > 0
          ? api.get('/customer/stores/', { params: storeParams })
          : api.get('/customer/stores/'),
        api.get('/customer/promotions', { params: { limit: 10, ...(effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {}) } }),
        api.get('/customer/chefs', { params: { limit: 5, ...(effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {}) } }),
        api.get('/customer/recipes/', { params: { limit: 5 } }),
        api.get('/customer/chef-cuisines-deals', { params: { limit: 20, ...(effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {}) } }).catch(() => ({ data: { cuisines: [] } }))
      ])
      
      console.log('API responses received:', {
        newRes: newRes.status,
        discountedRes: discountedRes.status,
        lowStockRes: lowStockRes.status,
        allProductsRes: allProductsRes.status,
        categoriesRes: categoriesRes.status,
        storesRes: storesRes.status,
        newResData: newRes.data,
        discountedResData: discountedRes.data,
        lowStockResData: lowStockRes.data,
        allProductsResData: allProductsRes.data
      })
      
      // Handle different response structures
      const newProductsData = Array.isArray(newRes.data) ? newRes.data : (newRes.data?.products || [])
      const discountedProductsData = Array.isArray(discountedRes.data) ? discountedRes.data : (discountedRes.data?.products || [])
      const lowStockProductsData = Array.isArray(lowStockRes.data) ? lowStockRes.data : (lowStockRes.data?.products || [])
      
      // For all products, the API returns { products: [...], total: ..., ... }
      let allProductsData = []
      if (Array.isArray(allProductsRes.data)) {
        allProductsData = allProductsRes.data
      } else if (allProductsRes.data?.products) {
        allProductsData = allProductsRes.data.products
      } else if (allProductsRes.data && typeof allProductsRes.data === 'object') {
        // Try to find products array in the response
        console.warn('Unexpected allProducts response structure:', allProductsRes.data)
        allProductsData = []
      }
      
      console.log('Extracted allProductsData:', {
        count: allProductsData.length,
        isArray: Array.isArray(allProductsData),
        sample: allProductsData.slice(0, 2)
      })
      
      console.log('Processed products data:', {
        selectedCity,
        newProductsCount: newProductsData.length,
        discountedProductsCount: discountedProductsData.length,
        lowStockProductsCount: lowStockProductsData.length,
        allProductsCount: allProductsData.length,
        newProductsDataStructure: Array.isArray(newRes.data) ? 'array' : (newRes.data?.products ? 'object.products' : 'other'),
        allProductsDataStructure: Array.isArray(allProductsRes.data) ? 'array' : (allProductsRes.data?.products ? 'object.products' : 'other'),
        newProductsSample: newProductsData.slice(0, 2),
        allProductsSample: allProductsData.slice(0, 2)
      })
      
      const categoriesData = Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data?.categories || categoriesRes.data || [])
      let storesData = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
      const promotionsData = Array.isArray(promotionsRes.data) ? promotionsRes.data : []
      let chefsData = Array.isArray(chefsRes.data) ? chefsRes.data : (chefsRes.data?.chefs || chefsRes.data || [])
      const chefDealsData = Array.isArray(chefDealsRes?.data?.cuisines) ? chefDealsRes.data.cuisines : (chefDealsRes?.data?.cuisines || [])

      // When province is set and "All cities" chosen, filter to stores in that province only (so empty province stays empty)
      if (provinceCities && provinceCities.length > 0) {
        const provinceCitySet = new Set(provinceCities.map(c => c.trim().toLowerCase()))
        storesData = storesData.filter(s => s && s.city && provinceCitySet.has(String(s.city).trim().toLowerCase()))
        const storeIdsInProvince = new Set(storesData.map(s => s.id))
        if (storeIdsInProvince.size === 0) {
          setNewProducts([])
          setDiscountedProducts([])
          setLowStockProducts([])
          setAllProducts([])
          setCategories([])
          setNearbyStores([])
          setPromotions([])
          setChefs([])
          setLoading(false)
          return
        }
        // Filter products/categories/promotions/chefs to only those in province stores (products by store_id; others by city or store)
        const filterProductsByStore = (list) => list.filter(p => p && storeIdsInProvince.has(p.store_id))
        allProductsData = filterProductsByStore(allProductsData)
        const newProductsDataFiltered = filterProductsByStore(newProductsData)
        const discountedProductsDataFiltered = filterProductsByStore(discountedProductsData)
        const lowStockProductsDataFiltered = filterProductsByStore(lowStockProductsData)
        // Categories: only those that appear in filtered products
        const categoryIdsInProducts = new Set(allProductsData.map(p => p.category_id).filter(Boolean).map(String))
        const categoriesDataFiltered = categoriesData.filter(c => categoryIdsInProducts.has(String(c.id)))
        const promotionsFiltered = promotionsData.filter(p => !p.store_id || storeIdsInProvince.has(p.store_id))
        const chefsFiltered = chefsData.filter(c => !c.store_id || storeIdsInProvince.has(c.store_id))
        setNewProducts(newProductsDataFiltered)
        setDiscountedProducts(discountedProductsDataFiltered)
        setLowStockProducts(lowStockProductsDataFiltered)
        setAllProducts(allProductsData)
        setCategories(categoriesDataFiltered)
        setNearbyStores(storesData)
        setPromotions(promotionsFiltered)
        setChefs(chefsFiltered)
        setChefDeals(chefDealsData)
        setLoading(false)
        return
      }

      // When a specific city is selected and that city has no stores, show empty everywhere
      if (selectedCity && selectedCity.trim() !== '' && selectedCity.trim().toLowerCase() !== 'all' && storesData.length === 0) {
        setNewProducts([])
        setDiscountedProducts([])
        setLowStockProducts([])
        setAllProducts([])
        setCategories([])
        setNearbyStores([])
        setPromotions([])
        setChefs([])
        setChefDeals([])
      } else {
        // When "All": only show categories that have products in our data
        let categoriesToShow = categoriesData
        if (selectedCity === 'All' || !selectedCity || selectedCity.trim().toLowerCase() === 'all') {
          const categoryIdsInProducts = new Set(allProductsData.map(p => p.category_id).filter(Boolean).map(String))
          categoriesToShow = categoriesData.filter(c => categoryIdsInProducts.has(String(c.id)))
        }

        setNewProducts(newProductsData)
        setDiscountedProducts(discountedProductsData)
        setLowStockProducts(lowStockProductsData)
        setAllProducts(allProductsData)
        setCategories(categoriesToShow)
        setNearbyStores(storesData)
        setPromotions(promotionsData)
        setChefs(chefsData)
        setChefDeals(chefDealsData)
      }
      
      // Debug: Log what we got
      const allCarouselProducts = [
        ...newProductsData.map(p => ({ ...p, badge: 'NEW', type: 'new' })),
        ...discountedProductsData.map(p => ({ ...p, badge: null, type: 'discounted' })),
        ...lowStockProductsData.map(p => ({ ...p, badge: null, type: 'low_stock' }))
      ]
      console.log('Home: Fetched data:', {
        selectedCity,
        new: newProductsData.length,
        discounted: discountedProductsData.length,
        lowStock: lowStockProductsData.length,
        totalCarouselProducts: allCarouselProducts.length,
        categories: categoriesData.length,
        stores: storesData.length,
        newProducts: newProductsData.map(p => ({ id: p.id, name: p.name, vendor: p.vendor?.business_name, created_at: p.created_at })),
        discountedProducts: discountedProductsData.map(p => ({ id: p.id, name: p.name, vendor: p.vendor?.business_name })),
        storesDetails: storesData.map(s => ({ id: s.id, name: s.business_name, city: s.city }))
      })
    } catch (error) {
      console.error('Failed to fetch data:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
        isNetworkError: error.code === 'ERR_NETWORK' || error.message === 'Network Error',
        isTimeout: error.code === 'ECONNABORTED'
      })
      
      // Show user-friendly error message for network issues
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        console.error('Network Error: Backend may not be running or proxy not configured correctly')
        console.error('Please check:')
        console.error('1. Is the backend server running on http://localhost:8000?')
        console.error('2. Is the Vite dev server proxy configured correctly?')
        console.error('3. Check browser console Network tab for failed requests')
      }
      
      // Set empty arrays on error so page still renders
      setNewProducts([])
      setDiscountedProducts([])
      setLowStockProducts([])
      setAllProducts([])
      setCategories([])
      setNearbyStores([])
    } finally {
      setLoading(false)
    }
  }

  const handleSetAddress = () => {
    updateAddress({ address: addressInput }, { lat: 40.7128, lng: -74.0060 })
    setShowAddressModal(false)
    setAddressInput('')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          {/* Banner skeleton */}
          <div className="h-48 bg-gray-200 rounded-lg mb-6" />
          
          {/* Carousel skeletons */}
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg aspect-square" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative animate-fadeIn" style={{ display: 'block', width: '100%' }}>
      {/* Hero Section - same PageBanner as other pages for consistent load (no flash) */}
      <PageBanner
        title="Welcome to eazyfoods"
        subtitle="Authentic African Groceries Delivered to Your Doorstep"
        placement="home_top_banner"
        defaultContent={
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Welcome to eazyfoods</h1>
            <p className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 text-white/90">Authentic African Groceries Delivered to Your Doorstep</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <Link to="/stores" className="inline-block bg-white text-primary-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-nude-100 hover:scale-105 active:scale-100 transition-all duration-200 text-xs sm:text-sm">Browse Stores</Link>
              <Link to="/groceries" className="inline-block bg-[#ff6b35] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-[#e55a2b] hover:scale-105 active:scale-100 transition-all duration-200 text-xs sm:text-sm border border-white/30">Shop All Groceries</Link>
            </div>
          </div>
        }
      />

      {/* Combined Groceries Carousel - Auto-scrolling (All groceries for selected location) */}
      <AutoScrollCarousel
        products={(() => {
          console.log('Building carousel products:', {
            allProductsCount: allProducts.length,
            newProductsCount: newProducts.length,
            discountedProductsCount: discountedProducts.length,
            lowStockProductsCount: lowStockProducts.length,
            selectedCity,
            allProductsSample: allProducts.slice(0, 2)
          })
          
          // Use allProducts state variable (which is set from allProductsData in fetchData)
          const productsToUse = allProducts
          
          // Create a map to track products we've already added (to avoid duplicates)
          const productMap = new Map()
          
          // First, add all products from the "all products" query
          productsToUse.forEach(p => {
            if (p && p.id) {
              if (!productMap.has(p.id)) {
                productMap.set(p.id, { ...p, badge: null, type: 'all' })
              }
            }
          })
          
          // Then, add new products with NEW badge (overwrite if already in map)
          newProducts.forEach(p => {
            if (p && p.id) {
              productMap.set(p.id, { ...p, badge: 'NEW', type: 'new' })
            }
          })
          
          // Then, add discounted products with discount badges (overwrite if already in map)
          discountedProducts.forEach(p => {
            if (p && p.id) {
              let badge = null
              if (p.promotions && p.promotions.length > 0 && p.promotions[0]) {
                badge = p.promotions[0].discount_type === 'percentage' && p.promotions[0].discount_value != null
                  ? `${Math.round(Number(p.promotions[0].discount_value))}% OFF`
                  : p.promotions[0].discount_type === 'fixed_amount' && p.promotions[0].discount_value != null
                    ? `$${Number(p.promotions[0].discount_value).toFixed(0)} OFF`
                    : 'SALE'
              } else if (p.compare_at_price && p.compare_at_price > p.price) {
                const discount = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
                badge = `${discount}% OFF`
              }
              productMap.set(p.id, { ...p, badge, type: 'discounted' })
            }
          })
          
          // Then, add low stock products with low stock badge (overwrite if already in map)
          lowStockProducts.forEach(p => {
            if (p && p.id) {
              const badge = p.stock_quantity <= 10 && p.stock_quantity > 0 
                ? `Only ${p.stock_quantity} left!` 
                : null
              // Only set badge if product wasn't already marked as new or discounted
              const existing = productMap.get(p.id)
              if (!existing || (!existing.badge && badge)) {
                productMap.set(p.id, { ...p, badge: existing?.badge || badge, type: existing?.type || 'low_stock' })
              }
            }
          })
          
          const finalProducts = Array.from(productMap.values())
          
          // Filter to only show products with active promotions (exclude out-of-stock items)
          const productsWithPromotions = finalProducts.filter(p => {
            // Exclude out-of-stock items
            if (p.stock_quantity === 0) {
              return false
            }
            // Check if product has active promotions
            if (p.promotions && p.promotions.length > 0) {
              return true
            }
            // Also include products with compare_at_price discount
            if (p.compare_at_price && p.compare_at_price > p.price) {
              return true
            }
            return false
          })
          
          // Chef promo items for carousel (cuisines with active chef promotions)
          const chefDealItems = (chefDeals || []).map(c => ({
            id: `chef_${c.id}`,
            type: 'chef_promo',
            name: c.name,
            image_url: c.image_url,
            chef_id: c.chef_id,
            chef_name: c.chef_name,
            price: c.price,
            discounted_price: c.discounted_price,
            badge: c.promotions?.[0]?.discount_display || (c.discounted_price != null ? `${Math.round(((c.price - c.discounted_price) / c.price) * 100)}% OFF` : null),
            promotions: c.promotions
          }))
          
          const combined = [...productsWithPromotions, ...chefDealItems]
          console.log('Final carousel (market + chef deals):', { market: productsWithPromotions.length, chef: chefDealItems.length, total: combined.length })
          return combined
        })()}
        onQuickView={setQuickViewProduct}
        onAddToCart={addToCart}
        onShowToast={showSuccessToast}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Redesigned Grid: Shop by Category, Shop by Region, Special Offers, and Nearby Stores */}
      <section className="py-4 sm:py-6 bg-white w-full relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-transparent to-orange-50/20 pointer-events-none"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-100/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-full px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Shop by Category - First Column */}
            <div className="w-full">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-10 bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-600 rounded-full shadow-lg"></div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Browse Categories
                  </h2>
                </div>
              </div>
              {categories.length > 0 ? (
                <div className={`${categories.length > 5 ? 'overflow-y-auto max-h-[420px] scrollbar-hide' : 'space-y-3'}`}>
                  <div className="space-y-3">
                  {categories.map((category) => {
                    // Solid colored boxes + white outline icons per category
                    const getCategoryStyle = (categoryName) => {
                      const name = (categoryName?.toLowerCase() || '') + (category.slug?.toLowerCase() || '')
                      if (name.includes('fruit') || name.includes('produce')) return { Icon: Apple, bg: 'bg-red-500' }
                      if (name.includes('meat') || name.includes('protein') || name.includes('chicken') || name.includes('beef') || name.includes('poultry')) return { Icon: Drumstick, bg: 'bg-rose-500' }
                      if (name.includes('fish') || name.includes('seafood')) return { Icon: Fish, bg: 'bg-blue-500' }
                      if (name.includes('dairy') || name.includes('milk') || name.includes('cheese')) return { Icon: Milk, bg: 'bg-cyan-500' }
                      if (name.includes('grain') || name.includes('rice') || name.includes('flour') || name.includes('wheat') || name.includes('cereal')) return { Icon: Wheat, bg: 'bg-amber-500' }
                      if (name.includes('beverage') || name.includes('drink') || name.includes('juice') || name.includes('coffee') || name.includes('tea') || name.includes('soda')) return { Icon: Wine, bg: 'bg-emerald-500' }
                      if (name.includes('snack') || name.includes('cookie') || name.includes('cracker') || name.includes('chips') || name.includes('nuts')) return { Icon: Candy, bg: 'bg-pink-500' }
                      if (name.includes('spice') || name.includes('seasoning') || name.includes('herb') || name.includes('pepper')) return { Icon: Flame, bg: 'bg-orange-500' }
                      if (name.includes('vegetable') || name.includes('veggie')) return { Icon: Carrot, bg: 'bg-orange-500' }
                      if (name.includes('meal') || name.includes('food') || name.includes('dish') || name.includes('prepared')) return { Icon: ChefHat, bg: 'bg-purple-500' }
                      if (name.includes('frozen') || name.includes('ice')) return { Icon: IceCream, bg: 'bg-sky-500' }
                      if (name.includes('bakery') || name.includes('bread')) return { Icon: Cookie, bg: 'bg-yellow-500' }
                      return { Icon: ShoppingBag, bg: 'bg-gray-500' }
                    }
                    const { Icon: CategoryIcon, bg } = getCategoryStyle(category.name)
                    const useEmoji = category.image_url && !category.image_url.startsWith('http')
                    
                    return (
                      <Link
                        key={category.id}
                        to={`/groceries?category_id=${category.id}`}
                        className="group flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 gap-4 h-20"
                      >
                        <div className={`flex-shrink-0 w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                          {useEmoji ? (
                            <span className="text-2xl" aria-hidden>{category.image_url}</span>
                          ) : (
                            <CategoryIcon className="h-6 w-6 text-white" strokeWidth={2} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{category.description}</p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-gray-400 group-hover:text-emerald-500 transition-colors">→</span>
                      </Link>
                    )
                  })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">African categories coming soon — we're organizing authentic flavors for you! 🌍</p>
              )}
            </div>

            {/* Shop by Region - Middle Column */}
            <div className="w-full">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-10 bg-gradient-to-b from-amber-500 via-orange-500 to-red-500 rounded-full shadow-lg"></div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Regional Flavors
                  </h2>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { 
                    region: 'West African', 
                    flags: ['🇳🇬', '🇬🇭', '🇸🇳', '🇨🇮', '🇧🇯', '🇹🇬'],
                    gradient: 'from-yellow-400 via-green-500 to-yellow-400',
                    bgGradient: 'from-yellow-50 via-green-50 to-yellow-50',
                    icon: '🥘',
                    description: 'Jollof, Fufu & More'
                  },
                  { 
                    region: 'East African', 
                    flags: ['🇰🇪', '🇹🇿', '🇺🇬', '🇪🇹', '🇷🇼', '🇧🇮'],
                    gradient: 'from-red-500 via-black-600 to-green-500',
                    bgGradient: 'from-red-50 via-gray-50 to-green-50',
                    icon: '🏔️',
                    description: 'Injera, Nyama & Spices'
                  },
                  { 
                    region: 'North African', 
                    flags: ['🇪🇬', '🇲🇦', '🇹🇳', '🇩🇿', '🇱🇾', '🇸🇩'],
                    gradient: 'from-red-600 via-white-500 to-black-600',
                    bgGradient: 'from-red-50 via-white to-gray-50',
                    icon: '🌵',
                    description: 'Couscous, Tagines & More'
                  },
                  { 
                    region: 'Central African', 
                    flags: ['🇨🇲', '🇨🇩', '🇨🇬', '🇹🇩', '🇨🇫', '🇬🇶'],
                    gradient: 'from-yellow-500 via-red-500 to-green-500',
                    bgGradient: 'from-yellow-50 via-red-50 to-green-50',
                    icon: '🌳',
                    description: 'Plantains, Cassava & More'
                  },
                  { 
                    region: 'South African', 
                    flags: ['🇿🇦', '🇿🇼', '🇧🇼', '🇳🇦', '🇲🇿', '🇲🇼'],
                    gradient: 'from-green-500 via-yellow-400 to-blue-500',
                    bgGradient: 'from-green-50 via-yellow-50 to-blue-50',
                    icon: '🦁',
                    description: 'Braai, Bobotie & More'
                  }
                ]
                .filter(item => nearbyStores.some(s => s.region === item.region))
                .map((item, index) => (
                  <Link
                    key={item.region}
                    to={`/stores?region=${encodeURIComponent(item.region)}${selectedCity && selectedCity !== 'All' ? `&city=${encodeURIComponent(selectedCity)}` : ''}`}
                    className="group relative flex items-center overflow-hidden rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 bg-white h-20"
                  >
                    {/* Subtle background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.bgGradient} opacity-30 group-hover:opacity-50 transition-opacity duration-300`}></div>
                    
                    {/* Content container */}
                    <div className="relative p-4 flex items-center gap-3 w-full">
                      {/* Flags showcase - simplified */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-12 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm flex items-center justify-center p-1.5 group-hover:shadow-md transition-all duration-300">
                          <div className="grid grid-cols-3 gap-1 w-full h-full">
                            {item.flags.slice(0, 6).map((flag, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-center text-lg leading-none"
                              >
                                {flag}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Region info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                            {item.region}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{item.description}</p>
                      </div>
                      
                      {/* Icon and arrow */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">
                          {item.icon}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          <span className="text-amber-600 text-sm">→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Promotions - Third Column */}
            <div className="w-full">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 bg-gradient-to-b from-orange-500 via-red-500 to-pink-500 rounded-full shadow-lg"></div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Special Offers
                    </h2>
                  </div>
                  <Link
                    to="/top-market-deals"
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
                  >
                    View All →
                  </Link>
                </div>
              </div>
              {promotions.length > 0 ? (
                <div className={`${promotions.length > 5 ? 'overflow-y-auto max-h-[420px] scrollbar-hide' : 'space-y-3'}`}>
                  <div className="space-y-3">
                  {promotions.slice(0, 5).map((promo) => {
                    const isChef = promo.source === 'chef'
                    const offerLink = isChef ? '/top-chef-deals' : '/top-market-deals'
                    return (
                      <Link
                        key={promo.id}
                        to={offerLink}
                        className="group relative flex items-center p-4 bg-white rounded-xl border border-orange-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300 overflow-hidden h-20"
                      >
                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 group-hover:from-orange-100/70 group-hover:via-white group-hover:to-orange-100/50 transition-all duration-300"></div>
                        
                        <div className="relative z-10 flex items-center gap-3 w-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">{promo.name}</h3>
                              <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded flex-shrink-0 ${isChef ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isChef ? 'Chef' : 'Vendor'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{promo.description || 'Special offer available'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {promo.discount_display && (
                              <span className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-lg shadow-md">
                                {promo.discount_display}
                              </span>
                            )}
                            {promo.end_date && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>Ends {new Date(promo.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No active promotions at the moment</p>
              )}
            </div>

            {/* Nearby Stores - Last Column */}
            <div className="w-full">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-lg"></div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Local Markets
                    </h2>
                  </div>
                  <Link
                    to="/stores"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    View All →
                  </Link>
                </div>
              </div>
              {nearbyStores.length > 0 ? (
                <div className={`${nearbyStores.length > 5 ? 'overflow-y-auto max-h-[420px] scrollbar-hide' : 'space-y-3'}`}>
                  <div className="space-y-3">
                  {nearbyStores.slice(0, 5).map((store) => (
                    <Link
                      key={store.id}
                      to={`/stores/${store.id}`}
                      className="group relative flex items-center p-4 bg-white rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 overflow-hidden h-20"
                    >
                      {/* Gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 group-hover:from-blue-100/70 group-hover:via-white group-hover:to-indigo-100/50 transition-all duration-300"></div>
                      
                      <div className="relative z-10 flex items-center gap-3 w-full">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                          {(store.store_profile_image_url || store.store_banner_image_url) ? (
                            <img
                              src={resolveImageUrl(store.store_profile_image_url || store.store_banner_image_url)}
                              alt={store.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{store.business_name}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex-shrink-0 shadow-sm ${
                              isStoreOpen(store.operating_hours)
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                            }`}>
                              {isStoreOpen(store.operating_hours) ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-shrink">
                              {store.average_rating && (
                                <div className="flex items-center space-x-0.5">
                                  <Star className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                                  <span className="text-xs font-semibold text-gray-900">{store.average_rating.toFixed(1)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <p className="text-xs text-gray-600 truncate">{store.city}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
                              {!isStoreOpen(store.operating_hours) && getNextOpeningTime(store.operating_hours) && (
                                <p className="text-xs text-blue-600 font-medium text-right">{getNextOpeningTime(store.operating_hours)}</p>
                              )}
                              {store.distance_km && (
                                <p className="text-xs text-blue-600 font-semibold">{store.distance_km} km</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No African stores nearby yet — but we're expanding to serve you! 🏪</p>
              )}
            </div>

            {/* Chefs - Fifth Column */}
            <div className="w-full">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 bg-gradient-to-b from-amber-500 via-orange-500 to-rose-500 rounded-full shadow-lg"></div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Chefs
                    </h2>
                  </div>
                  <Link
                    to="/chefs"
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
                  >
                    View All →
                  </Link>
                </div>
              </div>
              {chefs.length > 0 ? (
                <div className={`${chefs.length > 5 ? 'overflow-y-auto max-h-[420px] scrollbar-hide' : 'space-y-3'}`}>
                  <div className="space-y-3">
                  {chefs.slice(0, 5).map((chef) => (
                    <Link
                      key={chef.id}
                      to={`/chefs/${chef.id}`}
                      className="group relative flex items-center p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 overflow-hidden min-h-[5rem]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-white to-rose-50/30 group-hover:from-amber-100/70 group-hover:via-white group-hover:to-rose-100/50 transition-all duration-300"></div>
                      <div className="relative z-10 flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center">
                            {chef.profile_image_url ? (
                              <img src={resolveImageUrl(chef.profile_image_url)} alt={chef.chef_name} className="w-full h-full object-cover" />
                            ) : (
                              <ChefHat className="h-6 w-6 text-amber-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-amber-600 transition-colors">{chef.chef_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {chef.average_rating > 0 && (
                                <div className="flex items-center space-x-0.5">
                                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                  <span className="text-xs font-semibold text-gray-900">{chef.average_rating.toFixed(1)}</span>
                                </div>
                              )}
                              {chef.city && (
                                <span className="flex items-center gap-0.5 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  {chef.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {chef.cuisines?.length > 0 && (
                          <div className="flex-shrink-0 flex flex-col items-end gap-1 max-w-[45%]">
                            {(Array.isArray(chef.cuisines) ? chef.cuisines : [chef.cuisines]).slice(0, 3).map((c) => (
                              <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 group-hover:bg-amber-200 group-hover:border-amber-300 transition-colors">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No chefs available yet — check back soon! 👨‍🍳</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - compact */}
      <section className="py-6 sm:py-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">Why Choose eazyfoods?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/80 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 hover:-translate-y-0.5 transition-all duration-200 animate-slideIn" style={{ animationDelay: '0ms' }}>
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">Fresh Groceries</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-snug">Freshest African groceries from trusted suppliers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/80 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 hover:-translate-y-0.5 transition-all duration-200 animate-slideIn" style={{ animationDelay: '80ms' }}>
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">Fast Delivery</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-snug">Quick, reliable delivery to your doorstep.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/80 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 hover:-translate-y-0.5 transition-all duration-200 animate-slideIn" style={{ animationDelay: '160ms' }}>
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">Quality Guaranteed</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-snug">Quality guaranteed or your money back.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  )
}

// Auto-scrolling carousel component
const AutoScrollCarousel = ({ products, onQuickView, onAddToCart, onShowToast, favorites = new Set(), onToggleFavorite = () => {} }) => {
  const scrollRef = useRef(null)
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false)
  const isHoveringRef = useRef(false)

  // Remove duplicates based on product/card ID (products and chef deals have unique ids)
  const uniqueProducts = products.filter((product, index, self) =>
    index === self.findIndex((p) => p.id === product.id)
  )
  const isChefDeal = (item) => item.type === 'chef_promo' || item.chef_id

  // Duplicate products for seamless loop
  const duplicatedProducts = [...uniqueProducts, ...uniqueProducts]

  useEffect(() => {
    if (!scrollRef.current || uniqueProducts.length === 0) return
    if (isPausedRef.current) return // Don't start animation if paused

    const scrollContainer = scrollRef.current
    let scrollPosition = scrollContainer.scrollLeft || 0
    const scrollSpeed = 0.5 // pixels per frame (slower = smoother)
    const maxScroll = scrollContainer.scrollWidth / 2 // Since we duplicated
    let animationId = null

    const scroll = () => {
      // Check pause state using ref (always current value)
      if (isPausedRef.current) {
        return // Stop animation when paused
      }
      
      scrollPosition += scrollSpeed
      
      // Reset to beginning when we've scrolled through half (the duplicated section)
      if (scrollPosition >= maxScroll) {
        scrollPosition = 0
      }
      
      scrollContainer.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(scroll)
    }

    animationId = requestAnimationFrame(scroll)
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isPaused, uniqueProducts.length])

  // Handle wheel scrolling when hovering - must use addEventListener for passive: false
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleWheel = (e) => {
      // Check if mouse is actually over the carousel using coordinates
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX
      const mouseY = e.clientY
      const isOverCarousel = (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
      )

      // Only handle wheel events when mouse is over the carousel
      if (!isOverCarousel) {
        return // Allow normal page scrolling when not hovering
      }
      
      // Prevent default scrolling behavior and convert to horizontal scroll
      e.preventDefault()
      e.stopPropagation()
      const scrollAmount = e.deltaY
      container.scrollLeft += scrollAmount
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handleMouseEnter = (e) => {
    console.log('Mouse ENTERED carousel area - pausing')
    isHoveringRef.current = true
    isPausedRef.current = true
    setIsPaused(true)
  }

  const handleMouseLeave = (e) => {
    console.log('Mouse LEFT carousel area - resuming')
    isHoveringRef.current = false
    isPausedRef.current = false
    setIsPaused(false)
  }

  // Helper function to get discount badge
  const getDiscountBadge = (product) => {
    // Check for promotions first
    if (product.promotions && product.promotions.length > 0 && product.promotions[0]) {
      const promo = product.promotions[0]
      if (promo.discount_type === 'percentage' && promo.discount_value != null) {
        return `${Math.round(Number(promo.discount_value))}% off`
      } else if (promo.discount_type === 'fixed_amount' && promo.discount_value != null) {
        return `$${Number(promo.discount_value).toFixed(0)} OFF`
      }
    }
    // Check for compare_at_price discount
    if (product.compare_at_price && product.compare_at_price > product.price) {
      const discount = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      return `${discount}% off`
    }
    return null
  }

  // Always show the section, even if no products
  console.log('AutoScrollCarousel render:', { 
    productsLength: products.length, 
    uniqueProductsLength: uniqueProducts.length,
    duplicatedProductsLength: duplicatedProducts.length 
  })
  
  return (
    <section className="pt-1 sm:pt-2 pb-3 sm:pb-4 bg-gradient-to-b from-gray-50 to-white w-full" style={{ display: 'block' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="relative flex items-center gap-2 sm:gap-3 md:gap-4 group">
            {/* Large, prominent lightning bolt – smaller on mobile */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 rounded-full blur-xl sm:blur-2xl opacity-50 group-hover:opacity-70 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full blur-md sm:blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 p-1.5 sm:p-2.5 md:p-3 rounded-full shadow-2xl transform group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-300">
                <Zap className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 text-white fill-white drop-shadow-2xl animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-ping"></div>
              <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <div className="relative">
              <Link to="/top-market-deals" className="relative flex items-center gap-2 sm:gap-2.5 md:gap-3 group cursor-pointer">
                <div className="w-0.5 h-7 sm:h-10 md:h-12 bg-gradient-to-b from-yellow-400 via-orange-500 to-yellow-400 rounded-full shadow-sm"></div>
                <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-yellow-600 via-orange-500 via-yellow-500 to-orange-600 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-yellow-600 transition-all duration-200">
                    Top Market Deals
                  </span>
                </span>
                <div className="ml-auto opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-500 fill-orange-500" />
                </div>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <span>Scroll to explore</span>
              <span className="animate-pulse">→</span>
            </div>
            <div className="relative flex items-center gap-2 sm:gap-3 md:gap-4 group">
              {/* Large fork & knife icon – smaller on mobile, same style as Top Market Deals */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 rounded-full blur-xl sm:blur-2xl opacity-50 group-hover:opacity-70 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-full blur-md sm:blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-1.5 sm:p-2.5 md:p-3 rounded-full shadow-2xl transform group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-300">
                  <UtensilsCrossed className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 text-white fill-white drop-shadow-2xl animate-pulse" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-3 sm:h-3 bg-amber-300 rounded-full animate-ping"></div>
                <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <div className="relative">
                <Link to="/top-chef-deals" className="relative flex items-center gap-2 sm:gap-2.5 md:gap-3 group cursor-pointer">
                  <div className="w-0.5 h-7 sm:h-10 md:h-12 bg-gradient-to-b from-amber-400 via-orange-500 to-amber-400 rounded-full shadow-sm"></div>
                  <span className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold leading-tight bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-amber-600 transition-all duration-200">
                    Top Chef Deals
                  </span>
                  <div className="ml-auto opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">
                    <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-amber-500 fill-amber-500" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {uniqueProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No flash sales right now — but fresh African deals are coming! ⚡</p>
            <p className="text-xs text-gray-400 mt-2">Check back soon for amazing discounts on authentic African products</p>
          </div>
        ) : (
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative' }}
          >
            <div 
              ref={scrollRef}
              className="flex space-x-4 sm:space-x-6 overflow-x-auto scrollbar-hide pb-4 w-full"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                overflowY: 'hidden',
                display: 'flex'
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => {
                isPausedRef.current = true
                setIsPaused(true)
              }}
              onTouchEnd={() => {
                isPausedRef.current = false
                setIsPaused(false)
              }}
            >
          {duplicatedProducts.map((product, index) => {
            const isChef = isChefDeal(product)
            if (isChef) {
              const badge = product.badge || (product.promotions?.[0]?.discount_display)
              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex-shrink-0 w-32 sm:w-40 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group relative"
                >
                  <Link to={product.chef_id ? `/chefs/${product.chef_id}` : '/top-chef-deals'} className="block">
                    <div className="relative aspect-[4/3] bg-gray-100 rounded-t-xl overflow-hidden mb-0.5">
                      {product.image_url ? (
                        <img
                          src={resolveImageUrl(product.image_url, 'recipe')}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UtensilsCrossed className="h-8 w-8" />
                        </div>
                      )}
                      {badge && (
                        <div className="absolute top-0.5 left-0.5 z-10">
                          <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow-lg">
                            {badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-1 pt-0.5 pb-0.5">
                      <h3 className="text-xs font-bold text-gray-900 mb-0.5 line-clamp-2 min-h-[1rem] group-hover:text-primary-600 transition-colors">
                        {product.name}
                      </h3>
                      {product.chef_name && (
                        <p className="text-[8px] text-gray-500 mb-0.5 truncate">{product.chef_name}</p>
                      )}
                      <div className="mb-0.5">
                        {product.discounted_price != null && product.discounted_price < product.price ? (
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xs font-bold text-green-600">${Number(product.discounted_price).toFixed(2)}</span>
                            <span className="text-[10px] text-gray-500 line-through">${Number(product.price).toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-900">${Number(product.price || 0).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            }
            const discountBadge = getDiscountBadge(product)
            const hasDiscount = discountBadge !== null
            const isNew = product.is_newly_stocked
            
            return (
              <div
                key={`${product.id}-${index}`}
                className="flex-shrink-0 w-32 sm:w-40 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group relative"
              >
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleFavorite(product.id)
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all z-20"
                  type="button"
                  title={favorites.has(product.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart 
                    className={`h-3 w-3 transition-all ${favorites.has(product.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-600'}`} 
                  />
                </button>

                <Link to={`/products/${product.id}`} className="block">
                  {/* Image Container with Gradient Overlay */}
                  <div className="relative aspect-[4/3] bg-gray-100 rounded-t-xl overflow-hidden mb-0.5">
                    {product.image_url ? (
                      <>
                        <img
                          src={resolveImageUrl(product.image_url)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            console.error('[Carousel] Image failed to load:', {
                              originalUrl: product.image_url,
                              resolvedUrl: resolveImageUrl(product.image_url),
                              productId: product.id,
                              productName: product.name
                            })
                            // Hide the broken image and show fallback
                            e.target.style.display = 'none'
                            const fallback = e.target.parentElement.querySelector('.image-fallback')
                            if (fallback) {
                              fallback.style.display = 'flex'
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="image-fallback w-full h-full flex items-center justify-center text-gray-400 text-[8px] hidden">
                          No Image
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-[8px]">
                        No Image
                      </div>
                    )}
                    
                    {/* Badges - Top Left */}
                    <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5 z-10">
                      {/* NEW Badge - Takes priority */}
                      {isNew && (
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow-lg animate-pulse">
                          NEW
                        </span>
                      )}
                      {/* Discount Badge */}
                      {!isNew && discountBadge && (
                        <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow-lg">
                          {discountBadge.includes('%') && !discountBadge.includes('off') ? `${discountBadge} off` : discountBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="px-1 pt-0.5 pb-0.5">
                    <h3 className="text-xs font-bold text-gray-900 mb-0.5 line-clamp-2 min-h-[1rem] group-hover:text-primary-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    {product.vendor?.business_name && (
                      <p className="text-[8px] text-gray-500 mb-0.5 truncate">{product.vendor.business_name}</p>
                    )}
                    
                    {/* Price Section */}
                    <div className="mb-0.5">
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-0.5 flex-wrap">
                          <p className="text-xs font-bold text-green-600">
                            ${product.price.toFixed(2)}
                          </p>
                          {product.compare_at_price && product.compare_at_price > product.price && (
                            <p className="text-[9px] text-gray-400 line-through">
                              ${product.compare_at_price.toFixed(2)}
                            </p>
                          )}
                          {/* Promotion Name */}
                          {product.promotions && product.promotions.length > 0 && product.promotions[0]?.name && (
                            <span className="text-[9px] text-orange-600 font-semibold bg-orange-50 px-0.5 py-0.5 rounded">
                              {String(product.promotions[0].name).trim()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Star Rating */}
                    <div className="mb-0.5">
                      <StarRating 
                        rating={product.average_rating} 
                        totalReviews={product.total_reviews || 0}
                        size="sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 mb-0.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onQuickView(product)
                        }}
                        className="flex-1 p-1 border border-gray-200 rounded hover:border-primary-300 hover:bg-primary-50 transition-all group/btn"
                        type="button"
                        title="Quick View"
                      >
                        <Eye className="h-2.5 w-2.5 text-gray-600 group-hover/btn:text-primary-600 mx-auto transition-colors" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onAddToCart(product, 1)
                          if (onShowToast) {
                            onShowToast(`${product.name} added to cart!`)
                          }
                        }}
                        disabled={product.stock_quantity === 0}
                        className="flex-1 p-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        type="button"
                        title="Add to Cart"
                      >
                        <ShoppingCart className="h-2.5 w-2.5 mx-auto" />
                      </button>
                    </div>

                    {/* Stock Status */}
                    {product.stock_quantity === 0 && (
                      <p className="text-[8px] text-red-600 font-medium text-center bg-red-50 py-0.5 rounded">Out of Stock</p>
                    )}
                    {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                      <p className="text-[8px] text-orange-600 font-medium text-center bg-orange-50 py-0.5 rounded">
                        Only {product.stock_quantity} left!
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            )
          })}
          </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Home
