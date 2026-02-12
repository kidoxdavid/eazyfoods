import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { resolveUploadUrl } from '../services/api'
import { Plus, Edit, Trash2, Package, Search, X, Camera, Barcode } from 'lucide-react'
import { formatCurrency } from '../utils/format'
import Pagination from '../components/Pagination'
import BarcodeScanner from '../components/BarcodeScanner'
import BarcodeGenerator from '../components/BarcodeGenerator'

const Products = () => {
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [showScanner, setShowScanner] = useState(false)
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false)
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null)
  const [barcodeSearch, setBarcodeSearch] = useState('')

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/')
      setAllProducts(response.data)
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/list')
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-'
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : '-'
  }

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setProducts(allProducts)
    } else {
      const filtered = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setProducts(filtered)
    }
  }, [searchQuery, allProducts])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      await api.delete(`/products/${id}`)
      fetchProducts()
    } catch (error) {
      alert('Failed to delete product')
    }
  }

  const handleBarcodeScan = async (scannedBarcode) => {
    try {
      const response = await api.get('/barcode/lookup', { params: { barcode: scannedBarcode } })
      const product = response.data
      
      // Set search to product name
      setSearchQuery(product.name)
      setBarcodeSearch(scannedBarcode)
      fetchProducts()
      setShowScanner(false)
    } catch (error) {
      alert('Product not found with this barcode')
    }
  }

  const handleGenerateBarcode = async (product) => {
    try {
      const response = await api.post('/barcode/generate', null, { params: { product_id: product.id } })
      alert(`Barcode generated: ${response.data.barcode}`)
      fetchProducts()
      setShowBarcodeGenerator(false)
      setSelectedProductForBarcode(null)
    } catch (error) {
      alert('Failed to generate barcode')
    }
  }

  const handleBarcodeSearch = async () => {
    if (!barcodeSearch.trim()) return
    
    try {
      const response = await api.get('/barcode/lookup', { params: { barcode: barcodeSearch } })
      const product = response.data
      
      setSearchQuery(product.name)
      fetchProducts()
    } catch (error) {
      alert('Product not found with this barcode')
    }
  }

  const filteredProducts =
    filter === 'all'
      ? products
      : products.filter((p) => p.status === filter)

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when filter or search changes
  }, [filter, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden">Scan</span>
          </button>
          <Link
            to="/products/new"
            className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by barcode..."
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
              className="w-full pl-8 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleBarcodeSearch}
            className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm sm:text-base whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'active', 'out_of_stock', 'hidden'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Products - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600">No products found</p>
            <Link
              to="/products/new"
              className="text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block text-sm sm:text-base"
            >
              Add your first product
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barcode
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image_url ? (
                            <img
                              src={resolveUploadUrl(product.image_url)}
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-200 mr-3 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                            {product.sku && (
                              <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCategoryName(product.category_id)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.sku || '-'}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.barcode ? (
                          <span className="font-mono text-xs">{product.barcode}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.stock_quantity}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : product.status === 'out_of_stock'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {!product.barcode && (
                            <button
                              onClick={() => {
                                setSelectedProductForBarcode(product)
                                handleGenerateBarcode(product)
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="Generate Barcode"
                            >
                              <Barcode className="h-4 w-4 xl:h-5 xl:w-5" />
                            </button>
                          )}
                          {product.barcode && (
                            <button
                              onClick={() => {
                                setSelectedProductForBarcode(product)
                                setShowBarcodeGenerator(true)
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="View Barcode"
                            >
                              <Barcode className="h-4 w-4 xl:h-5 xl:w-5" />
                            </button>
                          )}
                          <Link
                            to={`/products/${product.id}/edit`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="h-4 w-4 xl:h-5 xl:w-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4 xl:h-5 xl:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {paginatedProducts.map((product) => (
                <div key={product.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    {product.image_url ? (
                      <img
                        src={resolveUploadUrl(product.image_url)}
                        alt={product.name}
                        className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">{product.name}</h3>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Category:</span>
                          <span>{getCategoryName(product.category_id)}</span>
                        </div>
                        {product.sku && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">SKU:</span>
                            <span>{product.sku}</span>
                          </div>
                        )}
                        {product.barcode && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Barcode:</span>
                            <span className="font-mono text-[10px]">{product.barcode}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Price:</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(product.price)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Stock:</span>
                          <span>{product.stock_quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Status:</span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              product.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : product.status === 'out_of_stock'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      {!product.barcode && (
                        <button
                          onClick={() => {
                            setSelectedProductForBarcode(product)
                            handleGenerateBarcode(product)
                          }}
                          className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Generate Barcode"
                        >
                          <Barcode className="h-5 w-5" />
                        </button>
                      )}
                      {product.barcode && (
                        <button
                          onClick={() => {
                            setSelectedProductForBarcode(product)
                            setShowBarcodeGenerator(true)
                          }}
                          className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Barcode"
                        >
                          <Barcode className="h-5 w-5" />
                        </button>
                      )}
                      <Link
                        to={`/products/${product.id}/edit`}
                        className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          title="Scan Product Barcode"
        />
      )}

      {showBarcodeGenerator && selectedProductForBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Product Barcode</h2>
              <button
                onClick={() => {
                  setShowBarcodeGenerator(false)
                  setSelectedProductForBarcode(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">{selectedProductForBarcode.name}</p>
              {selectedProductForBarcode.barcode ? (
                <BarcodeGenerator barcode={selectedProductForBarcode.barcode} />
              ) : (
                <div className="text-center p-3 sm:p-4 text-gray-500">
                  <p className="text-xs sm:text-sm">No barcode available. Click generate to create one.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!selectedProductForBarcode.barcode && (
                <button
                  onClick={() => handleGenerateBarcode(selectedProductForBarcode)}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Generate Barcode
                </button>
              )}
              <button
                onClick={() => {
                  setShowBarcodeGenerator(false)
                  setSelectedProductForBarcode(null)
                }}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products

