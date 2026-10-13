import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, Sparkles, Search } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useLocation } from '../contexts/LocationContext'
import { getCitiesForProvince } from '../constants/canadaLocations'
import Pagination from '../components/Pagination'
import PageBanner from '../components/PageBanner'
import ProductCard from '../components/ProductCard'

const Groceries = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filters
  const [urlParams] = useSearchParams()
  const [categoryFilter, setCategoryFilter] = useState(urlParams.get('category') || '')
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '')
  const [sortBy, setSortBy] = useState('newest')
  const [featuredFilter, setFeaturedFilter] = useState(urlParams.get('featured') === 'true')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'in_stock', 'out_of_stock'
  const [minRating, setMinRating] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Header search and deep links (?search=, ?category=, ?featured=) update the filters
  useEffect(() => {
    setSearchQuery(urlParams.get('search') || '')
    setCategoryFilter(urlParams.get('category') || '')
    setFeaturedFilter(urlParams.get('featured') === 'true')
  }, [urlParams])

  const { addToCart } = useCart()
  const { selectedCity, selectedProvince } = useLocation()
  const provinceCities = selectedProvince && selectedCity === 'All' ? getCitiesForProvince(selectedProvince) : null
  const effectiveCity = selectedProvince && selectedCity === 'All' ? null : selectedCity

  useEffect(() => {
    fetchCategories()
  }, [selectedCity, selectedProvince])

  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, searchQuery, sortBy, featuredFilter, priceMin, priceMax, stockFilter, minRating, itemsPerPage])

  useEffect(() => {
    fetchProducts()
  }, [currentPage, selectedCity, selectedProvince, categoryFilter, searchQuery, sortBy, featuredFilter, priceMin, priceMax, stockFilter, minRating, itemsPerPage])

  const fetchCategories = async () => {
    try {
      if (effectiveCity && effectiveCity !== 'All') {
        const storesRes = await api.get('/customer/stores/', { params: { city: effectiveCity } })
        const storesList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
        if (storesList.length === 0) {
          setCategories([])
          return
        }
      }
      if (provinceCities && provinceCities.length > 0) {
        const storesRes = await api.get('/customer/stores/')
        const allStores = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
        const provinceCitySet = new Set(provinceCities.map(c => c.trim().toLowerCase()))
        const inProvince = allStores.filter(s => s && s.city && provinceCitySet.has(String(s.city).trim().toLowerCase()))
        if (inProvince.length === 0) {
          setCategories([])
          return
        }
      }
      const params = effectiveCity && effectiveCity !== 'All' ? { city: effectiveCity } : {}
      const response = await api.get('/customer/categories', { params })
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
      if (effectiveCity && effectiveCity !== 'All') {
        const storesRes = await api.get('/customer/stores/', { params: { city: effectiveCity } })
        const storesList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
        if (storesList.length === 0) {
          setProducts([])
          setTotalProducts(0)
          setTotalPages(1)
          setCategories([])
          setLoading(false)
          return
        }
      }
      let provinceStoreIds = null
      if (provinceCities && provinceCities.length > 0) {
        const storesRes = await api.get('/customer/stores/')
        const allStores = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || storesRes.data || [])
        const provinceCitySet = new Set(provinceCities.map(c => c.trim().toLowerCase()))
        provinceStoreIds = new Set(allStores.filter(s => s && s.city && provinceCitySet.has(String(s.city).trim().toLowerCase())).map(s => s.id))
        if (provinceStoreIds.size === 0) {
          setProducts([])
          setTotalProducts(0)
          setTotalPages(1)
          setLoading(false)
          return
        }
      }

      const params = {
        skip: provinceStoreIds ? 0 : (currentPage - 1) * itemsPerPage,
        limit: provinceStoreIds ? 2000 : itemsPerPage
      }
      
      if (effectiveCity && effectiveCity !== 'All') {
        params.city = effectiveCity
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
      
      let productsData = response.data?.products || response.data || []
      let total = response.data?.total || 0
      
      if (provinceStoreIds && provinceStoreIds.size > 0) {
        productsData = Array.isArray(productsData) ? productsData.filter(p => p && provinceStoreIds.has(p.store_id)) : []
        total = productsData.length
        const start = (currentPage - 1) * itemsPerPage
        productsData = productsData.slice(start, start + itemsPerPage)
      }
      
      // Remove duplicates based on product ID
      const uniqueProducts = Array.isArray(productsData) 
        ? productsData.filter((product, index, self) => 
            product && product.id && index === self.findIndex((p) => p && p.id === product.id)
          )
        : []
      
      setProducts(uniqueProducts)
      setTotalProducts(provinceStoreIds ? total : (response.data?.total || total))
      setTotalPages(Math.ceil((provinceStoreIds ? total : (response.data?.total || total)) / itemsPerPage) || 1)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
    }
  }

  // Smart Basket AI state
  const [smartOpen, setSmartOpen] = useState(false)
  const [smartQuery, setSmartQuery] = useState('')
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartProducts, setSmartProducts] = useState([])
  const [smartResponse, setSmartResponse] = useState('')
  const [smartDone, setSmartDone] = useState(false)

  const SMART_DISHES = ['Jollof Rice 🍚', 'Egusi Soup 🥘', 'Puff Puff 🍩', 'Jerk Chicken 🍗', 'Suya 🍢', 'Pounded Yam 🫙']

  const handleSmartBasket = async (query) => {
    const q = (query || smartQuery).trim()
    if (!q) return
    setSmartQuery(q)
    setSmartLoading(true)
    setSmartProducts([])
    setSmartResponse('')
    setSmartDone(false)
    try {
      const res = await api.post('/ai/chat', {
        message: `I want to buy grocery ingredients to cook ${q}. What should I buy?`,
        conversation_history: [],
      })
      setSmartProducts(res.data.products || [])
      setSmartResponse(res.data.response || '')
      setSmartDone(true)
    } catch { setSmartResponse('Could not reach AI right now. Try again.'); setSmartDone(true) }
    setSmartLoading(false)
  }

  const handleAddAllSmart = async () => {
    for (const p of smartProducts) {
      try { await addToCart({ ...p, quantity: 1 }) } catch (e) { console.error('Could not add to cart:', p.name, e) }
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

  const activeCategory = categories.find((c) => String(c.id || c.category_id) === String(categoryFilter))
  const activeCount = [categoryFilter, featuredFilter, priceMin, priceMax, stockFilter !== 'all', minRating].filter(Boolean).length
  const title = searchQuery ? `Results for “${searchQuery}”` : activeCategory ? (activeCategory.name || activeCategory.category_name) : 'Groceries'
  const hasFilters = activeCount > 0 || searchQuery

  const selectCls = 'input !py-2 !text-sm'

  const filters = (
    <div className="space-y-8">
      <div>
        <h2 className="label !mb-3 font-sans">Category</h2>
        <ul className="space-y-0.5">
          <li><button type="button" onClick={() => setCategoryFilter('')} className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${!categoryFilter ? 'bg-ink-900 font-semibold text-paper-100' : 'text-ink-700 hover:bg-ink-100'}`}>All groceries</button></li>
          {categories.map((c) => {
            const id = c.id || c.category_id
            const on = String(categoryFilter) === String(id)
            return <li key={id}><button type="button" onClick={() => setCategoryFilter(on ? '' : id)} aria-pressed={on} className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${on ? 'bg-ink-900 font-semibold text-paper-100' : 'text-ink-700 hover:bg-ink-100'}`}>{c.name || c.category_name}</button></li>
          })}
        </ul>
      </div>

      <div>
        <h2 className="label !mb-3 font-sans">Price</h2>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price" inputMode="decimal" type="number" min="0" step="0.5" placeholder="Min" defaultValue={priceMin} key={`min-${priceMin}`} onBlur={(e) => setPriceMin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setPriceMin(e.currentTarget.value)} className={selectCls} />
          <span className="text-ink-400">&ndash;</span>
          <input aria-label="Maximum price" inputMode="decimal" type="number" min="0" step="0.5" placeholder="Max" defaultValue={priceMax} key={`max-${priceMax}`} onBlur={(e) => setPriceMax(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setPriceMax(e.currentTarget.value)} className={selectCls} />
        </div>
      </div>

      <div>
        <h2 className="label !mb-3 font-sans">Availability</h2>
        <select aria-label="Availability" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className={selectCls}>
          <option value="all">All items</option>
          <option value="in_stock">In stock only</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </div>

      <div>
        <h2 className="label !mb-3 font-sans">Rating</h2>
        <select aria-label="Minimum rating" value={minRating} onChange={(e) => setMinRating(e.target.value)} className={selectCls}>
          <option value="">Any rating</option>
          <option value="4">4 stars &amp; up</option>
          <option value="3">3 stars &amp; up</option>
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-800">
        <input type="checkbox" checked={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.checked)} className="h-4 w-4 rounded-sm border-ink-300 text-primary-600 focus:ring-primary-600" />
        Featured items only
      </label>

      {hasFilters && <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900">Clear all filters</button>}
    </div>
  )

  return (
    <div>
      <PageBanner
        title={title}
        subtitle={searchQuery || activeCategory ? undefined : 'Spices, grains, fresh produce, fish and pantry staples from African stores near you.'}
        placement="products_top_banner"
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12 lg:px-8">
        <aside className="hidden lg:block"><div className="sticky top-32">{filters}</div></aside>

        <div>
          {/* Smart basket: AI shopping list for a dish */}
          <section aria-label="Smart basket" className="mb-8 rounded-lg border border-paper-300 bg-paper-200/60">
            <button type="button" onClick={() => setSmartOpen((v) => !v)} aria-expanded={smartOpen} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-nude-600" /><span className="font-display text-lg text-ink-900">Cooking something specific?</span></span>
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-ink-500">{smartOpen ? 'Hide' : 'Show'}</span>
            </button>
            {smartOpen && (
              <div className="border-t border-paper-300 px-5 pb-5 pt-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSmartBasket() }} className="flex gap-2">
                  <label htmlFor="smart-q" className="sr-only">Dish</label>
                  <input id="smart-q" value={smartQuery} onChange={(e) => setSmartQuery(e.target.value)} placeholder="e.g. egusi soup, jollof rice, puff puff" className="input" />
                  <button type="submit" disabled={smartLoading || !smartQuery.trim()} className="btn-primary shrink-0">{smartLoading ? 'Finding…' : 'Find ingredients'}</button>
                </form>
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {SMART_DISHES.map((d) => <button key={d} type="button" onClick={() => handleSmartBasket(d.replace(/[^\w\s]/g, '').trim())} className="text-ink-700 underline decoration-ink-300 underline-offset-4 hover:text-ink-900 hover:decoration-ink-900">{d.replace(/[^\w\s]/g, '').trim()}</button>)}
                </p>
                {smartDone && (
                  <div className="mt-5">
                    {smartResponse && <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink-700">{smartResponse}</p>}
                    {smartProducts.length > 0 && (
                      <>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{smartProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div>
                        <button type="button" onClick={handleAddAllSmart} className="btn-primary mt-5">Add all {smartProducts.length} to cart</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-paper-300 pb-4">
            <p className="text-sm text-ink-600" aria-live="polite">
              {loading ? 'Loading…' : <><span className="font-semibold text-ink-900">{totalProducts}</span> {totalProducts === 1 ? 'product' : 'products'}</>}
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowFilters(true)} className="btn-secondary !px-4 !py-2 lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters{activeCount ? ` (${activeCount})` : ''}</button>
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <span className="hidden sm:inline">Sort by</span>
                <select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input !w-auto !py-2 !text-sm">
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: low to high</option>
                  <option value="price_high">Price: high to low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="rating">Highest rated</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i}><div className="skeleton aspect-[4/5]" /><div className="skeleton mt-3 h-4 w-3/4" /><div className="skeleton mt-2 h-4 w-1/3" /></div>)}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-dashed border-paper-400 px-6 py-20 text-center">
              <Search className="mx-auto h-8 w-8 text-ink-300" />
              <h2 className="mt-4 font-display text-2xl text-ink-900">Nothing matches that yet</h2>
              <p className="mx-auto mt-2 max-w-md text-ink-600">{hasFilters ? 'Try removing a filter or searching for something broader.' : 'No groceries are available for your area right now. Try another city.'}</p>
              {hasFilters && <button type="button" onClick={clearAllFilters} className="btn-primary mt-6">Clear all filters</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4 border-t border-paper-300 pt-8 sm:flex-row sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-ink-600">Per page
                <select aria-label="Items per page" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="input !w-auto !py-1.5 !text-sm">
                  {[12, 20, 40, 60].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-fade-up flex-col bg-paper-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-paper-300 px-5 py-4">
              <h2 className="font-display text-xl">Filters</h2>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Close filters" className="rounded-md p-2 hover:bg-ink-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">{filters}</div>
            <div className="border-t border-paper-300 p-4"><button type="button" onClick={() => setShowFilters(false)} className="btn-primary w-full">Show {totalProducts} {totalProducts === 1 ? 'product' : 'products'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Groceries
