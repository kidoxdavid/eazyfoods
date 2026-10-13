/**
 * Editorial page header: a small tracked label, a serif title and a quiet subtitle, closed by a hairline.
 * Used by every top-level page via PageBanner.
 */
const PageHeader = ({ eyebrow, title, subtitle, actions, children }) => (
  <header className="border-b border-paper-300">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:flex-row lg:items-end lg:justify-between lg:px-8">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink-900 sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  </header>
)

export default PageHeader
