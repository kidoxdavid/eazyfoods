import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Package, Download, Camera, Barcode, X } from 'lucide-react'
import Pagination from '../components/Pagination'
import BarcodeScanner from '../components/BarcodeScanner'
import BarcodeGenerator from '../components/BarcodeGenerator'

const Products = () => {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showScanner, setShowScanner] = useState(false)
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false)
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null)
  const [barcodeSearch, setBarcodeSearch] = useState('')

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    if (selectedVendor) {
      fetchProducts()
    } else {
      setProducts([])
    }
  }, [search, selectedVendor, statusFilter, currentPage])

  const fetchVendors = async () => {
    setVendorsLoading(true)
    try {
      const response = await api.get('/admin/vendors', { params: { limit: 1000 } })
      const vendorsData = Array.isArray(response.data) ? response.data : []
      setVendors(vendorsData)
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
      setVendors([]) // Set to empty array on error
    } finally {
      setVendorsLoading(false)
    }
  }

  const fetchProducts = async () => {
    if (!selectedVendor) return
    
    setLoading(true)
    try {
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20,
        vendor_id: selectedVendor
      }
      if (search) params.search = search
      
      const response = await api.get('/admin/products', { params })
      let filtered = Array.isArray(response.data) ? response.data : []
      
      if (statusFilter !== 'all') {
        filtered = filtered.filter(p => 
          statusFilter === 'active' ? p.is_active : !p.is_active
        )
      }
      
      setProducts(filtered)
      setTotalPages(Math.ceil(filtered.length / 20) || 1)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      await api.delete(`/admin/products/${productId}`)
      fetchProducts()
    } catch (error) {
      alert('Failed to delete product')
    }
  }

  const handleToggleActive = async (productId, currentStatus) => {
    try {
      await api.put(`/admin/products/${productId}`, {
        is_active: !currentStatus
      })
      fetchProducts()
    } catch (error) {
      alert('Failed to update product status')
    }
  }

  const handleBarcodeScan = async (scannedBarcode) => {
    try {
      const response = await api.get('/barcode/lookup', { params: { barcode: scannedBarcode } })
      const product = response.data
      
      // If vendor is selected, check if product belongs to vendor
      if (selectedVendor && product.vendor_id !== selectedVendor) {
        alert('This product does not belong to the selected vendor')
        return
      }
      
      // Set search to product name and filter
      setSearch(product.name)
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
      
      if (selectedVendor && product.vendor_id !== selectedVendor) {
        alert('This product does not belong to the selected vendor')
        return
      }
      
      setSearch(product.name)
      fetchProducts()
    } catch (error) {
      alert('Product not found with this barcode')
    }
  }

  if (vendorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const selectedVendorName = Array.isArray(vendors) ? vendors.find(v => v.id === selectedVendor)?.business_name || '' : ''

  const handleExport = () => {
    if (!Array.isArray(products) || products.length === 0) {
      alert('No products to export')
      return
    }
    
    const headers = ['Name', 'Vendor', 'Price', 'Stock', 'Status', 'Category', 'SKU', 'Barcode']
    const rows = products.map(product => [
      product.name,
      product.vendor?.business_name || 'N/A',
      `$${parseFloat(product.price).toFixed(2)}`,
      product.stock_quantity || 0,
      product.status || 'active',
      product.category?.name || 'N/A',
      product.sku || 'N/A',
      product.barcode || 'N/A'
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products_${selectedVendorName ? selectedVendorName.replace(/\s+/g, '_') : 'all'}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage products by vendor</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden">Scan</span>
          </button>
          {selectedVendor && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Vendor Selection and Search - Same Line */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vendor
            </label>
            {vendorsLoading ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
            ) : (
              <select
                value={selectedVendor}
                onChange={(e) => {
                  setSelectedVendor(e.target.value)
                  setCurrentPage(1)
                  setSearch('')
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Select a vendor to view products --</option>
                {Array.isArray(vendors) && vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.business_name} ({vendor.product_count} products)
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedVendor && (
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search products for ${selectedVendorName}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedVendor && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No products found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {search || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'This vendor has no products yet'}
                </p>
              </div>
            ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(products) && products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.category_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono text-xs">
                        {product.barcode || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${parseFloat(product.price).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.stock_quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          className={product.is_active ? "text-green-600 hover:text-green-900" : "text-gray-400 hover:text-gray-600"}
                          title={product.is_active ? "Deactivate" : "Activate"}
                        >
                          {product.is_active ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
          </div>
        </>
      )}

      {!selectedVendor && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">Select a vendor to view their products</p>
          <p className="text-gray-400 text-sm mt-2">Choose a vendor from the dropdown above to see and manage their products</p>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          title="Scan Product Barcode"
        />
      )}

      {showBarcodeGenerator && selectedProductForBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Product Barcode</h2>
              <button
                onClick={() => {
                  setShowBarcodeGenerator(false)
                  setSelectedProductForBarcode(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">{selectedProductForBarcode.name}</p>
              {selectedProductForBarcode.barcode ? (
                <BarcodeGenerator barcode={selectedProductForBarcode.barcode} />
              ) : (
                <div className="text-center p-4 text-gray-500">
                  <p>No barcode available. Click generate to create one.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!selectedProductForBarcode.barcode && (
                <button
                  onClick={() => handleGenerateBarcode(selectedProductForBarcode)}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Generate Barcode
                </button>
              )}
              <button
                onClick={() => {
                  setShowBarcodeGenerator(false)
                  setSelectedProductForBarcode(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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

