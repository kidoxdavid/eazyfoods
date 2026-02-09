const CategoryBadge = ({ category, size = 'sm' }) => {
  if (!category) return null

  // Color mapping for categories
  const categoryColors = {
    'fruits': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'vegetables': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    'meat': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    'seafood': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    'dairy': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    'grains': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    'spices': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    'beverages': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
    'snacks': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
    'frozen': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  }

  // Get category name
  const categoryName = category.name || category.category_name || 'Uncategorized'
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '_')

  // Find matching color or use default
  const colors = categoryColors[categorySlug] || 
    Object.values(categoryColors)[Math.abs(categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % categoryColors.length] ||
    { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5'
  }

  return (
    <span className={`${colors.bg} ${colors.text} ${colors.border} border ${sizeClasses[size]} rounded-full font-medium inline-flex items-center`}>
      {categoryName}
    </span>
  )
}

export default CategoryBadge

