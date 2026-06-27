import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

function getKey(userId) {
  return userId ? `favorites_${userId}` : 'favorites'
}

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { productIds: [], chefIds: [] }
    const d = JSON.parse(raw)
    return { productIds: d.productIds || [], chefIds: d.chefIds || d.chefCuisineIds || [] }
  } catch { return { productIds: [], chefIds: [] } }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const key = getKey(user?.id)
  const [data, setData] = useState(() => load(key))

  // Reload when user changes (login/logout)
  useEffect(() => { setData(load(getKey(user?.id))) }, [user?.id])

  const toggleProduct = (id) => {
    setData(prev => {
      const ids = prev.productIds.includes(String(id))
        ? prev.productIds.filter(x => x !== String(id))
        : [...prev.productIds, String(id)]
      const next = { ...prev, productIds: ids }
      save(getKey(user?.id), next)
      return next
    })
  }

  const toggleChef = (id) => {
    setData(prev => {
      const ids = prev.chefIds.includes(String(id))
        ? prev.chefIds.filter(x => x !== String(id))
        : [...prev.chefIds, String(id)]
      const next = { ...prev, chefIds: ids }
      save(getKey(user?.id), next)
      return next
    })
  }

  const isProductFav = (id) => data.productIds.includes(String(id))
  const isChefFav   = (id) => data.chefIds.includes(String(id))

  return (
    <FavoritesContext.Provider value={{ productIds: data.productIds, chefIds: data.chefIds, toggleProduct, toggleChef, isProductFav, isChefFav }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
