import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X, CheckCircle, AlertCircle, Keyboard, ImagePlus, Loader2, Flashlight, ZoomIn } from 'lucide-react'
import { decodeFile, decodeSource, PASS_COUNT, warmUp } from './scanEngine'

/** Turn a camera failure into something a person can act on. */
function cameraProblem(err) {
  const text = String(err?.name ?? err?.message ?? err ?? '')
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return 'The camera only works on a secure (https) page in a full browser. Open the site with https:// in Safari or Chrome, or take a photo or type the code instead.'
  if (/NotAllowed|Permission|denied/i.test(text)) return 'Camera access is blocked. Allow the camera for this site in your browser settings (the lock or aA icon next to the address), then try again. You can also take a photo or type the code.'
  if (/NotFound|Overconstrained|no camera/i.test(text)) return 'No camera was found on this device. Take a photo of the barcode or type the code instead.'
  if (/NotReadable|TrackStart|in use/i.test(text)) return 'The camera is being used by another app. Close it and try again, or take a photo or type the code.'
  if (/instagram|fban|fbav|line\//i.test(navigator.userAgent)) return 'This in-app browser blocks the camera. Open the page in Safari or Chrome, or take a photo or type the code.'
  return 'The camera could not start. Take a photo of the barcode or type the code instead.'
}

/**
 * Scan a product barcode with the camera, from a photo, or by typing it.
 * Live scanning reads frames from the camera itself (full-HD, continuous focus, optional torch and zoom) and decodes them with scanEngine.
 */
const BarcodeScanner = ({ onScan, onClose, title = 'Scan Barcode', stopAfterScan = true }) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const busyRef = useRef(false)
  const passRef = useRef(0)
  const doneRef = useRef(false)
  const lastRef = useRef({ text: null, at: 0 })
  const photoRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [caps, setCaps] = useState({ torch: false, zoom: null })
  const [torchOn, setTorchOn] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => { warmUp() }, [])

  const stopCamera = useCallback(() => {
    clearInterval(timerRef.current); timerRef.current = null
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* already stopped */ }
    streamRef.current = null
    setScanning(false); setStarting(false); setSlow(false); setTorchOn(false)
  }, [])

  const found = useCallback((text) => {
    const now = Date.now()
    if (lastRef.current.text === text && now - lastRef.current.at < 2000) return   // the same code seen again within 2 seconds
    lastRef.current = { text, at: now }
    setLastScanned(text); setError(null)
    if (onScan) onScan(text)
    if (stopAfterScan) { doneRef.current = true; stopCamera() }
  }, [onScan, stopAfterScan, stopCamera])

  useEffect(() => () => { doneRef.current = true; clearInterval(timerRef.current); try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* gone */ } }, [])

  const startScanning = async () => {
    setError(null); setLastScanned(null); setManualEntry(false); setStarting(true); setScanning(true); setSlow(false); doneRef.current = false
    const slowTimer = setTimeout(() => setSlow(true), 10000)
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('insecure')
      // Full-HD and continuous focus: small barcodes on packaging need the extra detail.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      if (doneRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      const c = track.getCapabilities?.() ?? {}
      try { if (c.focusMode?.includes?.('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }) } catch { /* not supported */ }
      setCaps({ torch: !!c.torch, zoom: c.zoom ? { min: c.zoom.min, max: Math.min(c.zoom.max, 4), step: c.zoom.step || 0.1 } : null })
      setZoom(c.zoom?.min ?? 1)
      const v = videoRef.current
      v.srcObject = stream; v.setAttribute('playsinline', 'true'); v.muted = true
      await v.play()
      setStarting(false)
      timerRef.current = setInterval(async () => {
        if (busyRef.current || doneRef.current || !v.videoWidth) return
        busyRef.current = true
        try {
          // Each tick tries a different method on the current frame (full size, shrunk, contrast-stretched, enlarged), so a hard barcode gets every chance within a second or two.
          const text = await decodeSource(v, v.videoWidth, v.videoHeight, passRef.current++ % PASS_COUNT)
          if (text && !doneRef.current) found(text)
        } finally { busyRef.current = false }
      }, 140)
    } catch (err) {
      console.error('Unable to start scanning:', err)
      stopCamera(); setError(cameraProblem(err))
    } finally { clearTimeout(slowTimer) }
  }

  const toggleTorch = async () => {
    const t = streamRef.current?.getVideoTracks()[0]
    try { await t?.applyConstraints({ advanced: [{ torch: !torchOn }] }); setTorchOn(!torchOn) } catch { setError('This camera cannot switch the light on.') }
  }
  const changeZoom = async (value) => {
    setZoom(value)
    try { await streamRef.current?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ zoom: value }] }) } catch { /* ignore */ }
  }

  /** A photo of the barcode works on every phone, including ones where live scanning is poor. */
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setPhotoBusy(true); setError(null)
    try {
      const text = await decodeFile(file)
      if (text) { setLastScanned(text); if (onScan) onScan(text) }
      else setError('Could not read a barcode from that photo. Get closer, fill the frame with the barcode, avoid glare, and try again, or type the code.')
    } catch { setError('Could not read that photo. Try again, or type the code.') }
    finally { setPhotoBusy(false) }
  }

  const handleClose = () => { stopCamera(); if (onClose) onClose() }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const val = manualValue.trim()
    if (!val) return
    setLastScanned(val); setError(null)
    if (onScan) onScan(val)
    setManualValue('')
    if (stopAfterScan) setManualEntry(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button onClick={handleClose} aria-label="Close scanner" className="text-gray-500 hover:text-gray-700 transition-colors"><X className="h-6 w-6" /></button>
        </div>

        <div className="mb-4">
          {manualEntry ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label htmlFor="manual-barcode" className="block text-sm font-medium text-gray-700">Enter barcode manually</label>
              <input id="manual-barcode" type="text" inputMode="numeric" autoFocus value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Type or paste barcode value..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Submit</button>
                <button type="button" onClick={() => setManualEntry(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Use Camera</button>
              </div>
            </form>
          ) : !scanning ? (
            <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] gap-3">
              <Camera className="h-14 w-14 text-gray-500" aria-hidden="true" />
              <p className="text-gray-700 text-center text-sm">Point the camera at a barcode. Hold it about a hand’s width away, steady, in good light.</p>
              <button onClick={startScanning} className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"><Camera className="h-5 w-5" aria-hidden="true" />Start Camera Scan</button>
              <button onClick={() => photoRef.current?.click()} disabled={photoBusy} className="px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm">
                {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                {photoBusy ? 'Reading the photo…' : 'Take or choose a photo of the barcode'}
              </button>
              <button onClick={() => setManualEntry(true)} className="flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800"><Keyboard className="h-4 w-4" aria-hidden="true" />Enter barcode manually</button>
            </div>
          ) : (
            <div>
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} className="w-full max-h-[55vh] object-cover" playsInline muted aria-label="Camera view" />
                {!starting && <div className="pointer-events-none absolute inset-x-[6%] top-[28%] bottom-[28%] border-2 border-white/80 rounded-md" aria-hidden="true" />}
              </div>
              <p role="status" className="mt-2 text-sm text-gray-700 flex items-center gap-2">
                {starting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Starting the camera… allow access if your browser asks.</> : slow ? 'Still looking. Move a little closer or further away, hold steady, avoid glare, try the light, or take a photo / type the code below.' : 'Camera is on. Hold the barcode steady inside the frame.'}
              </p>
              {!starting && (caps.torch || caps.zoom) && (
                <div className="mt-2 flex items-center gap-3">
                  {caps.torch && <button onClick={toggleTorch} aria-pressed={torchOn} className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1.5 ${torchOn ? 'bg-amber-100 border-amber-300 text-amber-900' : 'border-gray-300 text-gray-700'}`}><Flashlight className="h-4 w-4" aria-hidden="true" />Light</button>}
                  {caps.zoom && <label className="flex items-center gap-2 text-sm text-gray-700 flex-1"><ZoomIn className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Zoom</span><input type="range" min={caps.zoom.min} max={caps.zoom.max} step={caps.zoom.step} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} className="flex-1" aria-label="Zoom" /></label>}
                </div>
              )}
              <div className="mt-2 flex justify-between items-center gap-2 flex-wrap">
                <button onClick={() => { stopCamera(); setManualEntry(true) }} className="text-sm text-primary-700 hover:text-primary-800 flex items-center gap-1"><Keyboard className="h-4 w-4" aria-hidden="true" /> Manual entry</button>
                <button onClick={() => photoRef.current?.click()} className="text-sm text-primary-700 hover:text-primary-800 flex items-center gap-1"><ImagePlus className="h-4 w-4" aria-hidden="true" /> Photo</button>
                <button onClick={stopCamera} className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm">Stop Scanning</button>
              </div>
            </div>
          )}
        </div>

        <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="sr-only" aria-label="Take or choose a photo of the barcode" />

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {lastScanned && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-5 w-5 text-green-700" aria-hidden="true" /><p className="text-sm font-medium text-green-900">Scanned</p></div>
            <p className="text-sm text-gray-700 font-mono break-all">{lastScanned}</p>
          </div>
        )}

        <button onClick={handleClose} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
      </div>
    </div>
  )
}

export default BarcodeScanner
