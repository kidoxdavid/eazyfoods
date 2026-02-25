import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const SaveForLaterContext = createContext()

export const useSaveForLater = () => {
  const context = useContext(SaveForLaterContext)
  if (!context) {
    throw new Error('useSaveForLater must be used within a SaveForLaterProvider')
  }
  return context
}

const getStorageKey = (customerId) => (customerId ? `saveForLater_${customerId}` : 'saveForLater')

export const SaveForLaterProvider = ({ children }) => {
  const { user } = useAuth()
  const customerId = user?.id ?? null
  const [saved, setSaved] = useState([])
  const prevKeyRef = useRef(getStorageKey(customerId))

  // Initial load from storage (once on mount)
  useEffect(() => {
    const key = getStorageKey(customerId)
    try {
      const raw = localStorage.getItem(key)
      if (raw) setSaved(JSON.parse(raw))
      prevKeyRef.current = key
    } catch (e) {
      console.error('Failed to load save for later:', e)
    }
  }, [])

  // When login/logout: save current list to old key, load from new key
  useEffect(() => {
    const key = getStorageKey(customerId)
    if (prevKeyRef.current === key) return

    try {
      localStorage.setItem(prevKeyRef.current, JSON.stringify(saved))
      const raw = localStorage.getItem(key)
      setSaved(raw ? JSON.parse(raw) : [])
    } catch (e) {
      console.error('Save for later storage switch failed:', e)
    }
    prevKeyRef.current = key
  }, [customerId])

  useEffect(() => {
    const key = getStorageKey(customerId)
    try {
      localStorage.setItem(key, JSON.stringify(saved))
    } catch (e) {
      console.error('Failed to save for later:', e)
    }
  }, [saved, customerId])

  const addToSaveForLater = (productOrItem, quantity = 1) => {
    const item = typeof productOrItem === 'object' && productOrItem !== null
      ? { ...productOrItem, quantity: productOrItem.quantity ?? quantity }
      : null
    if (!item || !item.id) return
    setSaved((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) } : i
        )
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }]
    })
  }

  const removeFromSaveForLater = (id) => {
    setSaved((prev) => prev.filter((i) => i.id !== id))
  }

  const moveToCart = (id, addToCart) => {
    const item = saved.find((i) => i.id === id)
    if (!item || !addToCart) return
    addToCart(item, item.quantity || 1, false)
    removeFromSaveForLater(id)
  }

  return (
    <SaveForLaterContext.Provider
      value={{
        saved,
        addToSaveForLater,
        removeFromSaveForLater,
        moveToCart,
      }}
    >
      {children}
    </SaveForLaterContext.Provider>
  )
}
