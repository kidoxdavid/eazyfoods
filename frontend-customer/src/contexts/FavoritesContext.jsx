import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext()

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

const getStorageKey = (customerId) => (customerId ? `favorites_${customerId}` : 'favorites')

const defaultData = () => ({ productIds: [], chefCuisineIds: [] })

// Legacy: guest used 'favorites' (array of product IDs) and 'favorites_chef_cuisines' (array of chef/cuisine IDs)
function readFromStorage(key) {
  const isGuestKey = key === 'favorites'
  try {
    const raw = localStorage.getItem(key)
    let productIds = []
    let chefCuisineIds = []
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        productIds = parsed
      } else if (parsed && typeof parsed === 'object') {
        productIds = Array.isArray(parsed.productIds) ? parsed.productIds : []
        chefCuisineIds = Array.isArray(parsed.chefCuisineIds) ? parsed.chefCuisineIds : []
      }
    }
    if (isGuestKey) {
      const rawChef = localStorage.getItem('favorites_chef_cuisines')
      if (rawChef) {
        try {
          const arr = JSON.parse(rawChef)
          if (Array.isArray(arr)) chefCuisineIds = arr
        } catch (_) {}
      }
    }
    return { productIds, chefCuisineIds }
  } catch (e) {
    console.error('Failed to read favorites:', e)
    return defaultData()
  }
}

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuth()
  const customerId = user?.id ?? null
  const [productFavorites, setProductFavorites] = useState(new Set())
  const [chefCuisineFavorites, setChefCuisineFavorites] = useState(new Set())
  const prevKeyRef = useRef(getStorageKey(customerId))

  const writeToStorage = (key, productIds, chefCuisineIds) => {
    try {
      localStorage.setItem(key, JSON.stringify({ productIds, chefCuisineIds }))
    } catch (e) {
      console.error('Failed to save favorites:', e)
    }
  }

  // Initial load (once on mount)
  useEffect(() => {
    const key = getStorageKey(customerId)
    const { productIds, chefCuisineIds } = readFromStorage(key)
    setProductFavorites(new Set(productIds))
    setChefCuisineFavorites(new Set(chefCuisineIds))
    prevKeyRef.current = key
  }, [])

  // When login/logout: save current to old key, load from new key
  useEffect(() => {
    const key = getStorageKey(customerId)
    if (prevKeyRef.current === key) return

    try {
      writeToStorage(
        prevKeyRef.current,
        Array.from(productFavorites),
        Array.from(chefCuisineFavorites)
      )
      const { productIds, chefCuisineIds } = readFromStorage(key)
      setProductFavorites(new Set(productIds))
      setChefCuisineFavorites(new Set(chefCuisineIds))
    } catch (e) {
      console.error('Favorites storage switch failed:', e)
    }
    prevKeyRef.current = key
  }, [customerId])

  useEffect(() => {
    const key = getStorageKey(customerId)
    writeToStorage(key, Array.from(productFavorites), Array.from(chefCuisineFavorites))
  }, [productFavorites, chefCuisineFavorites, customerId])

  const toggleProductFavorite = (productId) => {
    setProductFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const toggleChefCuisineFavorite = (id) => {
    setChefCuisineFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const value = {
    productFavorites,
    chefCuisineFavorites,
    toggleProductFavorite,
    toggleChefCuisineFavorite,
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
