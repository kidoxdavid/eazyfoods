import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, MapPin, Clock, DollarSign, Plus, Minus, ShoppingCart, Phone, Heart, Loader2, ChefHat } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { resolveImg } from '../services/imageUtils'

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

export default function ChefDetailScreen() {
  const { chefId } = useParams()
  const navigate   = useNavigate()
  const { addToCart } = useCart()
  const { token }  = useAuth()
  const { success, error: showError } = useToast()
  const [chef, setChef]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState({})
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    api.get(`/customer/chefs/${chefId}`)
      .then(r => { setChef(r.data); setSaved(r.data?.is_saved || false) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [chefId])

  const handleSave = async () => {
    if (!token) { navigate('/login'); return }
    try {
      if (saved) { await api.delete(`/customer/saved-chefs/${chefId}`); setSaved(false) }
      else        { await api.post(`/customer/saved-chefs/${chefId}`);   setSaved(true)  }
    } catch (_) {}
  }

  const setQty = (id, val) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }))

  const handleAddCuisine = async (cuisine) => {
    const qty = quantities[cuisine.id] || 1
    const product = {
      id: cuisine.id,
      product_id: cuisine.id,
      name: cuisine.name,
      price: parseFloat(cuisine.price || 0),
      image_url: cuisine.image_url || chef?.profile_image,
      chef_id: chefId,
    }
    await addToCart(product, qty)
    success(`${cuisine.name} added to cart!`)
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
    </div>
  )

  if (!chef) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <ChefHat className="h-12 w-12 text-gray-300" />
      <p className="text-gray-500">Chef not found</p>
      <button onClick={() => navigate(-1)} className="text-primary-600 font-semibold">Go back</button>
    </div>
  )

  const img = resolveImg(chef.profile_image || chef.image_url)
  const activeCuisines = (chef.cuisine_offerings || []).filter(c => c.status === 'active')

  return (
    <div className="h-full flex flex-col pt-safe screen-enter">
      <AppHeader title="" back right={
        <button onClick={handleSave} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center press-scale">
          <Heart className={`h-5 w-5 ${saved ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
        </button>
      } />

      <div className="flex-1 scroll-content mb-tab">
        {/* Hero */}
        <div className="relative h-52 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
          {img
            ? <img src={img} alt={chef.chef_name || chef.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl">👨‍🍳</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white font-bold text-xl leading-tight">{chef.chef_name || chef.name || chef.business_name}</p>
            <p className="text-white/80 text-sm">{chef.cuisine_type || 'Chef'}</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {chef.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                {parseFloat(chef.rating).toFixed(1)} ({chef.review_count || 0} reviews)
              </span>
            )}
            {chef.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary-500" />{chef.city}</span>}
            {chef.min_order_amount > 0 && (
              <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-primary-500" />Min. ${parseFloat(chef.min_order_amount).toFixed(0)}</span>
            )}
            {chef.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-primary-500" />{chef.phone}</span>}
          </div>

          {chef.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{chef.bio}</p>}

          {/* Availability */}
          {chef.availability && typeof chef.availability === 'object' && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Availability</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(chef.availability).map(([day, info]) => (
                  <span key={day}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      info?.available ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                    {DAY_LABELS[day] || day}
                    {info?.available && info?.hours ? ` ${info.hours}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gallery */}
        {chef.gallery?.length > 0 && (
          <div className="px-4 pt-5">
            <p className="text-sm font-bold text-gray-900 mb-2">Gallery</p>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {chef.gallery.map((img2, i) => (
                <div key={i} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                  <img src={resolveImg(img2)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuisine offerings */}
        {activeCuisines.length > 0 && (
          <div className="px-4 pt-5 pb-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Menu ({activeCuisines.length} items)</p>
            <div className="space-y-3">
              {activeCuisines.map(cuisine => {
                const cImg = resolveImg(cuisine.image_url || chef.profile_image)
                const qty = quantities[cuisine.id] || 1
                return (
                  <div key={cuisine.id} className="bg-white rounded-2xl p-3 shadow-sm flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      {cImg
                        ? <img src={cImg} alt={cuisine.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{cuisine.name}</p>
                      {cuisine.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cuisine.description}</p>}
                      <p className="text-primary-700 font-bold text-sm mt-1">${parseFloat(cuisine.price || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center bg-gray-100 rounded-lg">
                        <button onClick={() => setQty(cuisine.id, qty - 1)} className="w-7 h-7 flex items-center justify-center press-scale">
                          <Minus className="h-3 w-3 text-gray-600" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{qty}</span>
                        <button onClick={() => setQty(cuisine.id, qty + 1)} className="w-7 h-7 flex items-center justify-center press-scale">
                          <Plus className="h-3 w-3 text-gray-600" />
                        </button>
                      </div>
                      <button onClick={() => handleAddCuisine(cuisine)}
                        className="bg-primary-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg press-scale flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" /> Add
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeCuisines.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 px-6">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm">No menu items available yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
