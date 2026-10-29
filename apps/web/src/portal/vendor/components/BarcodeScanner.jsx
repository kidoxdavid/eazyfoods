import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, CheckCircle, AlertCircle, Keyboard, ImagePlus, Loader2 } from 'lucide-react'

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

const FORMATS = [0, 1, 2, 3, 4, 5, 6, 8, 9, 13, 15, 16]   // QR, Aztec, Codabar, Code 39/93/128, Data Matrix, EAN-8, EAN-13, ITF, UPC-A, UPC-E

/** Turn a camera failure into something a person can act on. */
function cameraProblem(err) {
  const text = String(err?.name ?? err?.message ?? err ?? '')
  if (!window.isSecureContext) return 'The camera only works on a secure (https) page. Open the site with https://, or take a photo or type the code instead.'
  if (/NotAllowed|Permission|denied/i.test(text)) return 'Camera access is blocked. Allow the camera for this site in your browser settings (the lock or aA icon next to the address), then try again. You can also take a photo or type the code.'
  if (/NotFound|Overconstrained|no camera/i.test(text)) return 'No camera was found on this device. Take a photo of the barcode or type the code instead.'
  if (/NotReadable|TrackStart|in use/i.test(text)) return 'The camera is being used by another app. Close it and try again, or take a photo or type the code.'
  if (/instagram|fban|fbav|line\//i.test(navigator.userAgent)) return 'This in-app browser blocks the camera. Open the page in Safari or Chrome, or take a photo or type the code.'
  return 'The camera could not start. Take a photo of the barcode or type the code instead.'
}

/** Stopping a scanner that never started throws (sometimes straight away, sometimes later). That must never take the page down with it. */
function safeStop(scanner) {
  if (!scanner) return
  try {
    const r = scanner.stop()
    if (r && typeof r.then === 'function') r.then(() => { try { scanner.clear() } catch { /* nothing to clear */ } }).catch(() => {})
  } catch { /* it was not running */ }
}

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
  const [starting, setStarting] = useState(false)
  const [slow, setSlow] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoRef = useRef(null)

  const stopScanner = () => {
    safeStop(html5QrCodeRef.current)
    html5QrCodeRef.current = null
    setScanning(false); setStarting(false); setSlow(false)
  }

  useEffect(() => {
    if (!scanning) return

    const el = document.getElementById(instanceId.current)
    if (!el) return

    const html5QrCode = new Html5Qrcode(instanceId.current)
    html5QrCodeRef.current = html5QrCode

    setStarting(true); setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 10000)   // after 10 seconds without a read, tell the person what to try
    html5QrCode
      .start(
        // A sharper picture makes 1D barcodes readable, especially on iPhones (they decode in software, not in hardware).
        { facingMode: 'environment' },
        {
          fps: 10,
          // A wide, short box suits barcodes, and it always fits the viewfinder (a fixed 300px box does not fit a small phone).
          qrbox: (w, h) => ({ width: Math.floor(w * 0.95), height: Math.floor(h * 0.8) }),
          videoConstraints: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          disableFlip: true,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          formatsToSupport: FORMATS,
        },
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
      .then(() => setStarting(false))
      .catch((err) => {
        console.error('Unable to start scanning:', err)
        clearTimeout(slowTimer); setStarting(false)
        setError(cameraProblem(err))
        setScanning(false)
      })

    return () => {
      clearTimeout(slowTimer)
      clearTimeout(debounceTimerRef.current)
      safeStop(html5QrCodeRef.current)
      html5QrCodeRef.current = null
    }
  }, [scanning])

  /** A photo of the barcode works on every phone, including ones where live scanning is poor. */
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setPhotoBusy(true); setError(null)
    const holder = document.getElementById(`${instanceId.current}-photo`)
    try {
      const reader = new Html5Qrcode(`${instanceId.current}-photo`, { formatsToSupport: FORMATS, verbose: false })
      const text = await reader.scanFile(file, false)
      reader.clear()
      setLastScanned(text)
      if (onScan) onScan(text)
    } catch {
      setError('Could not read a barcode from that photo. Get closer, fill the frame with the barcode, avoid glare, and try again, or type the code.')
    } finally { setPhotoBusy(false); void holder }
  }

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
                onClick={() => photoRef.current?.click()}
                disabled={photoBusy}
                className="px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm"
              >
                {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {photoBusy ? 'Reading the photo…' : 'Take or choose a photo of the barcode'}
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
              <div id={instanceId.current} className="w-full rounded-lg overflow-hidden min-h-[160px] bg-black" />
              <p role="status" className="mt-2 text-sm text-gray-700 flex items-center gap-2">
                {starting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting the camera… allow access if your browser asks.</> : slow ? 'Still looking. Move closer, hold steady, avoid glare, or take a photo / type the code below.' : 'Camera is on. Hold the barcode steady inside the box.'}
              </p>
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

        <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="sr-only" aria-label="Take or choose a photo of the barcode" />
        <div id={`${instanceId.current}-photo`} className="hidden" aria-hidden="true" />

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
