import { createContext, useContext, useState, useEffect } from 'react'

const LocationContext = createContext()

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

export const LocationProvider = ({ children }) => {
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    const saved = localStorage.getItem('deliveryAddress')
    return saved ? JSON.parse(saved) : null
  })
  const [coordinates, setCoordinates] = useState(() => {
    const saved = localStorage.getItem('coordinates')
    return saved ? JSON.parse(saved) : null
  })
  const [selectedProvince, setSelectedProvince] = useState(() => {
    const saved = localStorage.getItem('selectedProvince')
    return saved || ''
  })
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem('selectedCity')
    return saved || 'All'
  })

  useEffect(() => {
    if (deliveryAddress) {
      localStorage.setItem('deliveryAddress', JSON.stringify(deliveryAddress))
    } else {
      localStorage.removeItem('deliveryAddress')
    }
  }, [deliveryAddress])

  useEffect(() => {
    if (coordinates) {
      localStorage.setItem('coordinates', JSON.stringify(coordinates))
    } else {
      localStorage.removeItem('coordinates')
    }
  }, [coordinates])

  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem('selectedCity', selectedCity)
    } else {
      localStorage.removeItem('selectedCity')
    }
  }, [selectedCity])

  useEffect(() => {
    if (selectedProvince) {
      localStorage.setItem('selectedProvince', selectedProvince)
    } else {
      localStorage.removeItem('selectedProvince')
    }
  }, [selectedProvince])

  const updateAddress = (address, coords = null) => {
    setDeliveryAddress(address)
    if (coords) {
      setCoordinates(coords)
    }
  }

  const updateCity = (city) => {
    setSelectedCity(city)
  }

  const updateProvince = (province) => {
    setSelectedProvince(province || '')
  }

  const value = {
    deliveryAddress,
    coordinates,
    selectedCity,
    selectedProvince,
    updateAddress,
    updateCity,
    updateProvince,
  }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

