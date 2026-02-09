import { useEffect, useState } from 'react'
import api from '../services/api'
import { Settings, BarChart3, Package, CheckCircle, XCircle, Search, Download, RefreshCw, Edit, Trash2, Plus, Camera, ScanLine as BarcodeIcon } from 'lucide-react'

const Barcode = () => {
  const [activeTab, setActiveTab] = useState('overview') // overview, products, settings, statistics
  const [settings, setSettings] = useState(null)
  const [products, setProducts] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vendorFilter, setVendorFilter] = useState('all')
  const [barcodeFilter, setBarcodeFilter] = useState('all') // all, with_barcode, without_barcode
  const [searchQuery, setSearchQuery] = useState('')
  const [vendors, setVendors] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])

  useEffect(() => {
    fetchSettings()
    fetchVendors()
    fetchStatistics() // Load statistics for overview
  }, [])

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts()
    } else if (activeTab === 'statistics') {
      fetchStatistics()
    }
  }, [activeTab, vendorFilter, barcodeFilter, searchQuery])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/barcode/settings')
      setSettings(response.data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get('/admin/vendors', { params: { limit: 1000 } })
      setVendors(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 1000,
        has_barcode: barcodeFilter === 'with_barcode' ? true : barcodeFilter === 'without_barcode' ? false : null,
        vendor_id: vendorFilter !== 'all' ? vendorFilter : null,
        search: searchQuery || null
      }
      const response = await api.get('/admin/barcode/products', { params })
      setProducts(response.data?.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/barcode/statistics')
      setStatistics(response.data)
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSettings = async (updatedSettings) => {
    try {
      await api.put('/admin/barcode/settings', updatedSettings)
      setSettings(updatedSettings)
      alert('Settings updated successfully')
    } catch (error) {
      alert('Failed to update settings')
    }
  }

  const handleBulkGenerate = async (productIds = null, vendorId = null, generateForAll = false) => {
    if (!confirm(`Are you sure you want to generate barcodes for ${generateForAll ? 'all products' : productIds?.length || 'selected products'}?`)) return
    
    try {
      const payload = {}
      if (generateForAll) {
        payload.generate_for_all = true
      } else if (productIds && productIds.length > 0) {
        payload.product_ids = productIds
      } else if (vendorId) {
        payload.vendor_id = vendorId
      }
      
      const response = await api.post('/admin/barcode/products/bulk-generate', payload)
      alert(response.data.message)
      fetchProducts()
      fetchStatistics()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to generate barcodes')
    }
  }

  const handleUpdateBarcode = async (productId, newBarcode) => {
    try {
      await api.put(`/admin/barcode/products/${productId}/barcode`, null, {
        params: { barcode: newBarcode }
      })
      alert('Barcode updated successfully')
      fetchProducts()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update barcode')
    }
  }

  const handleRemoveBarcode = async (productId) => {
    if (!confirm('Are you sure you want to remove this barcode?')) return
    
    try {
      await api.delete(`/admin/barcode/products/${productId}/barcode`)
      alert('Barcode removed successfully')
      fetchProducts()
    } catch (error) {
      alert('Failed to remove barcode')
    }
  }

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Barcode Management</h1>
          <p className="text-gray-600 mt-1">Control and customize barcode features for vendors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              setActiveTab('products')
              fetchProducts()
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => {
              setActiveTab('statistics')
              fetchStatistics()
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statistics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => {
              setActiveTab('settings')
              fetchSettings()
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statistics?.overview?.total_products || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">With Barcode</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {statistics?.overview?.products_with_barcode || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Without Barcode</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {statistics?.overview?.products_without_barcode || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setActiveTab('products')
                  setBarcodeFilter('without_barcode')
                  fetchProducts()
                }}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
              >
                <BarcodeIcon className="h-6 w-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">View Products Without Barcodes</p>
                <p className="text-sm text-gray-500 mt-1">Generate barcodes for products missing them</p>
              </button>
              <button
                onClick={() => {
                  setActiveTab('settings')
                  fetchSettings()
                }}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
              >
                <Settings className="h-6 w-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Configure Barcode Settings</p>
                <p className="text-sm text-gray-500 mt-1">Customize barcode generation and policies</p>
              </button>
              <button
                onClick={() => {
                  setActiveTab('statistics')
                  fetchStatistics()
                }}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
              >
                <BarChart3 className="h-6 w-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">View Statistics</p>
                <p className="text-sm text-gray-500 mt-1">See barcode usage across vendors</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.business_name}</option>
                ))}
              </select>
              <select
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Products</option>
                <option value="with_barcode">With Barcode</option>
                <option value="without_barcode">Without Barcode</option>
              </select>
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedProducts.length} product(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkGenerate(selectedProducts)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Generate Barcodes
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === products.length && products.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          No products found
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => toggleProductSelection(product.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {product.vendor_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {product.sku || '-'}
                          </td>
                          <td className="px-6 py-4">
                            {product.barcode ? (
                              <span className="text-sm font-mono text-gray-900">{product.barcode}</span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {product.stock_quantity || 0}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {product.barcode ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const newBarcode = prompt('Enter new barcode:', product.barcode)
                                      if (newBarcode && newBarcode !== product.barcode) {
                                        handleUpdateBarcode(product.id, newBarcode)
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit Barcode"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveBarcode(product.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Remove Barcode"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleBulkGenerate([product.id])}
                                  className="text-green-600 hover:text-green-900"
                                  title="Generate Barcode"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleBulkGenerate(null, vendorFilter !== 'all' ? vendorFilter : null, false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Generate for Filtered Products
              </button>
              <button
                onClick={() => {
                  if (confirm('Generate barcodes for ALL products without barcodes?')) {
                    handleBulkGenerate(null, null, true)
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Generate for All Missing
              </button>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : statistics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statistics.overview.total_products}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <p className="text-sm text-gray-500">With Barcode</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {statistics.overview.products_with_barcode}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <p className="text-sm text-gray-500">Without Barcode</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {statistics.overview.products_without_barcode}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <p className="text-sm text-gray-500">Coverage</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {statistics.overview.barcode_coverage_percentage}%
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Barcode Coverage by Vendor</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Products</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">With Barcode</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Without Barcode</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coverage</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {statistics.by_vendor.map((vendor) => (
                        <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {vendor.vendor_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {vendor.total_products}
                          </td>
                          <td className="px-6 py-4 text-sm text-green-600">
                            {vendor.with_barcode}
                          </td>
                          <td className="px-6 py-4 text-sm text-red-600">
                            {vendor.without_barcode}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${vendor.coverage_percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{vendor.coverage_percentage}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {vendor.without_barcode > 0 && (
                              <button
                                onClick={() => {
                                  setActiveTab('products')
                                  setVendorFilter(vendor.vendor_id)
                                  setBarcodeFilter('without_barcode')
                                  fetchProducts()
                                }}
                                className="text-primary-600 hover:text-primary-900 text-sm"
                              >
                                Generate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No statistics available</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Barcode System Settings</h2>
          {settings ? (
            <BarcodeSettingsForm
              settings={settings}
              onSave={handleUpdateSettings}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const BarcodeSettingsForm = ({ settings, onSave }) => {
  const [formData, setFormData] = useState(settings)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_generate_on_product_create || false}
              onChange={(e) => setFormData({ ...formData, auto_generate_on_product_create: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-generate barcode when product is created</span>
          </label>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.require_barcode_for_products || false}
              onChange={(e) => setFormData({ ...formData, require_barcode_for_products: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require barcode for all products</span>
          </label>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.allow_vendor_barcode_generation || false}
              onChange={(e) => setFormData({ ...formData, allow_vendor_barcode_generation: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Allow vendors to generate barcodes</span>
          </label>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.allow_vendor_barcode_editing || false}
              onChange={(e) => setFormData({ ...formData, allow_vendor_barcode_editing: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Allow vendors to edit barcodes</span>
          </label>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.barcode_validation_enabled || false}
              onChange={(e) => setFormData({ ...formData, barcode_validation_enabled: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable barcode validation</span>
          </label>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.duplicate_barcode_allowed || false}
              onChange={(e) => setFormData({ ...formData, duplicate_barcode_allowed: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Allow duplicate barcodes</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode Format</label>
          <select
            value={formData.barcode_format || 'CODE128'}
            onChange={(e) => setFormData({ ...formData, barcode_format: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="CODE128">CODE128</option>
            <option value="EAN13">EAN13</option>
            <option value="EAN8">EAN8</option>
            <option value="UPC">UPC</option>
            <option value="CODE39">CODE39</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode Prefix (Optional)</label>
          <input
            type="text"
            value={formData.barcode_prefix || ''}
            onChange={(e) => setFormData({ ...formData, barcode_prefix: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., EAZY"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Save Settings
        </button>
      </div>
    </form>
  )
}

export default Barcode

