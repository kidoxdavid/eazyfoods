import { useState } from 'react'
import { X, Filter, DollarSign, CheckCircle, Star, TrendingUp } from 'lucide-react'

const FilterSidebar = ({ 
  isOpen, 
  onClose, 
  filters = {}, 
  onFilterChange = () => {}, 
  categories = [],
  onClearFilters = () => {}
}) => {
  // Safety check: ensure filters is an object
  if (!filters || typeof filters !== 'object') {
    return null
  }
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    stock: true,
    rating: true,
    category: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const quickFilters = [
    { id: 'under_10', label: 'Under $10', icon: DollarSign, filter: { max_price: 10 } },
    { id: 'under_25', label: 'Under $25', icon: DollarSign, filter: { max_price: 25 } },
    { id: 'under_50', label: 'Under $50', icon: DollarSign, filter: { max_price: 50 } },
    { id: 'in_stock', label: 'In Stock', icon: CheckCircle, filter: { in_stock: true } },
    { id: 'high_rated', label: '4+ Stars', icon: Star, filter: { min_rating: 4 } },
    { id: 'trending', label: 'Trending', icon: TrendingUp, filter: { trending: true } }
  ]

  const handleQuickFilter = (quickFilter) => {
    // Apply quick filter
    Object.entries(quickFilter.filter).forEach(([key, value]) => {
      onFilterChange(key, value)
    })
  }

  const isQuickFilterActive = (quickFilter) => {
    return Object.entries(quickFilter.filter).every(([key, value]) => {
      return filters[key] === value
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 overflow-y-auto lg:relative lg:z-auto lg:shadow-none lg:border-r lg:border-gray-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">Filters</h2>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              type="button"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Quick Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Filters</h3>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((quickFilter) => {
                const Icon = quickFilter.icon
                const isActive = isQuickFilterActive(quickFilter)
                
                return (
                  <button
                    key={quickFilter.id}
                    onClick={() => handleQuickFilter(quickFilter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {quickFilter.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-3"
              type="button"
            >
              <span>Price Range</span>
              <span className="text-gray-400">{expandedSections.price ? '−' : '+'}</span>
            </button>
            {expandedSections.price && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                  <input
                    type="number"
                    value={filters.min_price || ''}
                    onChange={(e) => onFilterChange('min_price', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="$0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                  <input
                    type="number"
                    value={filters.max_price || ''}
                    onChange={(e) => onFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="$100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('stock')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-3"
              type="button"
            >
              <span>Stock Status</span>
              <span className="text-gray-400">{expandedSections.stock ? '−' : '+'}</span>
            </button>
            {expandedSections.stock && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.in_stock === true}
                    onChange={(e) => onFilterChange('in_stock', e.target.checked ? true : '')}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('rating')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-3"
              type="button"
            >
              <span>Minimum Rating</span>
              <span className="text-gray-400">{expandedSections.rating ? '−' : '+'}</span>
            </button>
            {expandedSections.rating && (
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <label key={rating} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="min_rating"
                      checked={filters.min_rating === rating}
                      onChange={() => onFilterChange('min_rating', rating)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{rating}+ Stars</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => toggleSection('category')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-3"
                type="button"
              >
                <span>Categories</span>
                <span className="text-gray-400">{expandedSections.category ? '−' : '+'}</span>
              </button>
              {expandedSections.category && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={!filters.category_id}
                      onChange={() => onFilterChange('category_id', '')}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id || cat.category_id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.category_id === (cat.id || cat.category_id)}
                        onChange={() => onFilterChange('category_id', cat.id || cat.category_id)}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">
                        {cat.name || cat.category_name || 'Unnamed Category'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clear Filters */}
          {(filters.min_price || filters.max_price || filters.in_stock || filters.min_rating || filters.category_id) && (
            <button
              onClick={onClearFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              type="button"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default FilterSidebar

