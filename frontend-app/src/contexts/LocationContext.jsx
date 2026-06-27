import { createContext, useContext, useState, useEffect } from 'react'

const LocationContext = createContext(null)

const PROVINCES = [
  { label: 'All Provinces', value: '' },
  { label: 'Ontario', value: 'Ontario' },
  { label: 'British Columbia', value: 'British Columbia' },
  { label: 'Quebec', value: 'Quebec' },
  { label: 'Alberta', value: 'Alberta' },
  { label: 'Manitoba', value: 'Manitoba' },
  { label: 'Saskatchewan', value: 'Saskatchewan' },
  { label: 'Nova Scotia', value: 'Nova Scotia' },
  { label: 'New Brunswick', value: 'New Brunswick' },
]

export const CITIES_BY_PROVINCE = {
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor'],
  'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna', 'Abbotsford'],
  'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
  'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
  'Manitoba': ['Winnipeg', 'Brandon'],
  'Saskatchewan': ['Saskatoon', 'Regina'],
  'Nova Scotia': ['Halifax', 'Dartmouth'],
  'New Brunswick': ['Fredericton', 'Moncton', 'Saint John'],
}

export { PROVINCES }

export function LocationProvider({ children }) {
  const [selectedProvince, setSelectedProvince] = useState(
    () => localStorage.getItem('selectedProvince') || ''
  )
  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem('selectedCity') || ''
  )

  const selectProvince = (p) => {
    setSelectedProvince(p)
    setSelectedCity('')
    localStorage.setItem('selectedProvince', p)
    localStorage.setItem('selectedCity', '')
  }

  const selectCity = (c) => {
    setSelectedCity(c)
    localStorage.setItem('selectedCity', c)
  }

  const clearLocation = () => {
    setSelectedProvince('')
    setSelectedCity('')
    localStorage.removeItem('selectedProvince')
    localStorage.removeItem('selectedCity')
  }

  const locationLabel = selectedCity || selectedProvince || 'All Canada'

  return (
    <LocationContext.Provider value={{ selectedProvince, selectedCity, locationLabel, selectProvince, selectCity, clearLocation, PROVINCES, CITIES_BY_PROVINCE }}>
      {children}
    </LocationContext.Provider>
  )
}

export const useLocation = () => useContext(LocationContext)
