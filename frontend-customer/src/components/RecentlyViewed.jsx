import { useRecentlyViewed } from '../contexts/RecentlyViewedContext'
import Section from './Section'
import ProductCard from './ProductCard'

const RecentlyViewed = ({ maxItems = 5, showTitle = true, onClear }) => {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed()
  if (recentlyViewed.length === 0) return null

  const clear = () => { clearRecentlyViewed(); onClear?.() }

  return (
    <div>
      {showTitle && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={clear} className="text-sm text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">Clear history</button>
        </div>
      )}
      <Section eyebrow="Pick up where you left off" title="Recently viewed" scroll className="!px-0 sm:!px-0 lg:!px-0">
        {recentlyViewed.slice(0, maxItems).map((p) => <ProductCard key={p.id} product={p} variant="row" />)}
      </Section>
    </div>
  )
}

export default RecentlyViewed
