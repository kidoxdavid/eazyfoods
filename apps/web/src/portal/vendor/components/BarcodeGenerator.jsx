import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

const BarcodeGenerator = ({ barcode, format = 'CODE128', displayValue = true, width = 2, height = 100 }) => {
  const barcodeRef = useRef(null)

  useEffect(() => {
    if (barcode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcode, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: 14,
          textMargin: 5,
          margin: 10
        })
      } catch (error) {
        console.error('Error generating barcode:', error)
      }
    }
  }, [barcode, format, displayValue, width, height])

  if (!barcode) {
    return (
      <div className="text-center p-4 text-gray-500">
        <p>No barcode available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <svg ref={barcodeRef} className="max-w-full" />
      {displayValue && (
        <p className="mt-2 text-sm text-gray-600 font-mono">{barcode}</p>
      )}
    </div>
  )
}

export default BarcodeGenerator

