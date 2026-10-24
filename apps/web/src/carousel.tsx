import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ProductArt } from './art';
import { IconChevron, IconChevronL } from './icons';
import type { Card } from './cards';
import { packLabel } from './api';
import { Motif, type SiteTheme } from './theme';
import { IconPause, IconPlay } from './icons';

export type Slide = { id: string; from: string; to: string; eyebrow: string; title: string; text: string; cta: { to: string; label: string }; art: Card[]; light?: boolean; image?: string | null; video?: string | null; motif?: SiteTheme['motif'] };

/** Looping muted banner video. It only plays while its slide is showing, never for people who asked for less motion or less data, and always has a pause button. */
function SlideVideo({ src, poster, active }: { src: string; poster?: string | null; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const calm = typeof matchMedia !== 'undefined' && (matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator as any).connection?.saveData);
  const [paused, setPaused] = useState(calm);
  useEffect(() => { const v = ref.current; if (!v) return; if (active && !paused) v.play().catch(() => setPaused(true)); else v.pause(); }, [active, paused]);
  if (failed) return null;
  return (
    <>
      <video ref={ref} className="hero-video" src={src} poster={poster ?? undefined} muted loop playsInline preload={calm ? 'none' : 'metadata'} aria-hidden="true" tabIndex={-1} onError={() => setFailed(true)} />
      <button type="button" className="hero-vctl" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play background video' : 'Pause background video'} tabIndex={active ? 0 : -1}>{paused ? <IconPlay width={16} height={16} /> : <IconPause width={16} height={16} />}</button>
    </>
  );
}

/** Hero carousel: scroll-snap (native swipe), arrows, dots, auto-advance that stops on hover/focus and for reduced-motion users. */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (n: number) => { const e = ref.current; if (!e) return; const k = (n + slides.length) % slides.length; e.scrollTo({ left: k * e.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); setI(k); };
  useEffect(() => {
    if (paused || slides.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => go(i + 1), 6500); return () => clearInterval(t);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => { const e = ref.current; if (e) setI(Math.round(e.scrollLeft / e.clientWidth)); };
  if (!slides.length) return null;
  return (
    <section className="hero-car" aria-roledescription="carousel" aria-label="Featured" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <ul className="hero-track" ref={ref} onScroll={onScroll} role="list">
        {slides.map((s, k) => (
          <li key={s.id} className={`hero-slide ${s.light ? 'light' : ''} ${s.video ? 'has-video' : ''}`} style={{ background: `linear-gradient(115deg, ${s.from}, ${s.to})` }} aria-roledescription="slide" aria-label={`${k + 1} of ${slides.length}`} aria-hidden={k !== i}>
            {s.video && <SlideVideo src={s.video} poster={s.image} active={k === i} />}
            {s.motif && <Motif kind={s.motif} />}
            <div className="hero-copy">
              <span className="hero-eyebrow">{s.eyebrow}</span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              <Link to={s.cta.to} className="btn cta lg" tabIndex={k === i ? 0 : -1}>{s.cta.label}</Link>
            </div>
            <div className="hero-art" aria-hidden="true">
              <span className="blob b1" /><span className="blob b2" />
              {s.image && <img className="hero-img" src={s.image} alt="" loading="lazy" />}
              {s.art.slice(0, 3).map((p, n) => <ProductArt key={p.slug} bare name={p.name} brand={p.brand} category={p.category_slug ?? p.category} size={packLabel(p)} className={`hp hp${n}`} />)}
            </div>
          </li>
        ))}
      </ul>
      {slides.length > 1 && <>
        <button className="hero-arrow l" aria-label="Previous slide" onClick={() => go(i - 1)}><IconChevronL /></button>
        <button className="hero-arrow r" aria-label="Next slide" onClick={() => go(i + 1)}><IconChevron /></button>
        <div className="hero-dots" role="tablist" aria-label="Choose slide">{slides.map((s, k) => <button key={s.id} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => go(k)} />)}</div>
      </>}
    </section>
  );
}
export const Section = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`block ${className}`}>{children}</div>;
