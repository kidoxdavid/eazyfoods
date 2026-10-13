import { Link } from 'react-router-dom'
import { Heart, Plus } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useToast } from '../contexts/ToastContext'
import { resolveImageUrl } from '../utils/imageUtils'

const money = (n) => `$${Number(n).toFixed(2)}`

/** Compact product card used in carousels and grids on the new storefront. */
const ProductTile = ({ product }) => {
  const { addToCart } = useCart()
  const { productFavorites, toggleProductFavorite } = useFavorites()
  const toast = useToast()
  const img = resolveImageUrl(product.image_url || product.images?.[0])
  const onSale = product.discounted_price != null && Number(product.discounted_price) < Number(product.price)
  const now = onSale ? product.discounted_price : product.price
  const was = onSale ? product.price : product.compare_at_price > product.price ? product.compare_at_price : null
  const off = was ? Math.round(((was - now) / was) * 100) : 0
  const fav = productFavorites?.has?.(product.id)

  const add = async (e) => {
    e.preventDefault()
    try {
      await addToCart({ ...product, quantity: 1 }, 1)
      toast?.success?.(`${product.name} added to cart`)
    } catch {
      toast?.error?.('Could not add to cart')
    }
  }

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative flex w-44 sm:w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-square bg-cream-200">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🛒</div>
        )}
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-nude-600 px-2 py-0.5 text-[11px] font-bold text-white">-{off}%</span>
        )}
        <button
          type="button"
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
          onClick={(e) => { e.preventDefault(); toggleProductFavorite?.(product.id) }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-500 shadow-soft backdrop-blur transition hover:text-red-500"
        >
          <Heart className={`h-4 w-4 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{product.name}</p>
        {product.store_name && <p className="mt-0.5 truncate text-xs text-ink-400">{product.store_name}</p>}
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="leading-none">
            <span className="text-base font-bold text-ink-900">{money(now)}</span>
            {was && <span className="ml-1.5 text-xs text-ink-400 line-through">{money(was)}</span>}
          </div>
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={add}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-white shadow-soft transition hover:bg-primary-800 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Link>
  )
}

export default ProductTile
