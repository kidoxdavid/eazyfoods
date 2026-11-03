/**
 * Illustrated department icons, in the same style as the home-page faves: colourful, with depth, drawn to be noticed.
 * Each is a 64×64 picture; the tile behind it (see .dept-tile in store.css) gives the colour.
 */
const G = (c: React.ReactNode) => <svg viewBox="0 0 64 64" className="dept-ico" aria-hidden="true" focusable="false">{c}</svg>;
const SHADOW = <ellipse cx="32" cy="59" rx="20" ry="3" fill="#000" opacity=".12" />;

const ART: Record<string, React.ReactNode> = {
  /** A sack of rice and grain with a wheat ear. */
  'rice-grains-flour': <>
    {SHADOW}
    <path d="M17 24c-3 8-5 18-4 28a6 6 0 0 0 6 5h26a6 6 0 0 0 6-5c1-10-1-20-4-28z" fill="#e9c27a" />
    <path d="M17 24c-3 8-5 18-4 28" fill="none" stroke="#fff" strokeWidth="2" opacity=".35" strokeLinecap="round" />
    <path d="M22 17c2 3 6 5 10 5s8-2 10-5l-3-8H25z" fill="#d9a94e" /><path d="M24 20c5 3 11 3 16 0" stroke="#a9772a" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M32 22c-2 4-6 5-8 3M32 22c2 4 6 5 8 3" stroke="#a9772a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <rect x="21" y="32" width="22" height="14" rx="3" fill="#fff" /><text x="32" y="43" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#c8302b" fontFamily="system-ui, sans-serif">RICE</text>
    <g fill="#fff8e4"><ellipse cx="14" cy="55" rx="3" ry="1.6" /><ellipse cx="20" cy="58" rx="3" ry="1.6" transform="rotate(20 20 58)" /><ellipse cx="46" cy="58" rx="3" ry="1.6" transform="rotate(-15 46 58)" /></g>
    <path d="M52 8v30" stroke="#6b8f2a" strokeWidth="2" strokeLinecap="round" /><g fill="#f2c14e"><ellipse cx="49.5" cy="14" rx="2.6" ry="4.4" transform="rotate(-30 49.5 14)" /><ellipse cx="54.5" cy="14" rx="2.6" ry="4.4" transform="rotate(30 54.5 14)" /><ellipse cx="49.5" cy="22" rx="2.6" ry="4.4" transform="rotate(-30 49.5 22)" /><ellipse cx="54.5" cy="22" rx="2.6" ry="4.4" transform="rotate(30 54.5 22)" /><ellipse cx="52" cy="8" rx="2.4" ry="4" /></g>
  </>,
  /** A red chilli and a spice jar. */
  'spices-seasonings-sauces': <>
    {SHADOW}
    <rect x="30" y="22" width="26" height="34" rx="5" fill="#ffd9a8" /><rect x="30" y="22" width="26" height="34" rx="5" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".5" />
    <rect x="28" y="14" width="30" height="10" rx="4" fill="#e8452a" /><path d="M32 17h22" stroke="#ff8a6b" strokeWidth="2" strokeLinecap="round" />
    <rect x="34" y="31" width="18" height="14" rx="2.5" fill="#fff" /><path d="M37 36h12M37 40h8" stroke="#e8452a" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M10 16c4-6 12-5 12 3 0 14-6 28-6 36 0 2-2 3-3 1-8-10-10-28-3-40z" fill="#e0301f" />
    <path d="M13 22c2-3 5-3 6-1" stroke="#ff7a62" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M14 15c-1-6 3-10 8-9-1 3-3 5-5 6 2 1 4 3 5 4z" fill="#3aa356" />
  </>,
  /** Fresh greens, a tomato and a carrot. */
  'fresh-produce': <>
    {SHADOW}
    <path d="M44 20l12-5-3 12-11 12z" fill="#f08a24" /><path d="M56 15c3-3 6-3 7-1-1 2-4 3-7 1zM53 12c0-3 2-5 4-5 0 2-1 4-4 5z" fill="#3aa356" />
    <circle cx="20" cy="42" r="16" fill="#58b368" /><path d="M20 26c-6 8-6 20 0 32M20 26c6 8 6 20 0 32M5 42c9-5 21-5 30 0" fill="none" stroke="#3b8f4d" strokeWidth="2" strokeLinecap="round" /><circle cx="14" cy="34" r="3" fill="#fff" opacity=".28" />
    <circle cx="42" cy="46" r="12" fill="#e0452a" /><path d="M36 36l6 4 6-4" fill="none" stroke="#2e8b57" strokeWidth="3" strokeLinecap="round" /><circle cx="37" cy="42" r="2.8" fill="#fff" opacity=".4" />
  </>,
  /** A frozen bag with a snowflake and ice. */
  frozen: <>
    {SHADOW}
    <path d="M14 14h36l3 8-2 30a6 6 0 0 1-6 5.500H19A6 6 0 0 1 13 52l-2-30z" fill="#4f9be6" /><path d="M14 14h36l3 8H11z" fill="#8fc5fa" />
    <path d="M17 14l2-5h26l2 5" fill="none" stroke="#2f6fb5" strokeWidth="2.4" strokeLinecap="round" /><path d="M16 20h32" stroke="#2f6fb5" strokeWidth="1.5" strokeDasharray="2 3" />
    <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M32 29v22M22 34l20 12M42 34L22 46" /><path d="M28 31l4 3 4-3M28 49l4-3 4 3" strokeWidth="2.2" /></g>
    <rect x="46" y="42" width="13" height="13" rx="3" fill="#d6efff" transform="rotate(14 52 48)" /><rect x="5" y="46" width="10" height="10" rx="2.5" fill="#d6efff" transform="rotate(-12 10 51)" />
  </>,
  /** A fizzy drink and a bag of snacks. */
  'snacks-drinks': <>
    {SHADOW}
    <path d="M6 22l6-4h18l5 4-2 33a4 4 0 0 1-4 3.500H12a4 4 0 0 1-4-3.500z" fill="#f2b632" /><path d="M6 22l6-4h18l5 4z" fill="#ffd45e" /><path d="M10 27h24" stroke="#c8302b" strokeWidth="3" /><circle cx="21" cy="42" r="8" fill="#c8302b" /><path d="M17 42h8M21 38v8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <rect x="38" y="16" width="19" height="40" rx="4.500" fill="#7a3fa8" /><rect x="38" y="16" width="19" height="7" rx="3" fill="#a56fd1" /><path d="M42 16l9-6" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" /><circle cx="47.500" cy="38" r="6.500" fill="#fff" opacity=".9" /><path d="M44.500 40l3-6 3 6" fill="none" stroke="#7a3fa8" strokeWidth="2" strokeLinecap="round" />
  </>,
  /** A bowl of steaming stew. */
  'soup-stew': <>
    {SHADOW}
    <path d="M20 24c-4-4 3-6-1-11M32 22c-4-5 3-7-1-12M44 24c-4-4 3-6-1-11" fill="none" stroke="#fff" strokeWidth="3.200" strokeLinecap="round" opacity=".9" /><path d="M20 24c-4-4 3-6-1-11M32 22c-4-5 3-7-1-12M44 24c-4-4 3-6-1-11" fill="none" stroke="#e0b98a" strokeWidth="1.200" strokeLinecap="round" />
    <path d="M7 32h50c0 15-9 25-25 25S7 47 7 32z" fill="#d86a2b" /><path d="M7 32h50c0 2-.2 4-.7 6H7.7C7.200 36 7 34 7 32z" fill="#f08f4d" />
    <ellipse cx="32" cy="32" rx="25" ry="5.500" fill="#b9501d" /><ellipse cx="32" cy="31" rx="22" ry="4" fill="#e8892f" />
    <circle cx="22" cy="31" r="2.600" fill="#58b368" /><circle cx="33" cy="32" r="2.600" fill="#f7c948" /><circle cx="42" cy="30.500" r="2.600" fill="#c8302b" /><path d="M24 57h16" stroke="#a74513" strokeWidth="3" strokeLinecap="round" />
  </>,
  /** A bottle of golden oil with a droplet. */
  'oils-butters': <>
    {SHADOW}
    <path d="M26 6h12v9l7 9v29a6 6 0 0 1-6 6H25a6 6 0 0 1-6-6V24l7-9z" fill="#f2b632" /><path d="M26 6h12v7H26z" fill="#3aa356" /><path d="M26 15h12l7 9H19z" fill="#ffd45e" /><path d="M22 28v20" stroke="#fff" strokeWidth="2.400" strokeLinecap="round" opacity=".45" />
    <rect x="23" y="34" width="22" height="14" rx="2.500" fill="#fff" /><path d="M34 37c-3 4-4 5.500-2.500 7.500 1.500 2 4.500 2 5.500 0 1.500-2 .5-3.500-3-7.500z" fill="#f2b632" />
    <path d="M52 22c-4 5-5 7-3 9.500 2 2.500 6 2.500 7 0 2-2.500 1-4.500-4-9.500z" fill="#ffd45e" />
  </>,
  /** A tin can and a jar. */
  'canned-jarred': <>
    {SHADOW}
    <path d="M6 20v32c0 4 8 7 17 7s17-3 17-7V20z" fill="#b8c4cf" /><ellipse cx="23" cy="20" rx="17" ry="6" fill="#dfe6ec" /><path d="M6 30h34v18H6z" fill="#e8452a" /><path d="M6 30h34v3H6z" fill="#ff8a6b" /><path d="M13 40c3-4 6-4 10 0s7 4 10 0" stroke="#fff" strokeWidth="2.400" fill="none" strokeLinecap="round" />
    <rect x="38" y="14" width="22" height="9" rx="3" fill="#3aa356" /><path d="M40 23v30a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V23z" fill="#fbd9a2" opacity=".9" /><path d="M40 23v30a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V23z" fill="none" stroke="#fff" strokeWidth="1.600" />
    <rect x="42" y="32" width="16" height="12" rx="2" fill="#fff" /><circle cx="50" cy="38" r="3.400" fill="#f08a24" /><circle cx="46" cy="52" r="3" fill="#c8302b" /><circle cx="54" cy="51" r="3" fill="#c8302b" />
  </>,
  /** A fried egg with toast. */
  breakfast: <>
    {SHADOW}
    <rect x="30" y="8" width="26" height="26" rx="5" fill="#e6b075" transform="rotate(10 43 21)" /><rect x="33" y="11" width="20" height="20" rx="3.500" fill="#f6d9a4" transform="rotate(10 43 21)" />
    <ellipse cx="29" cy="42" rx="25" ry="17" fill="#fff" /><path d="M8 36c2-9 11-14 21-14 11 0 20 5 22 15" fill="none" stroke="#e8e2d3" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    <circle cx="29" cy="42" r="10" fill="#ffb81f" /><circle cx="26" cy="38.500" r="3" fill="#fff" opacity=".6" />
    <path d="M54 44v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V44z" fill="#8a5a2b" /><path d="M43 44h14" stroke="#b98458" strokeWidth="3" strokeLinecap="round" /><path d="M54 47c4 0 4 6 0 6" fill="none" stroke="#8a5a2b" strokeWidth="2.200" />
  </>,
  /** A whole fish with fins. */
  'dried-fish-meat': <>
    {SHADOW}
    <path d="M6 32c9-14 25-17 36-8l14-10v36L42 40C31 49 15 46 6 32z" fill="#c9a37a" />
    <path d="M6 32c9-14 25-17 36-8-3 2-5 5-6 8-8 6-22 6-30 0z" fill="#e3c49b" />
    <path d="M42 24l14-10v36L42 40c3-5 3-11 0-16z" fill="#a9825a" />
    <path d="M28 18c-1-5 2-9 6-10 1 4 0 8-3 12z" fill="#a9825a" />
    <circle cx="17" cy="30" r="3.200" fill="#fff" /><circle cx="17.800" cy="30.200" r="1.600" fill="#1b2a21" />
    <path d="M25 22c3 6 3 14 0 20M31 21c3 6 3 15 0 22" stroke="#a9825a" strokeWidth="1.800" fill="none" strokeLinecap="round" opacity=".7" />
    <path d="M12 38c3 2 6 2 9 1" stroke="#a9825a" strokeWidth="2" strokeLinecap="round" fill="none" />
  </>,
};
const FALLBACK = <>
  {SHADOW}<path d="M12 28h40l-5 24a4 4 0 0 1-4 3H21a4 4 0 0 1-4-3z" fill="#d89a58" /><path d="M20 28c0-12 24-12 24 0" fill="none" stroke="#9a6230" strokeWidth="4" strokeLinecap="round" /><circle cx="26" cy="26" r="6" fill="#e0452a" /><circle cx="38" cy="26" r="6" fill="#58b368" />
</>;

export const DEPT_TILE: Record<string, string> = {
  'rice-grains-flour': 'dt-sand', 'spices-seasonings-sauces': 'dt-coral', 'fresh-produce': 'dt-green', frozen: 'dt-ice', 'snacks-drinks': 'dt-violet',
  'soup-stew': 'dt-orange', 'oils-butters': 'dt-gold', 'canned-jarred': 'dt-steel', breakfast: 'dt-peach', 'dried-fish-meat': 'dt-clay',
};
export const DeptIcon = ({ slug }: { slug: string }) => G(ART[slug] ?? FALLBACK);
