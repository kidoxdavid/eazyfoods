import { Link } from 'react-router-dom'
import { Heart, Minus, Plus } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useToast } from '../contexts/ToastContext'
import { resolveImageUrl } from '../utils/imageUtils'

const money = (n) => `$${Number(n).toFixed(2)}`

/**
 * The one product card used across the storefront.
 * variant="row"  -> fixed width, for horizontal carousels
 * variant="grid" -> fills its grid cell
 */
const ProductCard = ({ product, variant = 'grid' }) => {
  const { cart, addToCart, updateQuantity } = useCart()
  const { productFavorites, toggleProductFavorite } = useFavorites()
  const toast = useToast()

  const img = resolveImageUrl(product.image_url || product.images?.[0])
  const onSale = product.discounted_price != null && Number(product.discounted_price) < Number(product.price)
  const now = onSale ? product.discounted_price : product.price
  const was = onSale ? product.price : Number(product.compare_at_price) > Number(product.price) ? product.compare_at_price : null
  const off = was ? Math.round(((was - now) / was) * 100) : 0
  const fav = productFavorites?.has?.(product.id)
  const soldOut = product.stock_quantity != null && Number(product.stock_quantity) <= 0
  const store = product.vendor?.business_name || product.store_name
  const unit = product.unit && product.unit !== 'piece' ? product.unit : null
  const inCart = cart.find((i) => i.id === product.id)

  const add = async (e) => {
    e.preventDefault()
    try {
      await addToCart({ ...product, quantity: 1 }, 1)
      toast?.success?.(`${product.name} added to your cart`)
    } catch {
      toast?.error?.('Could not add to cart')
    }
  }
  const step = (e, delta) => { e.preventDefault(); updateQuantity(product.id, (inCart?.quantity || 0) + delta) }

  return (
    <Link
      to={`/products/${product.id}`}
      className={`group relative flex flex-col ${variant === 'row' ? 'w-44 shrink-0 snap-start sm:w-52' : 'w-full'}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-paper-200">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.04] ${soldOut ? 'opacity-50' : ''}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paper-200 to-paper-300">
            <span className="px-4 text-center font-display text-lg leading-snug text-ink-400">{product.name}</span>
          </div>
        )}
        {off > 0 && !soldOut && (
          <span className="absolute left-2.5 top-2.5 rounded-sm bg-nude-600 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white">{off}% off</span>
        )}
        {soldOut && (
          <span className="absolute left-2.5 top-2.5 rounded-sm bg-ink-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-paper-100">Sold out</span>
        )}
        <button
          type="button"
          aria-label={fav ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
          aria-pressed={!!fav}
          onClick={(e) => { e.preventDefault(); toggleProductFavorite?.(product.id) }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-paper-100/90 text-ink-700 backdrop-blur transition hover:bg-white hover:text-nude-600"
        >
          <Heart className={`h-4 w-4 ${fav ? 'fill-nude-600 text-nude-600' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        {store && <p className="truncate text-[11px] font-medium uppercase tracking-eyebrow text-ink-500">{store}</p>}
        <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug text-ink-900 group-hover:underline group-hover:decoration-ink-300 group-hover:underline-offset-4">{product.name}</p>
        {unit && <p className="mt-0.5 text-xs text-ink-500">{unit}</p>}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="leading-none">
            <span className="price text-base">{money(now)}</span>
            {was && <span className="ml-2 text-xs text-ink-500 line-through">{money(was)}</span>}
          </div>
          {soldOut ? (
            <span className="text-xs font-medium text-ink-500">Unavailable</span>
          ) : inCart ? (
            <div className="flex items-center rounded-md border border-ink-900" onClick={(e) => e.preventDefault()}>
              <button type="button" aria-label={`Remove one ${product.name}`} onClick={(e) => step(e, -1)} className="flex h-8 w-8 items-center justify-center text-ink-900 hover:bg-ink-100"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{inCart.quantity}</span>
              <button type="button" aria-label={`Add one more ${product.name}`} onClick={(e) => step(e, 1)} className="flex h-8 w-8 items-center justify-center text-ink-900 hover:bg-ink-100"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button type="button" onClick={add} aria-label={`Add ${product.name} to cart`} className="inline-flex h-8 items-center gap-1 rounded-md border border-ink-900 px-3 text-xs font-semibold tracking-wide text-ink-900 transition hover:bg-ink-900 hover:text-paper-100">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
