import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Titled content block with an optional "See all" link.
 * `scroll` lays children out as a swipeable row with paging arrows on desktop.
 */
const Section = ({ title, eyebrow, to, linkLabel = 'See all', scroll = false, children, className = '' }) => {
  const rowRef = useRef(null)
  const [edge, setEdge] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    if (!scroll) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [scroll, measure, children])

  const page = (dir) => {
    const el = rowRef.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' })
  }

  const arrow = 'flex h-9 w-9 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-800 transition hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-ink-200'

  return (
    <section className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-paper-300 pb-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {scroll && !(edge.start && edge.end) && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label={`Scroll ${title} backward`} className={arrow}><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label={`Scroll ${title} forward`} className={arrow}><ChevronRight className="h-5 w-5" /></button>
            </div>
          )}
          {to && (
            <Link to={to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900 underline decoration-ink-300 underline-offset-[6px] hover:decoration-ink-900">
              {linkLabel}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
      {scroll ? (
        <div ref={rowRef} onScroll={measure} tabIndex={0} aria-label={title} className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-md">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}

export default Section
