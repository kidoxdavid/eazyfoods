import { createContext, useContext, useState, useEffect } from 'react'

const SaveForLaterContext = createContext()

export const useSaveForLater = () => {
  const context = useContext(SaveForLaterContext)
  if (!context) {
    throw new Error('useSaveForLater must be used within a SaveForLaterProvider')
  }
  return context
}

const STORAGE_KEY = 'saveForLater'

export const SaveForLaterProvider = ({ children }) => {
  const [saved, setSaved] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch (e) {
      console.error('Failed to load save for later:', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch (e) {
      console.error('Failed to save for later:', e)
    }
  }, [saved])

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
