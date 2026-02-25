import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

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
  const { user } = useAuth()
  const customerId = user?.id ?? null
  const [cart, setCart] = useState([])
  const prevKeyRef = useRef(getStorageKey(customerId))

  // Initial load from storage (once on mount)
  useEffect(() => {
    const key = getStorageKey(customerId)
    try {
      const savedCart = localStorage.getItem(key)
      if (savedCart) setCart(JSON.parse(savedCart))
      prevKeyRef.current = key
    } catch (e) {
      console.error('Failed to load cart:', e)
    }
  }, [])

  // When login/logout: save current cart to old key, load from new key so each user's cart is remembered
  useEffect(() => {
    const key = getStorageKey(customerId)
    if (prevKeyRef.current === key) return

    try {
      localStorage.setItem(prevKeyRef.current, JSON.stringify(cart))
      const saved = localStorage.getItem(key)
      setCart(saved ? JSON.parse(saved) : [])
    } catch (e) {
      console.error('Cart storage switch failed:', e)
    }
    prevKeyRef.current = key
  }, [customerId])

  useEffect(() => {
    const key = getStorageKey(customerId)
    try {
      localStorage.setItem(key, JSON.stringify(cart))
    } catch (e) {
      console.error('Failed to save cart:', e)
    }
  }, [cart, customerId])

  const addToCart = (productOrCuisine, quantity = 1, showToast = true) => {
    const itemId = productOrCuisine.id
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === itemId)
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...prevCart, { ...productOrCuisine, quantity }]
    })
  }

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

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

