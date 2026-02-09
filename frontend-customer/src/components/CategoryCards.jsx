import { Link } from 'react-router-dom'
import { Package, Apple, Fish, Beef, Milk, Coffee, Cookie, Cherry, Carrot, UtensilsCrossed, ChefHat, IceCream, Candy, Soup, Drumstick, Grape, Banana, Nut, ShoppingBag, Wine, Flame, Zap } from 'lucide-react'

const categoryIcons = {
  'fruits': Apple,
  'vegetables': Carrot,
  'meat': Beef,
  'seafood': Fish,
  'dairy': Milk,
  'grains': UtensilsCrossed,
  'spices': Flame,
  'beverages': Wine,
  'snacks': Cookie,
  'frozen': IceCream,
  'bakery': Cookie,
  'default': Package
}

const categoryColors = {
  'fruits': { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200' },
  'vegetables': { bg: 'bg-emerald-100', text: 'text-emerald-800', hover: 'hover:bg-emerald-200' },
  'meat': { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200' },
  'seafood': { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  'dairy': { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200' },
  'grains': { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200' },
  'spices': { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200' },
  'beverages': { bg: 'bg-cyan-100', text: 'text-cyan-800', hover: 'hover:bg-cyan-200' },
  'snacks': { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200' },
  'frozen': { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200' },
  'bakery': { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200' },
}

const getCategoryStyle = (categoryName) => {
  if (!categoryName) return categoryColors['default']
  const slug = categoryName.toLowerCase().replace(/\s+/g, '_')
  return categoryColors[slug] || categoryColors['default']
}

const getCategoryIcon = (categoryName) => {
  if (!categoryName) return categoryIcons['default']
  const slug = categoryName.toLowerCase().replace(/\s+/g, '_')
  return categoryIcons[slug] || categoryIcons['default']
}

const CategoryCards = ({ categories = [], maxItems = 12 }) => {
  // Safety check: ensure categories is an array
  if (!Array.isArray(categories) || categories.length === 0) return null

  const itemsToShow = categories.slice(0, maxItems)

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Shop by Category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {itemsToShow.map((category) => {
          const categoryName = category.name || category.category_name || 'Uncategorized'
          const categoryId = category.id || category.category_id
          const style = getCategoryStyle(categoryName)
          const Icon = getCategoryIcon(categoryName)

          return (
            <Link
              key={categoryId}
              to={`/groceries?category_id=${categoryId}`}
              className={`${style.bg} ${style.text} ${style.hover} rounded-xl p-4 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg group`}
            >
              <Icon className="h-8 w-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold line-clamp-2">{categoryName}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryCards

