import { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../services/api'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

// One cart per browser/device. (There are no accounts, so no login/logout merging.)
const STORAGE_KEY = 'eazy_cart_v1'

const readLocal = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(readLocal)
  const syncTimerRef = useRef(null)

  // Persist on every change: localStorage is the source of truth; the server copy is a debounced backup
  // (it is not read back, so a stale server cart can never resurrect items the shopper removed or ordered).
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)) } catch (e) { console.error('Cart local save failed:', e) }
    clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      api.post('/customer/cart/sync', { cart }).catch((e) => console.error('Cart server sync failed:', e))
    }, 800)
    return () => clearTimeout(syncTimerRef.current)
  }, [cart])

  const addToCart = (productOrCuisine, quantity = 1) => {
    const itemId = productOrCuisine.id
    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId)
      if (existing) {
        return prev.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + quantity } : item))
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
    setCart((prev) => prev.map((item) => (item.id === productId ? { ...item, quantity } : item)))
  }

  const clearCart = () => setCart([])

  const getCartTotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0)

  const getCartItemCount = () => cart.reduce((count, item) => count + item.quantity, 0)

  const value = { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartItemCount }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
