import { useState } from 'react'
import { X, Check, X as XIcon } from 'lucide-react'

const ProductComparison = ({ products, isOpen, onClose, onRemove }) => {
  if (!isOpen || !products || products.length === 0) return null

  const features = [
    { key: 'price', label: 'Price' },
    { key: 'rating', label: 'Rating' },
    { key: 'stock_quantity', label: 'In Stock' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'description', label: 'Description' }
  ]

  const getFeatureValue = (product, featureKey) => {
    switch (featureKey) {
      case 'price':
        return `$${product.price?.toFixed(2) || '0.00'}`
      case 'rating':
        return product.average_rating ? `${product.average_rating.toFixed(1)} ⭐` : 'N/A'
      case 'stock_quantity':
        return product.stock_quantity > 0 ? 'Yes' : 'No'
      case 'vendor':
        return product.vendor?.business_name || 'N/A'
      case 'description':
        return product.description ? (product.description.length > 50 ? product.description.substring(0, 50) + '...' : product.description) : 'N/A'
      default:
        return product[featureKey] || 'N/A'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Compare Groceries</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
            aria-label="Close comparison"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Feature</th>
                {products.map((product, index) => (
                  <th key={index} className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900 relative">
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[150px]">{product.name}</span>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(product.id)}
                          className="ml-2 p-1 hover:bg-gray-200 rounded"
                          type="button"
                          aria-label="Remove from comparison"
                        >
                          <XIcon className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, featureIndex) => (
                <tr key={featureIndex} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{feature.label}</td>
                  {products.map((product, productIndex) => (
                    <td key={productIndex} className="border border-gray-200 px-4 py-3 text-gray-700">
                      {getFeatureValue(product, feature.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ProductComparison

