import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { haptic } from '../services/haptics'

const CartContext = createContext(null)

const STORAGE_KEY = 'app_cart'

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const storeId   = items[0]?.store_id || null

  const addToCart = useCallback(async (product, qty = 1) => {
    await haptic('light')
    setItems(prev => {
      const key = String(product.id || product.product_id)
      const existing = prev.find(i => i.id === key)
      if (existing) {
        return prev.map(i => i.id === key ? { ...i, quantity: i.quantity + qty } : i)
      }
      return [...prev, {
        id:        key,
        product_id: key,
        name:      product.name || product.product_name,
        price:     parseFloat(product.price || product.unit_price || 0),
        image_url: product.image_url,
        store_id:  product.store_id,
        vendor_id: product.vendor_id,
        quantity:  qty,
      }]
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.id !== String(productId)))
  }, [])

  const updateQty = useCallback((productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setItems(prev => prev.map(i => i.id === String(productId) ? { ...i, quantity: qty } : i))
  }, [removeFromCart])

  const clearCart = useCallback(() => setItems([]), [])

  return (
    <CartContext.Provider value={{ items, cartCount, cartTotal, storeId, addToCart, removeFromCart, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
