import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react'

const BarcodeScanner = ({ onScan, onClose, title = 'Scan Barcode' }) => {
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)

  useEffect(() => {
    if (scanning && scannerRef.current) {
      const html5QrCode = new Html5Qrcode(scannerRef.current.id)
      html5QrCodeRef.current = html5QrCode

      html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Success callback
          setLastScanned(decodedText)
          setError(null)
          if (onScan) {
            onScan(decodedText)
          }
        },
        (errorMessage) => {
          // Error callback - ignore if it's just "No QR code found"
          if (!errorMessage.includes('No QR code found')) {
            setError(errorMessage)
          }
        }
      ).catch((err) => {
        console.error('Unable to start scanning:', err)
        setError('Unable to access camera. Please check permissions.')
        setScanning(false)
      })
    }

    return () => {
      if (html5QrCodeRef.current && scanning) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear()
        }).catch((err) => {
          console.error('Error stopping scanner:', err)
        })
      }
    }
  }, [scanning, onScan])

  const startScanning = () => {
    setScanning(true)
    setError(null)
    setLastScanned(null)
  }

  const stopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear()
        setScanning(false)
      }).catch((err) => {
        console.error('Error stopping scanner:', err)
        setScanning(false)
      })
    } else {
      setScanning(false)
    }
  }

  const handleClose = () => {
    stopScanning()
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          {!scanning ? (
            <div className="bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
              <Camera className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center mb-4">
                Click the button below to start scanning
              </p>
              <button
                onClick={startScanning}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Camera className="h-5 w-5" />
                Start Scanning
              </button>
            </div>
          ) : (
            <div className="relative">
              <div id="barcode-scanner" ref={scannerRef} className="w-full rounded-lg overflow-hidden" />
              <div className="mt-2 flex justify-center">
                <button
                  onClick={stopScanning}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Stop Scanning
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {lastScanned && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">Scanned Successfully!</p>
            </div>
            <p className="text-sm text-gray-700 font-mono break-all">{lastScanned}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner

