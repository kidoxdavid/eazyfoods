/** Storefront theme rules: which theme is live today, and the colour options a store may pick. */

export type ThemeRow = { slug: string; status: 'auto' | 'on' | 'off'; starts_on: string | Date; ends_on: string | Date; repeats_yearly: boolean; priority: number };

const md = (m: number, d: number) => m * 100 + d;
const parts = (v: string | Date) => {
  const s = typeof v === 'string' ? v : v.toISOString();
  return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) };
};

/** Today's calendar date in Calgary, as YYYY-MM-DD. */
export const todayInCalgary = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Is `today` (YYYY-MM-DD) inside the theme's window? Yearly windows compare month and day only and may wrap over New Year. */
export function inWindow(t: Pick<ThemeRow, 'starts_on' | 'ends_on' | 'repeats_yearly'>, today: string): boolean {
  const s = parts(t.starts_on), e = parts(t.ends_on), n = parts(today);
  if (!t.repeats_yearly) {
    const key = (p: { y: number; m: number; d: number }) => p.y * 10000 + p.m * 100 + p.d;
    return key(n) >= key(s) && key(n) <= key(e);
  }
  const a = md(s.m, s.d), b = md(e.m, e.d), x = md(n.m, n.d);
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}

/** "on" forces a theme now; "auto" follows its dates; "off" never shows. Highest priority wins; forced beats scheduled. */
export function pickActive<T extends ThemeRow>(themes: T[], today: string): T | null {
  const live = themes.filter((t) => t.status === 'on' || (t.status === 'auto' && inWindow(t, today)));
  live.sort((a, b) => Number(b.status === 'on') - Number(a.status === 'on') || b.priority - a.priority);
  return live[0] ?? null;
}

export type Palette = { primary: string; deep: string; tint: string; glow: string; hero_from: string; hero_to: string };
export const HEX = /^#[0-9a-fA-F]{6}$/;

/** Store accent colours. Every one reads at 4.5:1 or better on white (primary, deep) and on the dark theme (glow). */
export const ACCENTS: Record<string, { label: string } & Pick<Palette, 'primary' | 'deep' | 'tint' | 'glow'>> = {
  green: { label: 'Forest green', primary: '#1f5b3a', deep: '#15412a', tint: '#dcefe2', glow: '#72c795' },
  terracotta: { label: 'Terracotta', primary: '#a3470f', deep: '#76320a', tint: '#fbe3d3', glow: '#f0a273' },
  indigo: { label: 'Indigo', primary: '#33409a', deep: '#242e72', tint: '#e1e5f8', glow: '#a3b0f5' },
  plum: { label: 'Plum', primary: '#7a2e5d', deep: '#57203f', tint: '#f5e1ee', glow: '#e3a0cc' },
  teal: { label: 'Teal', primary: '#0f6670', deep: '#0a4850', tint: '#d9eff1', glow: '#7fd3dc' },
  ochre: { label: 'Ochre', primary: '#8a5a00', deep: '#613f00', tint: '#faeccb', glow: '#ecc063' },
  crimson: { label: 'Crimson', primary: '#a3182b', deep: '#74101e', tint: '#fbe0e4', glow: '#f2a0ab' },
  charcoal: { label: 'Charcoal', primary: '#2f3a36', deep: '#1c2421', tint: '#e6ebe9', glow: '#b7c4bf' },
};
