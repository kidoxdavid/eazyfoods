import { useState } from 'react'
import { X, Ruler } from 'lucide-react'

const SizeChart = ({ isOpen, onClose, productName = 'Product' }) => {
  if (!isOpen) return null

  // Sample size chart data - in real app, this would come from product data
  const sizeChart = {
    title: 'Size Guide',
    measurements: [
      { size: 'XS', chest: '34-36"', waist: '28-30"', length: '26"' },
      { size: 'S', chest: '36-38"', waist: '30-32"', length: '27"' },
      { size: 'M', chest: '38-40"', waist: '32-34"', length: '28"' },
      { size: 'L', chest: '40-42"', waist: '34-36"', length: '29"' },
      { size: 'XL', chest: '42-44"', waist: '36-38"', length: '30"' },
      { size: 'XXL', chest: '44-46"', waist: '38-40"', length: '31"' }
    ]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">{sizeChart.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
            aria-label="Close size chart"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Size guide for {productName}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Size</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Chest</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Waist</th>
                  <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Length</th>
                </tr>
              </thead>
              <tbody>
                {sizeChart.measurements.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium text-gray-900">{row.size}</td>
                    <td className="border border-gray-200 px-4 py-2 text-gray-700">{row.chest}</td>
                    <td className="border border-gray-200 px-4 py-2 text-gray-700">{row.waist}</td>
                    <td className="border border-gray-200 px-4 py-2 text-gray-700">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Measurements are approximate. For the best fit, please refer to our detailed sizing guide or contact customer service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SizeChart

