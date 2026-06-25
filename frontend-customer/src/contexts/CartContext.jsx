import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

const getStorageKey = (customerId) => (customerId ? `cart_${customerId}` : 'cart')

export const CartProvider = ({ children }) => {
  const { user, token } = useAuth()
  const customerId = user?.id ?? null
  const [cart, setCart] = useState([])
  const prevKeyRef = useRef(getStorageKey(customerId))
  const syncTimerRef = useRef(null)
  const isSyncingRef = useRef(false)

  // ── Persistence helpers ─────────────────────────────────────────────────

  const saveLocal = useCallback((items, cid) => {
    try {
      localStorage.setItem(getStorageKey(cid ?? customerId), JSON.stringify(items))
    } catch (e) {
      console.error('Cart local save failed:', e)
    }
  }, [customerId])

  const loadLocal = useCallback((cid) => {
    try {
      const raw = localStorage.getItem(getStorageKey(cid))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }, [])

  // Sync full cart to server, debounced. No-op when not logged in.
  const syncToServer = useCallback((items) => {
    if (!token || !customerId) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(async () => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true
      try {
        await api.post('/customer/cart/sync', { cart: items })
      } catch (e) {
        console.error('Cart server sync failed:', e)
      } finally {
        isSyncingRef.current = false
      }
    }, 800)
  }, [token, customerId])

  // ── Initial load on mount ───────────────────────────────────────────────

  useEffect(() => {
    const key = getStorageKey(customerId)
    try {
      const saved = localStorage.getItem(key)
      if (saved) setCart(JSON.parse(saved))
      prevKeyRef.current = key
    } catch (e) {
      console.error('Failed to load cart:', e)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login / logout: switch storage key, merge server + local ───────────

  useEffect(() => {
    const key = getStorageKey(customerId)
    if (prevKeyRef.current === key) return

    const prevCart = cart
    // Save current (guest) cart to old key before switching
    try {
      localStorage.setItem(prevKeyRef.current, JSON.stringify(prevCart))
    } catch {}

    prevKeyRef.current = key

    if (customerId && token) {
      // Logged in: fetch server cart and merge with local guest cart
      ;(async () => {
        let serverItems = []
        try {
          const res = await api.get('/customer/cart')
          serverItems = res.data?.cart ?? []
        } catch {}

        const localItems = loadLocal(customerId)

        // Merge: server is authoritative for existing items; local adds new ones
        const merged = [...serverItems]
        for (const localItem of [...prevCart, ...localItems]) {
          if (!merged.find((s) => s.id === localItem.id)) {
            merged.push(localItem)
          }
        }

        setCart(merged)
        saveLocal(merged, customerId)
        if (merged.length > 0) {
          try {
            await api.post('/customer/cart/sync', { cart: merged })
          } catch {}
        }
      })()
    } else {
      // Logged out: load guest cart from local storage
      setCart(loadLocal(null))
    }
  }, [customerId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to localStorage + server on every change ───────────────────

  useEffect(() => {
    saveLocal(cart, customerId)
    syncToServer(cart)
  }, [cart]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cart mutations ──────────────────────────────────────────────────────

  const addToCart = (productOrCuisine, quantity = 1) => {
    const itemId = productOrCuisine.id
    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId)
      if (existing) {
        return prev.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...prev, { ...productOrCuisine, quantity }]
    })
  }

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () =>
    cart.reduce((total, item) => total + item.price * item.quantity, 0)

  const getCartItemCount = () =>
    cart.reduce((count, item) => count + item.quantity, 0)

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
