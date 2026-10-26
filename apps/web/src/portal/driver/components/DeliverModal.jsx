import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import api from '../services/api'

/**
 * Proof of delivery: a photo, plus the 4-digit code the customer shows on their order page (or, if they cannot, a short reason).
 * onDone is called after the delivery has been recorded.
 */
const DeliverModal = ({ deliveryId, onClose, onDone }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [code, setCode] = useState('')
  const [noCode, setNoCode] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please choose an image (JPEG, PNG or WebP).'); return }
    if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setError(''); setFile(f)
    const r = new FileReader(); r.onload = () => setPreview(r.result); r.readAsDataURL(f)
  }

  const ready = file && (noCode ? reason.trim().length >= 5 : /^\d{4}$/.test(code.trim()))
  const confirm = async () => {
    setBusy(true); setError('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const up = await api.post('/uploads/delivery-proof', fd)
      await api.put(`/driver/deliveries/${deliveryId}/status`, { status: 'delivered', delivery_photo_url: up.data?.url, ...(noCode ? { bypass_reason: reason.trim() } : { code: code.trim() }) })
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
      onDone?.()
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Could not complete the delivery. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Proof of delivery">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Proof of delivery</h3>
          <button type="button" onClick={() => !busy && onClose()} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm" role="alert">{error}</div>}
        <p className="text-sm text-gray-600 mb-3">Take or upload a photo of the delivery at the customer&apos;s location.</p>
        {preview ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-4">
            <img src={preview} alt="Delivery proof" className="w-full h-44 object-contain" />
            <button type="button" onClick={() => { setFile(null); setPreview(null) }} className="absolute top-2 right-2 p-1.5 bg-red-700 text-white rounded-full hover:bg-red-600" aria-label="Remove photo"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 transition-colors mb-4" onClick={() => input.current?.click()}>
            <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} aria-label="Delivery photo" />
            <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Tap to take photo or choose image</p>
            <p className="text-xs text-gray-500 mt-1">JPEG, PNG or WebP, max 5MB</p>
          </div>
        )}
        {!noCode ? (
          <div className="mb-4">
            <label htmlFor="handover-code" className="block text-sm font-medium text-gray-700 mb-1">Customer&apos;s 4-digit code</label>
            <input id="handover-code" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="0000"
              className="w-full px-3 py-2 text-lg tracking-widest text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            <button type="button" onClick={() => setNoCode(true)} className="mt-2 text-xs text-primary-700 hover:underline">The customer cannot give me the code</button>
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="bypass-reason" className="block text-sm font-medium text-gray-700 mb-1">Why can&apos;t you enter the code?</label>
            <textarea id="bypass-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Left with the building concierge as agreed"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-500 mt-1">The team reviews every delivery completed without a code.</p>
            <button type="button" onClick={() => setNoCode(false)} className="mt-1 text-xs text-primary-700 hover:underline">Enter the code instead</button>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => !busy && onClose()} className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={confirm} disabled={!ready || busy} className="flex-1 py-2.5 px-4 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving…' : 'Confirm delivered'}</button>
        </div>
      </div>
    </div>
  )
}

export default DeliverModal
