import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

/** Titled content block with an optional "See all" link. `scroll` lays children out as a swipeable row. */
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

  return (
  <section className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-nude-700">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
      {scroll && !(edge.start && edge.end) && (
        <div className="hidden items-center gap-1.5 sm:flex">
          <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label={`Scroll ${title} backward`} className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-primary-600 hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label={`Scroll ${title} forward`} className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-primary-600 hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      {to && (
        <Link to={to} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
      </div>
    </div>
    {scroll ? (
      <div ref={rowRef} onScroll={measure} tabIndex={0} aria-label={title} className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl">{children}</div>
    ) : (
      children
    )}
  </section>
  )
}

export default Section
