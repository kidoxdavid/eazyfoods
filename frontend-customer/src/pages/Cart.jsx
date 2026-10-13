import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useLocation } from '../contexts/LocationContext'
import { useSaveForLater } from '../contexts/SaveForLaterContext'
import { useToast } from '../contexts/ToastContext'
import { Minus, Plus, ArrowRightLeft } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { resolveImageUrl } from '../utils/imageUtils'
import ProductCard from '../components/ProductCard'
import Section from '../components/Section'
import api from '../services/api'

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart, addToCart } = useCart()
  const { saved, addToSaveForLater, removeFromSaveForLater, moveToCart } = useSaveForLater()
  const { success: showSuccessToast, info: showInfoToast, error: showErrorToast } = useToast()
  const navigate = useNavigate()
  const [compareData, setCompareData] = useState(null)
  const [upsellProducts, setUpsellProducts] = useState([])
  const { selectedCity } = useLocation()

  const handleSaveForLater = (item) => {
    addToSaveForLater(item, item.quantity)
    removeFromCart(item.id)
    showSuccessToast(`${item.name} saved for later`)
  }

  // Check if product items are from multiple stores (chef items don't have store_id)
  const getStoreIds = () => {
    const storeIds = cart.filter(item => item.store_id).map(item => item.store_id)
    return [...new Set(storeIds)]
  }

  const storeIds = getStoreIds()
  const hasMultipleStores = storeIds.length > 1
  const productOnlyCart = cart.filter(item => item.store_id && !item.chef_id)
  const canCompare = storeIds.length === 1 && productOnlyCart.length > 0

  useEffect(() => {
    if (!canCompare || !storeIds[0]) return
    const keywords = productOnlyCart.map(i => i.name).join(',').slice(0, 200)
    api.get('/customer/stores/compare', { params: { store_id: storeIds[0], keywords } })
      .then(r => {
        if (r.data?.alternate_store && (r.data?.similar_products?.length > 0 || r.data?.total >= 0)) setCompareData(r.data)
        else setCompareData(null)
      })
      .catch(() => setCompareData(null))
  }, [storeIds[0], canCompare, cart.length])

  const handleSwitchToCompareStore = () => {
    if (!compareData?.alternate_store || !compareData?.similar_products?.length) return
    clearCart()
    compareData.similar_products.forEach(p => {
      addToCart({ ...p, store_id: compareData.alternate_store.id }, p.quantity || 1, false)
    })
    showSuccessToast(`Switched to ${compareData.alternate_store.store_name || compareData.alternate_store.business_name}. Compare prices at checkout.`)
    setCompareData(null)
  }
  
  const handleUpdateQuantity = (itemId, newQuantity) => {
    const item = cart.find(i => i.id === itemId)
    updateQuantity(itemId, newQuantity)
    if (item) {
      if (newQuantity > item.quantity) {
        showSuccessToast(`${item.name} quantity increased`)
      } else {
        showInfoToast(`${item.name} quantity decreased`)
      }
    }
  }
  
  const handleRemoveFromCart = (itemId) => {
    const item = cart.find(i => i.id === itemId)
    removeFromCart(itemId)
    if (item) {
      showInfoToast(`${item.name} removed from cart`)
    }
  }
  
  const handleClearCart = () => {
    clearCart()
    showInfoToast('Cart cleared')
  }

  // Deals / upsell products (similar to Top Market Deals)
  useEffect(() => {
    const fetchUpsellProducts = async () => {
      try {
        const params = { discounted: true, limit: 5 }
        if (selectedCity && selectedCity !== 'All') {
          params.city = selectedCity
        }
        const res = await api.get('/customer/products', { params })
        const list = res.data?.products || res.data || []
        setUpsellProducts(Array.isArray(list) ? list.slice(0, 5) : [])
      } catch {
        setUpsellProducts([])
      }
    }

    fetchUpsellProducts()
  }, [selectedCity])

  const itemLink = (item) => (item.chef_id ? `/chefs/${item.chef_id}` : `/products/${item.id}`)
  const money = (n) => `$${Number(n).toFixed(2)}`
  const itemCount = cart.reduce((n, i) => n + i.quantity, 0)

  if (cart.length === 0) {
    return (
      <div>
        <PageBanner title="Your cart" subtitle="Nothing here yet." placement="cart_top_banner" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="font-display text-3xl text-ink-900">Your basket is empty</h2>
            <p className="mt-3 text-ink-600">Start with a few staples, or let EazyBot build a list from the dish you want to cook.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/groceries" className="btn-primary">Shop groceries</Link>
              <Link to="/meals" className="btn-secondary">Browse meals</Link>
            </div>
          </div>
          {saved.length > 0 && <SavedList saved={saved} addToCart={addToCart} moveToCart={moveToCart} removeFromSaveForLater={removeFromSaveForLater} itemLink={itemLink} showInfoToast={showInfoToast} money={money} className="mt-16" />}
          {upsellProducts.length > 0 && (
            <Section eyebrow="Offers" title="A few things on offer" to="/top-market-deals" scroll className="mt-16 !px-0">
              {upsellProducts.map((p) => <ProductCard key={p.id} product={p} variant="row" />)}
            </Section>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageBanner title="Your cart" subtitle={`${itemCount} ${itemCount === 1 ? 'item' : 'items'} ready for checkout`} placement="cart_top_banner" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-14 lg:px-8">
        <div className="lg:col-span-8">
          <div className="mb-2 flex items-center justify-between border-b border-paper-300 pb-3">
            <h2 className="eyebrow !text-ink-600">Items</h2>
            <button type="button" onClick={handleClearCart} className="text-sm text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">Clear cart</button>
          </div>

          <ul className="divide-y divide-paper-300">
            {cart.map((item) => (
              <li key={item.id} className="flex gap-4 py-6 sm:gap-6">
                <Link to={itemLink(item)} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-paper-200 sm:h-28 sm:w-28">
                  {item.image_url
                    ? <img src={resolveImageUrl(item.image_url)} alt={item.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    : <span className="flex h-full w-full items-center justify-center p-2 text-center font-display text-sm leading-snug text-ink-400">{item.name}</span>}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {(item.vendor?.business_name || item.store_name) && <p className="truncate text-[11px] font-medium uppercase tracking-eyebrow text-ink-500">{item.vendor?.business_name || item.store_name}</p>}
                      <Link to={itemLink(item)} className="mt-0.5 line-clamp-2 text-base font-medium text-ink-900 hover:underline hover:decoration-ink-300 hover:underline-offset-4">{item.name}</Link>
                      <p className="mt-1 text-sm text-ink-600">{money(item.price)} each</p>
                    </div>
                    <p className="price shrink-0 text-base">{money(item.price * item.quantity)}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div className="flex items-center rounded-md border border-ink-900">
                      <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center hover:bg-ink-100"><Minus className="h-4 w-4" /></button>
                      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{item.quantity}</span>
                      <button type="button" aria-label={`Increase quantity of ${item.name}`} onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center hover:bg-ink-100"><Plus className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <button type="button" onClick={() => handleSaveForLater(item)} className="text-ink-700 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">Save for later</button>
                      <button type="button" onClick={() => handleRemoveFromCart(item.id)} className="text-ink-700 underline decoration-ink-300 underline-offset-4 hover:text-nude-700">Remove</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {compareData?.alternate_store && (
            <aside className="mt-8 rounded-lg border border-paper-300 bg-paper-200/60 p-5" aria-label="Compare stores">
              <h3 className="flex items-center gap-2 font-display text-xl text-ink-900"><ArrowRightLeft className="h-4 w-4 text-nude-600" /> Compare with another store</h3>
              <p className="mt-1 text-sm text-ink-600">Similar items at <strong className="text-ink-900">{compareData.alternate_store.store_name || compareData.alternate_store.business_name}</strong> in the same city:</p>
              <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto text-sm">
                {compareData.similar_products.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3"><span className="truncate text-ink-700">{p.name}</span><span className="shrink-0 font-medium tabular-nums">{money(p.price)}</span></li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-paper-300 pt-4">
                <span className="font-semibold text-ink-900">Est. total {typeof compareData.total === 'number' ? money(compareData.total) : '$0.00'}</span>
                <button type="button" onClick={handleSwitchToCompareStore} className="btn-secondary !px-4 !py-2">Switch to this store</button>
              </div>
            </aside>
          )}

          {saved.length > 0 && <SavedList saved={saved} addToCart={addToCart} moveToCart={moveToCart} removeFromSaveForLater={removeFromSaveForLater} itemLink={itemLink} showInfoToast={showInfoToast} money={money} className="mt-14" />}
        </div>

        <aside className="mt-12 lg:col-span-4 lg:mt-0" aria-label="Order summary">
          <div className="rounded-lg border border-paper-300 bg-white p-6 lg:sticky lg:top-32">
            <h2 className="font-display text-2xl text-ink-900">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</dt><dd className="font-medium tabular-nums">{money(getCartTotal())}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Delivery</dt><dd className="text-ink-600">Calculated at checkout</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Tax</dt><dd className="text-ink-600">Calculated at checkout</dd></div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-paper-300 pt-5">
              <span className="font-medium text-ink-900">Estimated total</span>
              <span className="price text-2xl">{money(getCartTotal())}</span>
            </div>
            {hasMultipleStores && (
              <p role="alert" className="mt-5 rounded-md border border-nude-200 bg-nude-50 p-3 text-sm text-nude-800">
                Your cart has items from more than one store. Please order from one store at a time: remove or save items from the other store(s) to continue.
              </p>
            )}
            <button
              type="button"
              onClick={() => { if (hasMultipleStores) { showErrorToast('Please order from one store at a time'); return } navigate('/checkout') }}
              disabled={hasMultipleStores}
              className="btn-primary mt-6 w-full !py-3.5 !text-base"
            >
              Continue to checkout
            </button>
            <Link to="/groceries" className="mt-4 block text-center text-sm text-ink-700 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">Keep shopping</Link>
            <p className="mt-5 border-t border-paper-300 pt-4 text-xs leading-relaxed text-ink-500">Final prices, delivery fees and taxes are confirmed by the store at checkout.</p>
          </div>
        </aside>
      </div>

      {upsellProducts.length > 0 && (
        <Section eyebrow="Offers" title="Add something on offer" to="/top-market-deals" scroll className="mt-6 pb-4">
          {upsellProducts.map((p) => <ProductCard key={p.id} product={p} variant="row" />)}
        </Section>
      )}
    </div>
  )
}

const SavedList = ({ saved, addToCart, moveToCart, removeFromSaveForLater, itemLink, showInfoToast, money, className = '' }) => (
  <section className={className} aria-label="Saved for later">
    <div className="mb-2 border-b border-paper-300 pb-3"><h2 className="eyebrow !text-ink-600">Saved for later ({saved.length})</h2></div>
    <ul className="divide-y divide-paper-300">
      {saved.map((item) => (
        <li key={item.id} className="flex items-center gap-4 py-4">
          <Link to={itemLink(item)} className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-paper-200">
            {item.image_url && <img src={resolveImageUrl(item.image_url)} alt={item.name} className="h-full w-full object-cover" />}
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={itemLink(item)} className="line-clamp-1 text-sm font-medium text-ink-900 hover:underline">{item.name}</Link>
            <p className="text-sm text-ink-600">{money(item.price)}</p>
          </div>
          <button type="button" onClick={() => moveToCart(item.id, addToCart)} className="btn-secondary !px-4 !py-1.5 !text-xs">Move to cart</button>
          <button type="button" onClick={() => { removeFromSaveForLater(item.id); showInfoToast('Removed from saved') }} className="text-sm text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">Remove</button>
        </li>
      ))}
    </ul>
  </section>
)

export default Cart
