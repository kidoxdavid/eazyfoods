import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from './hooks';

export type Palette = { primary: string; deep: string; tint: string; glow: string; hero_from: string; hero_to: string };
export type SiteTheme = {
  slug: string; name: string; kind: string; emoji: string; motif: 'none' | 'confetti' | 'snow' | 'leaves' | 'stars'; palette: Palette;
  headline: string; subtitle: string; cta_label: string; cta_link: string; banner_text: string; preview?: boolean;
};
type Ctx = { theme: SiteTheme | null; loading: boolean };
const C = createContext<Ctx>({ theme: null, loading: false });
export const useSiteTheme = () => useContext(C);

const PORTALS = /^\/(admin|vendor|driver|marketing)(\/|$)/;

/** CSS that re-colours the shop (never the staff portals, which keep their own colours). Palettes are validated server-side as #rrggbb. */
export const paletteCss = (p: Pick<Palette, 'primary' | 'deep' | 'tint' | 'glow'>, scope = ':root') =>
  `${scope}{--green:${p.primary};--green-2:${p.deep};--green-bg:${p.tint}${scope === ':root' ? `;--hdr:color-mix(in srgb, ${p.deep} 90%, #000);--hdr-2:${p.deep};--hdr-3:color-mix(in srgb, ${p.deep} 75%, #000)` : ''}}` +
  `@media (prefers-color-scheme: dark){${scope}{--green:${p.glow};--green-2:${p.glow};--green-bg:color-mix(in srgb, ${p.glow} 16%, #101812)}}`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const preview = new URLSearchParams(loc.search).get('preview_theme');
  const { data, loading } = useApi<{ theme: SiteTheme | null }>(`/theme/active${preview ? `?preview=${encodeURIComponent(preview)}` : ''}`);
  const portal = PORTALS.test(loc.pathname);
  const theme = data?.theme ?? null;
  useEffect(() => {
    let el = document.getElementById('site-theme') as HTMLStyleElement | null;
    if (!theme || portal) { el?.remove(); return; }
    if (!el) { el = document.createElement('style'); el.id = 'site-theme'; document.head.appendChild(el); }
    el.textContent = paletteCss(theme.palette);
    return () => { document.getElementById('site-theme')?.remove(); };
  }, [theme, portal]);
  const value = useMemo(() => ({ theme: portal ? null : theme, loading }), [theme, portal, loading]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

const MOTIF: Record<string, string[]> = { snow: ['❄️', '✨', '❄️'], leaves: ['🍂', '🍁', '🍂'], stars: ['✨', '⭐', '✨'], confetti: ['🎉', '✨', '🎊'], none: [] };
/** Decorative floating symbols behind hero text. Hidden from assistive tech; does not animate for reduced-motion users. */
export function Motif({ kind }: { kind: SiteTheme['motif'] }) {
  const s = MOTIF[kind] ?? [];
  if (!s.length) return null;
  return <span className="motif" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${(i * 11 + 4) % 96}%`, animationDelay: `${(i * 0.9) % 6}s`, animationDuration: `${9 + (i % 4) * 2}s` }}>{s[i % s.length]}</i>)}</span>;
}
