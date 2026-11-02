/**
 * Illustrated icons for the "Your EAZY faves" tiles: flat, colourful, with a little depth, drawn to be noticed.
 * (Each is a 64×64 picture; the tile gives it its colour and size.)
 */
type P = { className?: string };
const S = (c: React.ReactNode, cls = '') => <svg viewBox="0 0 64 64" className={`fave-ico ${cls}`} aria-hidden="true" focusable="false">{c}</svg>;

/** A woven basket of fresh things with a "again" arrow: Buy again. */
export const IconBuyAgain = ({ className }: P) => S(<>
  <ellipse cx="32" cy="58" rx="20" ry="3" fill="#000" opacity=".12" />
  <path d="M18 27c0-13 28-13 28 0" fill="none" stroke="#9a6230" strokeWidth="4" strokeLinecap="round" />
  <circle cx="24" cy="25" r="7.5" fill="#e0452a" /><path d="M20.5 18.5l3.5 3 3.5-3" fill="none" stroke="#2e8b57" strokeWidth="2.2" strokeLinecap="round" /><circle cx="21.5" cy="23" r="2" fill="#fff" opacity=".45" />
  <path d="M30 26c-3-10 9-15 15-8 3 5-3 11-15 8z" fill="#4fb76a" /><path d="M33 24c4-3 7-5 9-8" stroke="#2f8a49" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  <ellipse cx="40" cy="27" rx="6" ry="4.4" fill="#f7c948" transform="rotate(-18 40 27)" />
  <path d="M9 28h46l-5 24a4.5 4.5 0 0 1-4.4 3.5H18.4A4.5 4.5 0 0 1 14 52z" fill="#d89a58" />
  <path d="M9 28h46l-1.4 6H10.4z" fill="#e6b075" />
  <path d="M12 38h40M14 46h36" stroke="#b97a3d" strokeWidth="2" strokeLinecap="round" /><path d="M24 29l-2 24M32 29v25M40 29l2 24" stroke="#b97a3d" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
  <circle cx="50" cy="14" r="11" fill="#1f7a46" stroke="#fff" strokeWidth="2.5" />
  <path d="M44.5 14.5a5.6 5.6 0 0 1 9.6-3.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><path d="M55.5 13.5a5.6 5.6 0 0 1-9.6 3.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  <path d="M55 7.4l.3 5-4.8-1.2z" fill="#fff" /><path d="M45 20.6l-.3-5 4.8 1.2z" fill="#fff" />
</>, className);

/** A bright price tag with a percent sign: Weekly deals. */
export const IconDeals = ({ className }: P) => S(<>
  <ellipse cx="34" cy="58" rx="19" ry="3" fill="#000" opacity=".12" />
  <path d="M30 4h22a6 6 0 0 1 6 6v22a6 6 0 0 1-1.8 4.3L35.6 58a6 6 0 0 1-8.5 0L5 36a6 6 0 0 1 0-8.5L27.1 5.7A6 6 0 0 1 30 4z" fill="#e8452a" />
  <path d="M30 4h22a6 6 0 0 1 6 6v6L40 4z" fill="#ff7a5a" opacity=".55" />
  <circle cx="47" cy="16" r="4.6" fill="#fff" /><circle cx="47" cy="16" r="2" fill="#e8452a" />
  <path d="M47 16C54 8 60 6 62 2" fill="none" stroke="#7a2e1c" strokeWidth="2" strokeLinecap="round" />
  <g transform="rotate(-45 30 36)"><text x="30" y="45" textAnchor="middle" fontSize="27" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">%</text></g>
  <path d="M14 33l16-16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".35" />
  <path d="M52 40l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#ffd84a" />
</>, className);

/** A weekly flyer: a sheet with a red SALE band and little products. */
export const IconFlyer = ({ className }: P) => S(<>
  <ellipse cx="32" cy="59" rx="19" ry="3" fill="#000" opacity=".12" />
  <rect x="16" y="9" width="38" height="48" rx="4" fill="#ffd1c6" transform="rotate(8 35 33)" />
  <rect x="10" y="5" width="38" height="50" rx="4.5" fill="#fff" stroke="#ecc1b7" strokeWidth="1.6" />
  <path d="M10 9.5A4.5 4.5 0 0 1 14.5 5h29A4.5 4.5 0 0 1 48 9.5V20H10z" fill="#e8452a" />
  <text x="29" y="17" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">SALE</text>
  <circle cx="20" cy="31" r="6" fill="#f7c948" /><rect x="30" y="26" width="12" height="10" rx="2.5" fill="#58b368" /><path d="M16 45h14M16 50h9" stroke="#cfd6d2" strokeWidth="2.4" strokeLinecap="round" /><circle cx="39" cy="46" r="5" fill="#e8452a" /><text x="39" y="49" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">$</text>
  <path d="M52 10l1.2 3.2 3.2 1.2-3.2 1.2L52 18.8l-1.2-3.2-3.2-1.2 3.2-1.2z" fill="#ffd84a" />
</>, className);

/** A gift box with a bow and sparkles: New arrivals. */
export const IconNew = ({ className }: P) => S(<>
  <ellipse cx="30" cy="59" rx="19" ry="3" fill="#000" opacity=".12" />
  <rect x="8" y="28" width="44" height="28" rx="4" fill="#4a7cf0" /><rect x="8" y="28" width="44" height="8" rx="3" fill="#6b97ff" />
  <rect x="26" y="28" width="8" height="28" fill="#ffd84a" />
  <rect x="5" y="22" width="50" height="10" rx="3.5" fill="#5f8cff" /><rect x="26" y="22" width="8" height="10" fill="#ffc21a" />
  <path d="M30 22c-8-1-14-5-11-10 3-4 10-1 11 10z" fill="#ffd84a" /><path d="M30 22c8-1 14-5 11-10-3-4-10-1-11 10z" fill="#ffc21a" />
  <circle cx="30" cy="22" r="3.2" fill="#e8a600" />
  <path d="M52 6l1.9 5.1 5.1 1.9-5.1 1.9L52 20l-1.9-5.1L45 13l5.1-1.9z" fill="#ffd84a" /><path d="M10 10l1.2 3.2 3.2 1.2-3.2 1.2L10 18.8 8.8 15.6 5.6 14.4l3.2-1.2z" fill="#ff8aa5" />
  <path d="M13 44h10M13 49h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
</>, className);

/** A steaming cooking pot with a wooden spoon: Recipes. */
export const IconRecipes = ({ className }: P) => S(<>
  <ellipse cx="32" cy="59" rx="22" ry="3" fill="#000" opacity=".12" />
  <path d="M22 18c-4-4 3-6-1-11M32 16c-4-5 3-7-1-12M42 18c-4-4 3-6-1-11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
  <path d="M22 18c-4-4 3-6-1-11M32 16c-4-5 3-7-1-12M42 18c-4-4 3-6-1-11" fill="none" stroke="#b9a3d6" strokeWidth="1.2" strokeLinecap="round" />
  <rect x="9" y="30" width="7" height="5" rx="2.5" fill="#4b3a63" /><rect x="48" y="30" width="7" height="5" rx="2.5" fill="#4b3a63" />
  <path d="M12 28h40v18a11 11 0 0 1-11 11H23a11 11 0 0 1-11-11z" fill="#7b4fb3" /><path d="M12 28h40v6H12z" fill="#9a70d1" />
  <rect x="10" y="22" width="44" height="8" rx="4" fill="#c9a2e8" /><circle cx="32" cy="21" r="3.4" fill="#4b3a63" />
  <circle cx="22" cy="42" r="3" fill="#f7c948" /><circle cx="31" cy="46" r="3" fill="#e8452a" /><circle cx="40" cy="42" r="3" fill="#58b368" />
  <path d="M53 6L45 22" stroke="#b97a3d" strokeWidth="3.2" strokeLinecap="round" /><ellipse cx="55" cy="4.5" rx="3.4" ry="2.4" fill="#d89a58" transform="rotate(-50 55 4.5)" />
</>, className);

/** A chef's hat over a serving dome: Home chefs. */
export const IconChef = ({ className }: P) => S(<>
  <ellipse cx="32" cy="59" rx="22" ry="3" fill="#000" opacity=".12" />
  <path d="M17 38c-7-1-10-9-5-14 3-3.500 8-3.500 11-.5 1-6.500 8-10 14.500-7 4 2 6 5 6 8.500 5.500-1 10.500 3 9 9-1 3.500-4 5.500-8 5.500z" fill="#fff" stroke="#e3dccd" strokeWidth="1.6" />
  <path d="M26 20c0 6 1 11 1 17M38 20c0 6-1 11-1 17" stroke="#e3dccd" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  <rect x="16" y="37" width="32" height="13" rx="3.5" fill="#fff" stroke="#e3dccd" strokeWidth="1.6" />
  <rect x="16" y="43" width="32" height="3.5" fill="#e8452a" />
  <path d="M6 56c0-4 5-6 26-6s26 2 26 6z" fill="#c9cfd3" /><path d="M6 56c0-4 5-6 26-6s26 2 26 6z" fill="none" stroke="#9aa3a8" strokeWidth="1.2" />
  <path d="M54 8l1.3 3.4 3.4 1.3-3.4 1.3L54 17.4l-1.3-3.4-3.4-1.3 3.4-1.3z" fill="#ffd84a" />
</>, className);
