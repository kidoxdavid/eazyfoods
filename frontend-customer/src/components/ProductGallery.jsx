import { useState } from 'react'
import { resolveImageUrl } from '../utils/imageUtils'

const toUrl = (img) => (typeof img === 'string' ? img : (img?.url ?? img?.image_url ?? img?.src ?? ''))

/** Main image plus thumbnails. Missing or broken images fall back to a typographic placeholder. */
const ProductGallery = ({ images, mainImage, name }) => {
  const list = [mainImage, ...(images || [])].map(toUrl).filter(Boolean).filter((u, i, a) => a.indexOf(u) === i)
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState({})
  const current = list[index]
  const ok = current && !broken[current]

  return (
    <div className={`grid gap-3 ${list.length > 1 ? 'md:grid-cols-[72px_1fr]' : ''}`}>
      {list.length > 1 && (
        <ul className="order-2 flex gap-2 md:order-1 md:flex-col" aria-label="Product images">
          {list.map((u, i) => (
            <li key={u}>
              <button type="button" onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`} aria-current={i === index} className={`block h-16 w-16 overflow-hidden rounded-md border-2 bg-paper-200 transition md:h-[72px] md:w-[72px] ${i === index ? 'border-ink-900' : 'border-transparent hover:border-ink-300'}`}>
                <img src={resolveImageUrl(u)} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken((b) => ({ ...b, [u]: true }))} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="order-1 aspect-square overflow-hidden rounded-lg bg-paper-200 md:order-2">
        {ok ? (
          <img src={resolveImageUrl(current)} alt={name} className="h-full w-full object-cover" onError={() => setBroken((b) => ({ ...b, [current]: true }))} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paper-200 to-paper-300 p-10 text-center font-display text-3xl leading-snug text-ink-400">{name}</div>
        )}
      </div>
    </div>
  )
}

export default ProductGallery
