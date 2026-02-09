import { ShoppingCart, Heart, Search, Package, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'

const EmptyState = ({ 
  type = 'cart', 
  title = null, 
  description = null, 
  actionLabel = null, 
  actionLink = null,
  onAction = null 
}) => {
  const configs = {
    cart: {
      icon: ShoppingCart,
      title: 'Your cart is empty',
      description: 'Looks like you haven\'t added anything to your cart yet.',
      actionLabel: 'Start Shopping',
      actionLink: '/groceries',
      color: 'primary'
    },
    favorites: {
      icon: Heart,
      title: 'No favorites yet',
      description: 'Start adding products to your favorites to see them here.',
      actionLabel: 'Browse Groceries',
      actionLink: '/groceries',
      color: 'red'
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search terms or filters.',
      actionLabel: 'Clear Filters',
      color: 'gray'
    },
    orders: {
      icon: Package,
      title: 'No orders yet',
      description: 'Your order history will appear here once you make a purchase.',
      actionLabel: 'Start Shopping',
      actionLink: '/groceries',
      color: 'primary'
    },
    inbox: {
      icon: Inbox,
      title: 'No messages',
      description: 'You don\'t have any messages yet.',
      color: 'gray'
    }
  }

  const config = configs[type] || configs.cart
  const Icon = config.icon

  const colorClasses = {
    primary: 'text-primary-600 bg-primary-50 border-primary-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`w-24 h-24 rounded-full ${colorClasses[config.color].split(' ')[1]} border-2 ${colorClasses[config.color].split(' ')[2]} flex items-center justify-center mb-4`}>
        <Icon className={`h-12 w-12 ${colorClasses[config.color].split(' ')[0]}`} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {title || config.title}
      </h3>
      <p className="text-gray-600 max-w-md mb-6">
        {description || config.description}
      </p>
      {(actionLabel || config.actionLabel) && (
        actionLink || config.actionLink ? (
          <Link
            to={actionLink || config.actionLink}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            {actionLabel || config.actionLabel}
          </Link>
        ) : onAction ? (
          <button
            onClick={onAction}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            {actionLabel || config.actionLabel}
          </button>
        ) : null
      )}
    </div>
  )
}

export default EmptyState

