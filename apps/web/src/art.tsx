import { useState, type ReactNode } from 'react';
import { useId, type CSSProperties } from 'react';

/**
 * Illustrated pack shots. We have no store photography yet, so each product is drawn as the kind of package it
 * actually comes in (bag, jar, pouch, tin, bottle, box, frozen bag, fresh crate), labelled with its real name,
 * brand and size. They are illustrations, not photos, and are replaced automatically by a store's real photo.
 */
type Kind = 'bag' | 'jar' | 'pouch' | 'tin' | 'frozen' | 'snack' | 'bottle' | 'box' | 'fresh' | 'bowl';

const RULES: [RegExp, Kind][] = [
  [/frozen/, 'frozen'], [/injera/, 'bag'], [/fresh|okra|plantains \(|yam|peppers|leaves|produce/, 'fresh'],
  [/sardine|tomato paste|tin\b|canned/, 'tin'], [/oil\b|drink|concentrate|bottle|juice/, 'bottle'], [/shea|butter|preserved|relish|harissa|sauce|paste|jar|jarred/, 'jar'],
  [/tea|porridge|cereal|mix\b|couscous|box/, 'box'], [/chips|chin chin|snack|biltong/, 'snack'],
  [/flour|rice|garri|gari|meal|beans|grain|ogi|pap\b|fufu|teff|maize/, 'bag'], [/spice|seasoning|blend|ras el|suya|yaji|egusi|ogbono|hibiscus|dried|stockfish|catfish/, 'pouch'],
];
export function packKind(name: string, category?: string | null): Kind {
  if (category === 'dish') return 'bowl';
  const hay = `${name} ${category ?? ''}`.toLowerCase();
  for (const [re, k] of RULES) if (re.test(hay)) return k;
  return 'pouch';
}

const PALETTES: [string, string][] = [
  ['#1b6b45', '#ffc933'], ['#b5472b', '#ffd98a'], ['#254e8f', '#ffc933'], ['#7a2e5d', '#ffd3a6'], ['#c26a0c', '#fff0c8'],
  ['#0f766e', '#ffd166'], ['#8c2f39', '#f9e0b4'], ['#3d5a40', '#f0c75e'], ['#5b3a8c', '#ffd98a'], ['#a3470f', '#ffe3a3'],
];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return `#${[r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
};

function wrap(text: string, max: number): string[] {
  const out: string[] = []; let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out.slice(0, 3);
}

function Label({ x, y, w, h, name, brand, size, ink, accent, light, dark }: { x: number; y: number; w: number; h: number; name: string; brand?: string | null; size?: string; ink: string; accent: string; light: string; dark: string }) {
  const main = name.replace(/\s*\(.*\)\s*/g, '').trim() || name;
  const sub = /\((.*)\)/.exec(name)?.[1];
  const lines = wrap(main, Math.max(6, Math.floor(w / 8.2)));
  const longest = Math.max(...lines.map((l) => l.length));
  const top = y + (brand ? 24 : 12), bottom = y + h - (size ? 24 : 10), avail = bottom - top;
  const fs = Math.max(8, Math.min(21, (w - 10) / (0.6 * Math.max(longest, 5)), avail / (lines.length * 1.08 + (sub ? 0.95 : 0))));
  const block = lines.length * fs * 1.08 + (sub ? fs * 0.95 : 0);
  const cx = x + w / 2;
  const y0 = top + (avail - block) / 2 + fs * 0.82;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={light} />
      <rect x={x} y={y} width={w} height={5} rx={2} fill={accent} />
      {brand && <text x={cx} y={y + 17} textAnchor="middle" fontSize={7.5} fontWeight={800} letterSpacing={1} fill={dark} style={{ textTransform: 'uppercase' }}>{brand.length > 14 ? brand.slice(0, 13) + '…' : brand}</text>}
      {lines.map((l, i) => <text key={i} x={cx} y={y0 + i * fs * 1.08} textAnchor="middle" fontSize={fs} fontWeight={800} fill={ink} style={{ letterSpacing: '-.01em' }}>{l}</text>)}
      {sub && <text x={cx} y={y0 + lines.length * fs * 1.08 - fs * 0.1} textAnchor="middle" fontSize={Math.min(9, fs * 0.8)} fontWeight={600} fill={ink} opacity={0.72}>{sub.length > 18 ? sub.slice(0, 17) + '…' : sub}</text>}
      {size && <g><rect x={cx - 22} y={y + h - 19} width={44} height={13} rx={6.5} fill={accent} /><text x={cx} y={y + h - 9.6} textAnchor="middle" fontSize={8} fontWeight={800} fill={ink}>{size}</text></g>}
    </g>
  );
}

const zig = (x: number, y: number, w: number, n: number, amp: number) => {
  const step = w / n; let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += ` l${step / 2} ${amp} l${step / 2} ${-amp}`;
  return d;
};

export function ProductArt({ name, brand, category, size, bare = false, className = '', style }: { name: string; brand?: string | null; category?: string | null; size?: string | null; bare?: boolean; className?: string; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const h = hash(name);
  const [body, accent] = PALETTES[h % PALETTES.length];
  const kind = packKind(name, category);
  const dark = mix(body, '#000000', 0.28), lite = mix(body, '#ffffff', 0.28);
  const paper = '#fffaf0', ink = '#1b2a21';
  const tint = mix(body, '#fbf6ec', 0.86);
  const L = (x: number, y: number, w: number, hh: number) => <Label x={x} y={y} w={w} h={hh} name={name} brand={brand} size={size ?? undefined} ink={ink} accent={accent} light={paper} dark={dark} />;
  let shape: JSX.Element;
  switch (kind) {
    case 'bag':
      shape = (<g>
        <path d="M62 66 Q57 134 62 206 Q120 216 178 206 Q183 134 178 66 Z" fill={`url(#g${uid})`} />
        <path d={zig(58, 42, 124, 12, 7) + ' L182 64 L58 64 Z'} fill={dark} />
        <rect x={58} y={60} width={124} height={8} fill={mix(body, '#000000', 0.12)} />
        <path d="M70 70 Q66 134 70 200" stroke="#fff" strokeOpacity=".22" strokeWidth={5} fill="none" strokeLinecap="round" />
        {L(76, 98, 88, 96)}
      </g>); break;
    case 'frozen':
      shape = (<g>
        <path d="M62 66 Q57 134 62 206 Q120 216 178 206 Q183 134 178 66 Z" fill="#2f6fb5" />
        <path d={zig(58, 42, 124, 12, 7) + ' L182 64 L58 64 Z'} fill="#1d4f86" />
        <g stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.9} transform="translate(120 79)"><path d="M0 -9V9M-8 -4.5L8 4.5M-8 4.5L8 -4.5" /></g>
        <path d="M70 90 Q66 140 70 200" stroke="#fff" strokeOpacity=".28" strokeWidth={5} fill="none" strokeLinecap="round" />
        {L(76, 100, 88, 94)}
      </g>); break;
    case 'snack':
      shape = (<g>
        <path d="M68 62 Q50 134 68 206 L172 206 Q190 134 172 62 Z" fill={`url(#g${uid})`} />
        <path d={zig(64, 46, 112, 14, 6) + ' L176 64 L64 64 Z'} fill={dark} />
        <path d={zig(64, 200, 112, 14, 6) + ' L176 214 L64 214 Z'} fill={dark} />
        <path d="M76 72 Q62 134 76 196" stroke="#fff" strokeOpacity=".25" strokeWidth={6} fill="none" strokeLinecap="round" />
        {L(80, 94, 80, 96)}
      </g>); break;
    case 'pouch':
      shape = (<g>
        <path d="M70 56 L170 56 L178 200 Q120 218 62 200 Z" fill={`url(#g${uid})`} />
        <path d={zig(70, 56, 100, 12, 5) + ' L170 70 L70 70 Z'} fill={dark} />
        <circle cx={120} cy={63} r={2.2} fill={accent} />
        <path d="M76 82 L70 196" stroke="#fff" strokeOpacity=".22" strokeWidth={5} fill="none" strokeLinecap="round" />
        {L(80, 90, 80, 100)}
      </g>); break;
    case 'jar':
      shape = (<g>
        <rect x={86} y={44} width={68} height={20} rx={5} fill={accent} /><rect x={86} y={44} width={68} height={6} rx={3} fill="#fff" opacity=".35" />
        <path d="M92 64 H148 V76 Q176 84 176 110 V190 Q176 208 158 208 H82 Q64 208 64 190 V110 Q64 84 92 76 Z" fill={mix(body, '#ffffff', 0.78)} stroke={mix(body, '#000000', 0.1)} strokeOpacity=".4" />
        <path d="M66 112 H174 V190 Q174 206 158 206 H82 Q66 206 66 190 Z" fill={`url(#g${uid})`} />
        <path d="M74 92 Q70 130 74 186" stroke="#fff" strokeOpacity=".5" strokeWidth={5} fill="none" strokeLinecap="round" />
        {L(76, 114, 88, 82)}
      </g>); break;
    case 'tin':
      shape = (<g>
        <path d="M66 74 V192 Q66 206 120 206 Q174 206 174 192 V74 Z" fill={`url(#g${uid})`} />
        <ellipse cx={120} cy={74} rx={54} ry={12} fill="#d9dee2" /><ellipse cx={120} cy={74} rx={44} ry={8} fill="#eef1f3" />
        <rect x={66} y={86} width={108} height={96} fill={mix(body, '#000000', 0.04)} /><path d="M66 192 Q120 214 174 192" stroke="#fff" strokeOpacity=".2" fill="none" />
        <path d="M76 90 V186" stroke="#fff" strokeOpacity=".25" strokeWidth={5} strokeLinecap="round" />
        {L(76, 96, 88, 80)}
      </g>); break;
    case 'bottle':
      shape = (<g>
        <rect x={108} y={34} width={24} height={16} rx={3} fill={accent} />
        <path d="M110 50 H130 V74 Q160 84 160 112 V192 Q160 208 144 208 H96 Q80 208 80 192 V112 Q80 84 110 74 Z" fill={`url(#g${uid})`} />
        <path d="M90 100 Q86 140 90 192" stroke="#fff" strokeOpacity=".35" strokeWidth={5} fill="none" strokeLinecap="round" />
        {L(86, 118, 68, 76)}
      </g>); break;
    case 'bowl':
      shape = (<g>
        <path d="M44 128 H196 Q192 200 120 208 Q48 200 44 128 Z" fill={`url(#g${uid})`} />
        <ellipse cx={120} cy={128} rx={76} ry={13} fill={dark} />
        <path d="M58 126 Q70 82 120 78 Q170 82 182 126 Z" fill={accent} /><path d="M72 120 Q84 94 120 90" stroke="#fff" strokeOpacity=".35" strokeWidth={5} fill="none" strokeLinecap="round" />
        <circle cx={96} cy={106} r={6} fill={mix(accent, '#000000', 0.25)} /><circle cx={132} cy={98} r={7} fill={mix(accent, '#ffffff', 0.3)} /><circle cx={150} cy={112} r={5} fill={mix(accent, '#000000', 0.2)} />
        <path d="M96 66 Q88 52 98 40 M120 62 Q112 46 122 32 M144 66 Q136 52 146 40" stroke="#fff" strokeOpacity=".55" strokeWidth={4} fill="none" strokeLinecap="round" />
        {L(70, 148, 100, 46)}
      </g>); break;
    case 'box':
      shape = (<g>
        <path d="M64 58 H170 V206 H64 Z" fill={`url(#g${uid})`} />
        <path d="M170 58 L186 68 V198 L170 206 Z" fill={dark} /><path d="M64 58 L80 48 H186 L170 58 Z" fill={lite} />
        {L(72, 80, 90, 108)}
      </g>); break;
    default:
      shape = (<g>
        {[[-52, 'M0 0 Q-10 -46 -34 -56 Q-24 -22 0 0Z'], [-26, 'M0 0 Q-6 -58 -14 -72 Q4 -44 0 0Z'], [0, 'M0 0 Q-12 -64 0 -80 Q12 -64 0 0Z'], [26, 'M0 0 Q6 -58 14 -72 Q-4 -44 0 0Z'], [52, 'M0 0 Q10 -46 34 -56 Q24 -22 0 0Z']].map(([r, d], i) => (
          <path key={i} d={d as string} transform={`translate(120 178) rotate(${r})`} fill={i % 2 ? '#2e9c5f' : '#1f7a47'} />))}
        <rect x={70} y={172} width={100} height={38} rx={4} fill="#a8733c" /><rect x={70} y={172} width={100} height={8} rx={3} fill="#c18d52" />
        <path d="M70 188 H170 M70 200 H170" stroke="#7c5428" strokeWidth={1.5} />
        <rect x={82} y={184} width={76} height={22} rx={3} fill={paper} />
        <text x={120} y={199} textAnchor="middle" fontSize={Math.min(11, 70 / (0.6 * Math.max(name.replace(/\s*\(.*\)/, '').length, 6)))} fontWeight={800} fill={ink}>{name.replace(/\s*\(.*\)/, '').slice(0, 18)}</text>
      </g>);
  }
  return (
    <svg viewBox="0 0 240 240" className={`art ${className}`} style={style} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" x2="1"><stop offset="0" stopColor={lite} /><stop offset=".45" stopColor={body} /><stop offset="1" stopColor={dark} /></linearGradient>
        <radialGradient id={`b${uid}`} cx=".5" cy=".38" r=".75"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor={tint} /></radialGradient>
      </defs>
      {!bare && <rect width={240} height={240} fill={`url(#b${uid})`} />}
      <ellipse cx={120} cy={212} rx={64} ry={8} fill="#000" opacity={bare ? 0.14 : 0.12} />
      {shape}
    </svg>
  );
}

/** Round store badge: initials on a coloured disc. */
export function StoreMark({ name, size = 48 }: { name: string; size?: number }) {
  const [body, accent] = PALETTES[hash(name) % PALETTES.length];
  const initials = name.replace(/^Demo\s+/i, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return <span className="store-mark" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${body}, ${mix(body, '#000000', 0.3)})`, color: accent }} aria-hidden="true">{initials}</span>;
}

/** Abstract banner for stores without a cover photo: soft geometric shapes in the store's colours. */
export function StoreBanner({ name, className = '' }: { name: string; className?: string }) {
  const [body, accent] = PALETTES[hash(name) % PALETTES.length];
  const h = hash(name);
  return (
    <svg viewBox="0 0 600 160" className={`banner-art ${className}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="600" height="160" fill={body} />
      <circle cx={80 + (h % 120)} cy={150} r={110} fill={mix(body, '#000000', 0.18)} />
      <circle cx={480 - (h % 90)} cy={20} r={90} fill={mix(body, '#ffffff', 0.14)} />
      <circle cx={330} cy={170} r={70} fill={accent} opacity=".9" />
      <path d={`M0 ${110 + (h % 20)} Q150 60 300 ${110 + (h % 15)} T600 ${90 + (h % 25)} V160 H0Z`} fill={mix(body, '#000000', 0.3)} opacity=".55" />
    </svg>
  );
}

export function Stars({ value, count }: { value: number | null | undefined; count?: number }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars${count ? `, ${count} reviews` : ''}`}>
      <span className="stars-bg" aria-hidden="true">★★★★★</span><span className="stars-fg" style={{ width: `${pct}%` }} aria-hidden="true">★★★★★</span>
      {count != null && <span className="stars-n">({count})</span>}
    </span>
  );
}

/* ---------- Department and region illustrations (original flat art, no photos needed) ---------- */
const DEPT_HUE: Record<string, [string, string]> = {
  'rice-grains-flour': ['#c98a1b', '#e7b84a'], 'spices-seasonings-sauces': ['#b3261e', '#e0613a'], 'fresh-produce': ['#1f7a4d', '#52b36f'], frozen: ['#2c6aa8', '#6fb1e6'],
  'snacks-drinks': ['#7a3f98', '#c070d6'], 'soup-stew': ['#a3470f', '#e08a1e'], 'oils-butters': ['#8a7a12', '#d4c23a'], 'canned-jarred': ['#4a5a6a', '#8aa0b3'],
  breakfast: ['#c2631a', '#f0a24a'], 'dried-fish-meat': ['#7a4a2a', '#b98458'],
};
const GLYPH: Record<string, JSX.Element> = {
  'rice-grains-flour': <><path d="M16 54h68c0 20-15 30-34 30S16 74 16 54z" /><path d="M24 54c4-18 15-27 26-27s22 9 26 27z" opacity=".8" /><path d="M50 24c-6-6-5-12 0-14 5 2 6 8 0 14zM36 30c-8-2-10-8-7-12 5 0 9 5 7 12zM64 30c8-2 10-8 7-12-5 0-9 5-7 12z" /></>,
  'spices-seasonings-sauces': <><path d="M60 26c12 2 19 14 12 32-7 18-25 28-45 23 15-5 24-13 29-27 4-10 1-18 4-28z" /><path d="M58 24c1-7 8-10 14-7-4 1-6 4-6 8z" opacity=".85" /><circle cx="30" cy="30" r="4" opacity=".7" /><circle cx="40" cy="20" r="3" opacity=".7" /><circle cx="22" cy="42" r="3" opacity=".7" /></>,
  'fresh-produce': <><path d="M50 84C24 72 20 40 50 16c30 24 26 56 0 68z" /><path d="M50 30v52M50 52l-12-10M50 62l12-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".45" /></>,
  frozen: <><g stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none"><path d="M50 14v72M19 32l62 36M81 32L19 68" /><path d="M42 20l8 8 8-8M42 80l8-8 8 8M20 44l10 3-3 10M80 44l-10 3 3 10" strokeWidth="4" /></g></>,
  'snacks-drinks': <><path d="M28 36h44l-6 46H34z" /><path d="M54 36l7-18h14" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" /><ellipse cx="50" cy="36" rx="22" ry="5" opacity=".75" /><path d="M36 54h28" stroke="currentColor" strokeWidth="4" opacity=".35" /></>,
  'soup-stew': <><path d="M16 50h68v10c0 16-12 24-34 24S16 76 16 60z" /><path d="M10 50h8M82 50h8" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><path d="M36 38c-5-6 5-10 0-18M52 38c-5-6 5-10 0-18M68 38c-5-6 5-10 0-18" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85" /></>,
  'oils-butters': <><path d="M43 14h14v12l10 12v42a6 6 0 01-6 6H39a6 6 0 01-6-6V38l10-12z" /><path d="M50 50c-7 9-9 13-5 18 3 3 8 3 10 0 4-5 2-9-5-18z" stroke="currentColor" strokeWidth="2.5" fill="none" opacity=".5" /></>,
  'canned-jarred': <><path d="M28 30v44c0 7 10 12 22 12s22-5 22-12V30z" /><ellipse cx="50" cy="30" rx="22" ry="8" opacity=".75" /><path d="M28 46h44M28 62h44" stroke="currentColor" strokeWidth="3.5" opacity=".35" /></>,
  breakfast: <><path d="M18 58h64c0 17-14 26-32 26S18 75 18 58z" /><path d="M30 58c3-9 11-14 20-14s17 5 20 14z" opacity=".8" /><g stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M50 12v10M30 20l6 8M70 20l-6 8M20 36h9M71 36h9" /></g></>,
  'dried-fish-meat': <><path d="M14 50c14-20 36-22 50-8l18-14v44L64 58C50 72 28 70 14 50z" /><circle cx="34" cy="46" r="3.5" fill="currentColor" opacity=".55" /><path d="M46 40v20M54 38v22" stroke="currentColor" strokeWidth="3" opacity=".3" /></>,
};
const FALLBACK_GLYPH = <><path d="M20 44h60l-8 36H28z" /><path d="M34 44l10-22M66 44L56 22" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" /></>;

/** A round department badge: bold flat illustration on a colour, so every department looks finished even before photos exist. */
export function DeptArt({ slug }: { slug: string }) {
  const [a, b] = DEPT_HUE[slug] ?? ['#1f6b47', '#4aa275'];
  const id = `dg-${slug}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: '100%', height: '100%', margin: 0, display: 'block', color: a }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      <g fill="#fff">{GLYPH[slug] ?? FALLBACK_GLYPH}</g>
    </svg>
  );
}

const REGION_HUE: Record<string, [string, string]> = {
  'west-africa': ['#14503a', '#2e9a68'], 'east-africa': ['#b4511a', '#f0a24a'], 'central-africa': ['#0e5f57', '#34b3a0'], 'north-africa': ['#1d4f8c', '#69a8e6'], 'southern-africa': ['#5b2a6b', '#c0568a'],
};
const KENTE = ['#f2b632', '#c8302b', '#1c1c1c', '#2e9a68'];

/**
 * A wide banner for each region, drawn from what the region is known for:
 * West Africa: baobab and kente cloth. East Africa: Kilimanjaro and acacia savanna. Central Africa: Congo rainforest, river and Kuba cloth.
 * North Africa: the pyramids, dunes and palms. Southern Africa: Table Mountain and Ndebele beadwork.
 */
export function RegionArt({ slug, className = '' }: { slug: string; className?: string }) {
  const [a, b] = REGION_HUE[slug] ?? ['#1f6b47', '#4aa275'];
  const id = `rg-${slug}`;
  let motif: JSX.Element;
  switch (slug) {
    case 'west-africa': motif = (<>
      <circle cx="152" cy="34" r="15" fill="#ffd166" />
      <rect x="0" y="80" width="200" height="20" fill="#0d3a28" opacity=".55" />
      <g stroke="#0b3322" strokeWidth="4.5" strokeLinecap="round" fill="none"><path d="M88 50C78 45 70 40 62 37M90 50C85 42 82 35 79 30M100 50V27M110 50C115 42 118 35 121 30M112 50C122 45 130 40 138 37" /></g>
      <path d="M86 84C91 74 91 62 87 50h26c-4 12-4 24 1 34z" fill="#0b3322" />
      <g fill="#0b3322">{[[62, 35, 7], [79, 28, 7], [100, 24, 8], [121, 28, 7], [138, 35, 7], [72, 40, 5], [128, 40, 5]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
      {Array.from({ length: 20 }, (_, i) => <rect key={i} x={i * 10} y="88" width="10" height="12" fill={KENTE[i % 4]} />)}
      {Array.from({ length: 10 }, (_, i) => <path key={'k' + i} d={`M${i * 20 + 10} 90l4 4-4 4-4-4z`} fill="#fff" opacity=".85" />)}
    </>); break;
    case 'east-africa': motif = (<>
      <circle cx="40" cy="30" r="13" fill="#ffe08a" />
      <path d="M14 84L66 38l16-8 16 8 56 46z" fill="#6b3512" opacity=".8" />
      <path d="M66 38l16-8 16 8-7 6-7-5-6 7-6-6z" fill="#fff" opacity=".95" />
      <rect x="0" y="82" width="200" height="18" fill="#8a3d10" opacity=".6" />
      <path d="M156 86V66" stroke="#3a1a08" strokeWidth="4" strokeLinecap="round" /><path d="M156 68c-8-3-14-3-18 0M156 68c8-3 14-3 18 0" stroke="#3a1a08" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="156" cy="62" rx="26" ry="6" fill="#3a1a08" /><ellipse cx="140" cy="64" rx="12" ry="4" fill="#3a1a08" /><ellipse cx="172" cy="64" rx="12" ry="4" fill="#3a1a08" />
    </>); break;
    case 'central-africa': motif = (<>
      {Array.from({ length: 10 }, (_, i) => <g key={i}><rect x={i * 20} y="0" width="20" height="16" fill="#0a403a" opacity=".85" /><path d={`M${i * 20 + 10} 2l6 6-6 6-6-6z`} fill="#f2d49b" /><path d={`M${i * 20 + 4} 8h12M${i * 20 + 10} 2v12`} stroke="#0a403a" strokeWidth="1.5" /></g>)}
      <g fill="#0a403a">{[[14, 62, 18], [50, 56, 20], [90, 60, 18], [134, 54, 22], [176, 60, 20]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} opacity=".6" />)}</g>
      <g fill="#07342f">{[[0, 74, 20], [32, 70, 22], [70, 74, 20], [112, 72, 22], [150, 74, 20], [188, 72, 22]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
      <path d="M100 100C70 92 128 84 98 76S112 64 100 56" stroke="#a9ecff" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".9" />
    </>); break;
    case 'north-africa': motif = (<>
      <path d="M30 14a10 10 0 1 0 9 17a8 8 0 1 1-9-17z" fill="#fff" opacity=".95" />
      <path d="M22 84L68 34l46 50z" fill="#ecc97e" /><path d="M68 34l46 50H68z" fill="#000" opacity=".16" />
      <path d="M100 84l30-32 30 32z" fill="#dcb466" /><path d="M130 52l30 32h-30z" fill="#000" opacity=".16" />
      <path d="M146 84l16-17 16 17z" fill="#cfa557" />
      <path d="M0 84C36 76 76 90 118 83S180 77 200 84V100H0z" fill="#f3dca5" />
      <path d="M176 90C178 78 180 68 177 58" stroke="#12351f" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <g stroke="#12351f" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M177 58c-8-8-16-8-22-4M177 58c8-8 16-8 22-4M177 58c-4-10-2-16 2-20M177 58c-8-2-14 2-18 8" /></g>
    </>); break;
    case 'southern-africa': motif = (<>
      <circle cx="170" cy="26" r="11" fill="#ffd166" />
      <path d="M8 84L46 46l12-5h96l14 6 28 37z" fill="#3b1a49" />
      <path d="M46 42c10-8 28-7 38-3 12-8 36-4 46 3 10-4 22-3 26 2z" fill="#fff" opacity=".9" />
      <rect x="0" y="82" width="200" height="18" fill="#2d6fa8" opacity=".7" />
      <path d="M0 88c10-4 20 4 30 0s20-4 30 0 20 4 30 0 20-4 30 0 20 4 30 0 20-4 30 0 20 4 20 0" stroke="#fff" strokeWidth="1.8" fill="none" opacity=".6" />
      {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${i * 10} 100l5-9 5 9z`} fill={['#fff', '#f2b632', '#1fa5a0', '#e04f4f'][i % 4]} />)}
    </>); break;
    default: motif = <circle cx="100" cy="50" r="24" fill="rgba(255,255,255,.35)" />;
  }
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className} style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="200" height="100" fill={`url(#${id})`} />{motif}
    </svg>
  );
}

/** A picture that quietly falls back to its illustration if the file cannot be loaded (never a broken-image icon). */
export function SafeImg({ src, alt = '', fallback, ...rest }: { src: string; alt?: string; fallback: ReactNode } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [bad, setBad] = useState(false);
  return bad ? <>{fallback}</> : <img src={src} alt={alt} onError={() => setBad(true)} {...rest} />;
}
