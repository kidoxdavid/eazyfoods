import { useEffect, useState } from 'react'
import api from '../services/api'
import { AlertTriangle, TrendingDown, Package, Plus, Camera, Barcode, X } from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'

const Inventory = () => {
  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [alertsRes, adjustmentsRes] = await Promise.all([
        api.get('/inventory/low-stock-alerts?resolved=false'),
        api.get('/inventory/adjustments?limit=50'),
      ])
      setLowStockAlerts(alertsRes.data)
      setAdjustments(adjustmentsRes.data)
    } catch (error) {
      console.error('Failed to fetch inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Track stock levels and adjustments</p>
        </div>
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          Add Adjustment
        </button>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mr-2" />
            Low Stock Alerts
          </h2>
        </div>
        {lowStockAlerts.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">No low stock alerts</p>
        ) : (
          <div className="space-y-2">
            {lowStockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{alert.product_name || `Product ID: ${alert.product_id}`}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Current: {alert.current_quantity} | Threshold: {alert.threshold_quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Adjustments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Adjustments</h2>
        {adjustments.length === 0 ? (
          <p className="text-sm sm:text-base text-gray-600">No adjustments yet</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Change
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Before
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      After
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adjustments.map((adj) => (
                    <tr key={adj.id}>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(adj.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {adj.adjustment_type.replace('_', ' ')}
                      </td>
                      <td
                        className={`px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          adj.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {adj.quantity_change > 0 ? '+' : ''}
                        {adj.quantity_change}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {adj.quantity_before}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {adj.quantity_after}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-gray-500">{adj.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {adjustments.map((adj) => (
                <div key={adj.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900 font-medium">{new Date(adj.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="text-gray-900 capitalize">{adj.adjustment_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className={`font-medium ${adj.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.quantity_change > 0 ? '+' : ''}
                        {adj.quantity_change}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Before:</span>
                      <span className="text-gray-900">{adj.quantity_before}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">After:</span>
                      <span className="text-gray-900 font-medium">{adj.quantity_after}</span>
                    </div>
                    {adj.reason && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Reason: </span>
                        <span className="text-gray-900">{adj.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <InventoryAdjustmentModal
          onClose={() => {
            setShowAdjustmentModal(false)
            setSelectedProduct(null)
          }}
          onSuccess={fetchData}
          showScanner={showScanner}
          setShowScanner={setShowScanner}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={async (scannedBarcode) => {
            try {
              const response = await api.get('/barcode/lookup', { params: { barcode: scannedBarcode } })
              setSelectedProduct(response.data)
              setShowScanner(false)
            } catch (error) {
              alert('Product not found with this barcode')
            }
          }}
          onClose={() => setShowScanner(false)}
          title="Scan Product Barcode for Inventory"
        />
      )}
    </div>
  )
}

const InventoryAdjustmentModal = ({ onClose, onSuccess, showScanner, setShowScanner, selectedProduct, setSelectedProduct }) => {
  const [formData, setFormData] = useState({
    product_id: selectedProduct?.id || '',
    barcode: '',
    adjustment_type: 'stock_in',
    quantity_change: '',
    reason: '',
    reference_number: '',
    notes: ''
  })

  useEffect(() => {
    if (selectedProduct) {
      setFormData(prev => ({
        ...prev,
        product_id: selectedProduct.id,
        barcode: selectedProduct.barcode || ''
      }))
    }
  }, [selectedProduct])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.product_id && !formData.barcode) {
      alert('Please select a product or scan a barcode')
      return
    }

    if (!formData.quantity_change || parseInt(formData.quantity_change) <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    try {
      let quantityChange = parseInt(formData.quantity_change)
      
      // For stock_out, damage, expired, return - make it negative
      if (['stock_out', 'damage', 'expired', 'return'].includes(formData.adjustment_type)) {
        quantityChange = -Math.abs(quantityChange)
      } else {
        // For stock_in and adjustment - keep positive
        quantityChange = Math.abs(quantityChange)
      }
      
      const payload = {
        adjustment_type: formData.adjustment_type,
        quantity_change: quantityChange,
        reason: formData.reason,
        reference_number: formData.reference_number,
        notes: formData.notes
      }
      
      // Add product_id or barcode
      if (formData.product_id) {
        payload.product_id = formData.product_id
      } else if (formData.barcode) {
        payload.barcode = formData.barcode
      }
      
      await api.post('/inventory/adjustments', payload)
      onSuccess()
      onClose()
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create adjustment')
    }
  }

  const handleBarcodeLookup = async () => {
    if (!formData.barcode.trim()) return
    
    try {
      const response = await api.get('/barcode/lookup', { params: { barcode: formData.barcode } })
      setSelectedProduct(response.data)
      setFormData(prev => ({ ...prev, product_id: response.data.id }))
    } catch (error) {
      alert('Product not found with this barcode')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add Inventory Adjustment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Product</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter or scan barcode..."
                  className="w-full pl-8 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
              >
                <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Scan</span>
              </button>
              <button
                type="button"
                onClick={handleBarcodeLookup}
                className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base whitespace-nowrap"
              >
                Lookup
              </button>
            </div>
            {selectedProduct && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs sm:text-sm font-medium text-green-800 truncate">{selectedProduct.name}</p>
                <p className="text-[10px] sm:text-xs text-green-600">Current Stock: {selectedProduct.stock_quantity}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Adjustment Type *</label>
            <select
              required
              value={formData.adjustment_type}
              onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="stock_in">Stock In (Add)</option>
              <option value="stock_out">Stock Out (Remove)</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
              <option value="expired">Expired</option>
              <option value="return">Return</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Quantity Change *</label>
            <input
              type="number"
              required
              value={formData.quantity_change}
              onChange={(e) => setFormData({ ...formData, quantity_change: e.target.value })}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={formData.adjustment_type === 'stock_in' ? 'Enter positive number' : 'Enter negative number'}
            />
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
              {formData.adjustment_type === 'stock_in' 
                ? 'Enter positive number to add stock' 
                : 'Enter positive number (will be converted to negative)'}
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Restocking, Damaged goods"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="PO number, invoice, etc."
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="2"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4">
            <button
              type="submit"
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Adjustment
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Inventory

