import { useState } from 'react'
import { X, MapPin } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import { CANADA_PROVINCES, getCitiesForProvince } from '../constants/canadaLocations'

/** Modal to choose province then city; persists via LocationContext and reloads so listings refetch. */
const LocationPicker = ({ open, onClose }) => {
  const { selectedProvince, selectedCity, updateProvince, updateCity, updateAddress } = useLocation()
  const [province, setProvince] = useState(selectedProvince || '')
  if (!open) return null

  const apply = (prov, city) => {
    updateProvince(prov)
    updateCity(city || 'All')
    if (city && city !== 'All') updateAddress({ address: `${city}, ${prov}` }, { lat: 0, lng: 0 })
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose your location"
        className="w-full max-w-md animate-fade-up rounded-t-xl bg-paper-100 p-6 shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="eyebrow mb-1">Delivery area</p>
            <h2 className="font-display text-2xl font-medium text-ink-900">Where should we deliver?</h2>
            <p className="mt-1 text-sm text-ink-500">Pick a province, then your city, to see stores and chefs near you.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-ink-400 hover:bg-ink-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="label" htmlFor="loc-prov">Province</label>
        <select id="loc-prov" className="input mb-4" value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="">All of Canada</option>
          {CANADA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {province && (
          <>
            <label className="label" htmlFor="loc-city">City</label>
            <select
              id="loc-city"
              className="input mb-4"
              defaultValue={selectedProvince === province ? selectedCity : 'All'}
              onChange={(e) => apply(province, e.target.value)}
            >
              <option value="All">All cities in {province}</option>
              {getCitiesForProvince(province).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}

        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary flex-1" onClick={() => apply(province, 'All')}>
            <MapPin className="h-4 w-4" /> {province ? `Use ${province}` : 'Show all Canada'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationPicker
