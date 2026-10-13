import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import api from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import { resolveImageUrl } from '../utils/imageUtils'

const PLACEMENTS = ['home_top_banner', 'home_banner'] // new + legacy placement names
const MIN_SECONDS = 4

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const isInternal = (link) => typeof link === 'string' && link.startsWith('/')

/**
 * Home promotional carousel. Slides are the configured ads (marketing portal) for the home banner placement,
 * filtered to the shopper's city by the API. Renders nothing when there are no ads, so it never takes space
 * for an empty banner. Autoplay pauses on hover/focus/hidden tab and is off for reduced-motion users.
 */
const AdCarousel = () => {
  const { selectedCity } = useLocation()
  const [ads, setAds] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())
  const [paused, setPaused] = useState(false)
  const trackRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const city = selectedCity && selectedCity !== 'All' ? { city: selectedCity } : {}
    Promise.all(
      PLACEMENTS.map((placement) =>
        api.get('/customer/marketing/ads', { params: { placement, status: 'active', approval_status: 'approved', ...city } })
          .then((r) => (Array.isArray(r.data) ? r.data : []))
          .catch(() => []),
      ),
    ).then((lists) => {
      if (cancelled) return
      const seen = new Set()
      const merged = lists.flat().filter((a) => a?.id && !seen.has(a.id) && seen.add(a.id) && (a.image_url || a.video_url || a.title))
      merged.sort((a, b) => (b.priority || 0) - (a.priority || 0))
      setAds(merged)
      setIndex(0)
    })
    return () => { cancelled = true }
  }, [selectedCity])

  const goTo = useCallback((i) => {
    const track = trackRef.current
    if (!track || !ads.length) return
    const next = (i + ads.length) % ads.length
    track.scrollTo({ left: next * track.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    setIndex(next)
  }, [ads.length])

  // Keep the index in sync when the shopper swipes or scrolls the track
  const onScroll = () => {
    const track = trackRef.current
    if (!track || !track.clientWidth) return
    const i = Math.round(track.scrollLeft / track.clientWidth)
    if (i !== index) setIndex(i)
  }

  // Autoplay: uses the current ad's configured duration
  useEffect(() => {
    if (ads.length < 2 || !playing || paused) return
    const seconds = Math.max(MIN_SECONDS, Number(ads[index]?.slideshow_duration) || 5)
    const timer = setTimeout(() => goTo(index + 1), seconds * 1000)
    return () => clearTimeout(timer)
  }, [ads, index, playing, paused, goTo])

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (!ads.length) return null

  const trackClick = (ad) => api.post(`/customer/marketing/ads/${ad.id}/click`).catch(() => {})

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1) }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1) }
      }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-primary-900 shadow-soft">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
          aria-live={playing && !paused ? 'off' : 'polite'}
        >
          {ads.map((ad, i) => {
            const img = ad.image_url ? resolveImageUrl(ad.image_url) : null
            const video = ad.video_url ? resolveImageUrl(ad.video_url) : null
            const cta = ad.cta_text && ad.cta_link
            const Cta = isInternal(ad.cta_link) ? Link : 'a'
            const ctaProps = isInternal(ad.cta_link) ? { to: ad.cta_link } : { href: ad.cta_link, target: '_blank', rel: 'noopener noreferrer' }
            return (
              <div
                key={ad.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${ads.length}`}
                aria-hidden={i !== index}
                className="relative grid min-h-[220px] w-full shrink-0 snap-center grid-cols-1 items-center sm:min-h-[260px] md:grid-cols-2"
              >
                {(img || video) && (
                  <div className="absolute inset-0 md:left-1/3" aria-hidden="true">
                    {video
                      ? <video src={video} poster={img || undefined} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                      : <img src={img} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/80 to-primary-900/10 md:via-primary-900/50" />
                  </div>
                )}
                <div className="relative z-10 max-w-xl px-6 py-8 text-white sm:pl-16 sm:pr-10 md:py-10">
                  {ad.title && <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{ad.title}</h2>}
                  {ad.description && <p className="mt-2 line-clamp-3 text-sm text-white/85 sm:text-base">{ad.description}</p>}
                  {cta && (
                    <Cta {...ctaProps} onClick={() => trackClick(ad)} tabIndex={i === index ? 0 : -1} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary-900 shadow-soft transition hover:shadow-lift">
                      {ad.cta_text}
                    </Cta>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {ads.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous promotion" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-soft transition hover:bg-white sm:flex">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label="Next promotion" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-soft transition hover:bg-white sm:flex">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur">
              {ads.map((ad, i) => (
                <button key={ad.id} type="button" onClick={() => goTo(i)} aria-label={`Go to promotion ${i + 1}`} aria-current={i === index} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`} />
              ))}
              <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause automatic rotation' : 'Start automatic rotation'} className="ml-1 text-white/90 hover:text-white">
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default AdCarousel
