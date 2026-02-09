import { useState, useEffect, useRef } from 'react'
import { CheckCircle, CreditCard } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const HELCIM_SCRIPT_URL = 'https://secure.helcim.app/helcim-pay/services/start.js'
// When iframe is blocked (X-Frame-Options), open payment in a popup instead
const HELCIM_POPUP_BASE = 'https://secure.helcim.app/helcim-pay/checkout'

const HelcimPayment = ({ amount, token: tokenProp, onSuccess, onError, onPaymentReady, onCardReady }) => {
  const { token: authToken } = useAuth()
  const token = authToken ?? tokenProp ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null)

  const [error, setError] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [checkoutToken, setCheckoutToken] = useState(null)
  const [secretToken, setSecretToken] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [scriptReady, setScriptReady] = useState(false)
  const onCardReadyRef = useRef(onCardReady)
  const processPaymentRef = useRef(null)

  // Load HelcimPay.js script and wait for appendHelcimPayIframe to be available
  useEffect(() => {
    if (!checkoutToken) return
    if (typeof window.appendHelcimPayIframe === 'function') {
      setScriptReady(true)
      return
    }
    const existing = document.querySelector(`script[src="${HELCIM_SCRIPT_URL}"]`)
    if (existing) {
      const check = () => {
        if (typeof window.appendHelcimPayIframe === 'function') setScriptReady(true)
        else setTimeout(check, 200)
      }
      check()
      return
    }
    const script = document.createElement('script')
    script.src = HELCIM_SCRIPT_URL
    script.async = false
    script.onload = () => {
      const check = () => {
        if (typeof window.appendHelcimPayIframe === 'function') setScriptReady(true)
        else setTimeout(check, 100)
      }
      setTimeout(check, 100)
    }
    script.onerror = () => setError('Could not load payment window (blocked or 403). Use "Open payment in new tab" below, or disable ad blockers and refresh.')
    document.head.appendChild(script)
  }, [checkoutToken])

  useEffect(() => {
    onCardReadyRef.current = onCardReady
  }, [onCardReady])

  // Initialize: get HelcimPay.js checkout session (no card data is sent to our server)
  useEffect(() => {
    if (!amount || amount <= 0) return
    if (!token) {
      setError('Please log in to continue with payment.')
      return
    }

    const initPayment = async () => {
      try {
        setError(null)
        const response = await api.post('/customer/payments/create-payment-intent', {
          total_amount: amount,
          gateway: 'helcim'
        }, { headers: { Authorization: `Bearer ${token}` } })
        const ct = response.data.checkout_token || response.data.payment_token
        const st = response.data.secret_token
        if (ct) setCheckoutToken(ct)
        if (st) setSecretToken(st)
      } catch (err) {
        console.error('Failed to initialize payment:', err)
        const detail = err.response?.data?.detail || ''
        const errorMsg = err.userMessage || detail || 'Failed to initialize payment. Please try again.'
        setError(errorMsg)
        if (onError) onError(errorMsg)
      }
    }

    initPayment()
  }, [amount, token])

  // Card is "ready" when we have checkout token and Helcim script is loaded
  useEffect(() => {
    if (!onCardReadyRef.current) return
    onCardReadyRef.current(!!(checkoutToken && scriptReady))
  }, [checkoutToken, scriptReady])

  const processPayment = async () => {
    if (!checkoutToken || !secretToken) {
      return { success: false, error: 'Payment not initialized. Please refresh and try again.' }
    }

    // Wait up to 5s for Helcim script if not ready yet
    let wait = 0
    while (typeof window.appendHelcimPayIframe !== 'function' && wait < 50) {
      await new Promise(r => setTimeout(r, 100))
      wait++
    }
    if (typeof window.appendHelcimPayIframe !== 'function') {
      return {
        success: false,
        error: 'Payment window could not load. Try refreshing the page, or disable ad blockers for this site.'
      }
    }

    setProcessing(true)
    setError(null)
    setInfoMessage(null)

    return new Promise((resolve) => {
      const helcimPayJsKey = 'helcim-pay-js-' + checkoutToken
      let resolved = false
      let fallbackTimer = null

      const cleanup = () => {
        if (fallbackTimer) clearTimeout(fallbackTimer)
        window.removeEventListener('message', handleMessage)
      }

      const handleMessage = async (event) => {
        if (event.data?.eventName !== helcimPayJsKey) return
        setInfoMessage(null)

        const status = event.data.eventStatus
        const message = event.data.eventMessage

        if (status === 'HIDE') {
          if (!resolved) { resolved = true; cleanup(); setProcessing(false); resolve({ success: false, error: 'Payment was cancelled.' }) }
          return
        }

        if (status === 'ABORTED') {
          if (!resolved) {
            resolved = true
            cleanup()
            setProcessing(false)
            const errMsg = typeof message === 'string' ? message : (message?.message || 'Payment was declined.')
            setError(errMsg)
            resolve({ success: false, error: errMsg })
          }
          return
        }

        if (status === 'SUCCESS') {
          if (resolved) return
          resolved = true
          cleanup()
          try {
            const payload = typeof message === 'string' ? JSON.parse(message) : message
            const data = payload?.data || payload
            const hash = payload?.hash || data?.hash
            const rawData = data?.data || data

            if (!rawData || !hash) {
              setProcessing(false)
              resolve({ success: false, error: 'Invalid payment response.' })
              return
            }

            const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
            const response = await api.post('/customer/payments/validate-helcim-response', {
              rawDataResponse: rawData,
              checkoutToken,
              secretToken,
              hash
            }, { headers: authHeader })

            if (response.data.status === 'success' && response.data.transaction_id) {
              setProcessing(false)
              setPaymentComplete(true)
              const paymentData = { transaction_id: response.data.transaction_id, payment_method: 'helcim' }
              if (onSuccess) onSuccess(paymentData)
              resolve({ success: true, data: paymentData })
            } else {
              setProcessing(false)
              resolve({ success: false, error: response.data.message || 'Validation failed.' })
            }
          } catch (err) {
            setProcessing(false)
            const errMsg = err.userMessage || err.response?.data?.detail || 'Payment validation failed.'
            setError(errMsg)
            resolve({ success: false, error: errMsg })
          }
          return
        }
      }

      window.addEventListener('message', handleMessage)

      // If iframe is blocked (X-Frame-Options: sameorigin), we never get an event. Open payment in popup after 2.5s.
      fallbackTimer = setTimeout(() => {
        if (resolved) return
        fallbackTimer = null
        const popupUrl = `${HELCIM_POPUP_BASE}?checkoutToken=${encodeURIComponent(checkoutToken)}`
        const popup = window.open(popupUrl, 'helcim_pay', 'width=500,height=700,scrollbars=yes,resizable=yes')
        if (popup) {
          setError(null)
          setInfoMessage('Payment window opened in a new tab. Complete payment there; this page will update when done.')
        } else {
          setError('Popup blocked. Please allow popups for this site and click "Pay & Place Order" again, or try "Open payment in new tab" below.')
          setProcessing(false)
          resolve({ success: false, error: 'Popup blocked. Allow popups and try again.' })
        }
      }, 2500)

      // Small delay so UI updates before modal opens
      setTimeout(() => {
        try {
          window.appendHelcimPayIframe(checkoutToken)
        } catch (e) {
          console.error('Helcim appendHelcimPayIframe error:', e)
          if (!resolved) {
            resolved = true
            cleanup()
            setProcessing(false)
            resolve({ success: false, error: 'Could not open payment window. Please try again.' })
          }
        }
      }, 50)
    })
  }

  processPaymentRef.current = processPayment

  useEffect(() => {
    if (checkoutToken && onPaymentReady) {
      onPaymentReady(async () => {
        const fn = processPaymentRef.current
        if (!fn) return { success: false, error: 'Payment not initialized. Please refresh and try again.' }
        return fn()
      })
    }
  }, [checkoutToken, onPaymentReady])

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {checkoutToken ? (
        <>
          <div className="p-4 border border-gray-300 rounded-lg bg-white">
            <p className="text-sm text-gray-600 mb-3">
              You will enter your card details securely in the payment window. We never see or store your full card number.
            </p>
            {!scriptReady && (
              <p className="text-xs text-amber-600 flex items-center">Loading payment window…</p>
            )}
            {scriptReady && !paymentComplete && (
              <>
                <p className="text-xs text-gray-500 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Click &quot;Pay & Place Order&quot; below to open the secure payment window.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  If the payment window doesn’t appear (e.g. blocked on localhost),{' '}
                  <a
                    href={checkoutToken ? `${HELCIM_POPUP_BASE}?checkoutToken=${encodeURIComponent(checkoutToken)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    open payment in a new tab
                  </a>
                  , then return here.
                </p>
              </>
            )}
          </div>

          {infoMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">{infoMessage}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {processing && (
            <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-800 text-sm">Complete payment in the window, or close to cancel. If nothing appears, we’ll open the payment in a new tab shortly.</span>
            </div>
          )}

          {paymentComplete && (
            <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-green-800 text-sm font-semibold">Payment successful</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4 text-gray-500">Initializing secure payment...</div>
      )}
    </div>
  )
}

export default HelcimPayment
