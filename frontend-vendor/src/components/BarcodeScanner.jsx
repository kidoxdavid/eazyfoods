import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, CheckCircle, AlertCircle, Keyboard } from 'lucide-react'

// Messages emitted by html5-qrcode on every frame when no code is in view — not real errors
const SCAN_NOISE_PATTERNS = [
  'No QR code found',
  'NotFoundException',
  'No MultiFormat Readers',
  'QR code parse error',
  'FormatException',
  'IndexSizeError',
  'Unable to parse',
  'No barcode or QR code detected',
  'Barcode not found',
  'QR code not found',
  'decode_hints',
]

const isScanNoise = (msg) =>
  SCAN_NOISE_PATTERNS.some((p) => typeof msg === 'string' && msg.includes(p))

let scannerInstanceCount = 0

const BarcodeScanner = ({ onScan, onClose, title = 'Scan Barcode', stopAfterScan = true }) => {
  // Each instance gets a unique DOM id so multiple scanners never collide
  const instanceId = useRef(`barcode-scanner-${++scannerInstanceCount}`)
  const html5QrCodeRef = useRef(null)
  const lastScannedRef = useRef(null)
  const debounceTimerRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualValue, setManualValue] = useState('')

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .then(() => { html5QrCodeRef.current?.clear() })
        .catch(() => {})
      html5QrCodeRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    if (!scanning) return

    const el = document.getElementById(instanceId.current)
    if (!el) return

    const html5QrCode = new Html5Qrcode(instanceId.current)
    html5QrCodeRef.current = html5QrCode

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
        (decodedText) => {
          // Debounce: ignore the same barcode within 2 seconds
          if (lastScannedRef.current === decodedText) return
          clearTimeout(debounceTimerRef.current)
          lastScannedRef.current = decodedText
          debounceTimerRef.current = setTimeout(() => { lastScannedRef.current = null }, 2000)

          setLastScanned(decodedText)
          setError(null)
          if (onScan) onScan(decodedText)
          if (stopAfterScan) stopScanner()
        },
        (errorMessage) => {
          if (!isScanNoise(errorMessage)) setError(errorMessage)
        }
      )
      .catch((err) => {
        console.error('Unable to start scanning:', err)
        setError('Unable to access camera. Check permissions or use manual entry below.')
        setScanning(false)
      })

    return () => {
      clearTimeout(debounceTimerRef.current)
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
        html5QrCodeRef.current = null
      }
    }
  }, [scanning])

  const startScanning = () => {
    setScanning(true)
    setError(null)
    setLastScanned(null)
    setManualEntry(false)
  }

  const handleClose = () => {
    stopScanner()
    if (onClose) onClose()
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const val = manualValue.trim()
    if (!val) return
    setLastScanned(val)
    setError(null)
    if (onScan) onScan(val)
    setManualValue('')
    if (stopAfterScan) setManualEntry(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          {manualEntry ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Enter barcode manually</label>
              <input
                type="text"
                autoFocus
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Type or paste barcode value..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                  Submit
                </button>
                <button type="button" onClick={() => setManualEntry(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Use Camera
                </button>
              </div>
            </form>
          ) : !scanning ? (
            <div className="bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px] gap-3">
              <Camera className="h-16 w-16 text-gray-400" />
              <p className="text-gray-600 text-center text-sm">Point camera at a barcode or QR code</p>
              <button
                onClick={startScanning}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Camera className="h-5 w-5" />
                Start Camera Scan
              </button>
              <button
                onClick={() => setManualEntry(true)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <Keyboard className="h-4 w-4" />
                Enter barcode manually
              </button>
            </div>
          ) : (
            <div className="relative">
              <div id={instanceId.current} className="w-full rounded-lg overflow-hidden" />
              <div className="mt-2 flex justify-between items-center">
                <button
                  onClick={() => { stopScanner(); setManualEntry(true) }}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Keyboard className="h-4 w-4" /> Manual entry
                </button>
                <button
                  onClick={stopScanner}
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
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {lastScanned && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">Scanned</p>
            </div>
            <p className="text-sm text-gray-700 font-mono break-all">{lastScanned}</p>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default BarcodeScanner
