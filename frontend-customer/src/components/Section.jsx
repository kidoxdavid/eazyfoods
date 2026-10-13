import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/** Titled content block with an optional "See all" link. `scroll` lays children out as a swipeable row. */
const Section = ({ title, eyebrow, to, linkLabel = 'See all', scroll = false, children, className = '' }) => (
  <section className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-nude-700">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
    {scroll ? (
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">{children}</div>
    ) : (
      children
    )}
  </section>
)

export default Section
