import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const RecentlyViewedContext = createContext()

export const useRecentlyViewed = () => {
  const context = useContext(RecentlyViewedContext)
  if (!context) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider')
  }
  return context
}

export const RecentlyViewedProvider = ({ children }) => {
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const MAX_ITEMS = 10
  const isInitialized = useRef(false)

  useEffect(() => {
    // Load from localStorage only once
    if (!isInitialized.current) {
      const saved = localStorage.getItem('recentlyViewed')
      if (saved) {
        try {
          setRecentlyViewed(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to load recently viewed:', e)
        }
      }
      isInitialized.current = true
    }
  }, [])

  useEffect(() => {
    // Save to localStorage only if initialized
    if (isInitialized.current) {
      localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed))
    }
  }, [recentlyViewed])

  const addToRecentlyViewed = useCallback((product) => {
    if (!product || !product.id) return

    setRecentlyViewed((prev) => {
      // Check if product already exists with same ID
      const existingIndex = prev.findIndex((item) => item.id === product.id)
      if (existingIndex !== -1) {
        // Product already in list, don't update to prevent infinite loop
        return prev
      }
      
      // Remove if already exists (safety check)
      const filtered = prev.filter((item) => item.id !== product.id)
      // Add to beginning
      const updated = [{ ...product, viewedAt: new Date().toISOString() }, ...filtered]
      // Limit to MAX_ITEMS
      return updated.slice(0, MAX_ITEMS)
    })
  }, [])

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([])
  }, [])

  return (
    <RecentlyViewedContext.Provider
      value={{
        recentlyViewed,
        addToRecentlyViewed,
        clearRecentlyViewed,
      }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  )
}

