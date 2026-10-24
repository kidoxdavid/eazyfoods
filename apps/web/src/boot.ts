/** Data the server embedded in the page for the first paint (see apps/api/src/app.ts). Each entry is used once, by whichever screen asks first, then dropped. */
let boot: Record<string, unknown> | null | undefined;
const read = () => {
  if (boot !== undefined) return boot;
  try { const el = document.getElementById('boot'); boot = el ? JSON.parse(el.textContent || '{}') : null; } catch { boot = null; }
  return boot;
};
export const peekBoot = <T,>(path: string): T | undefined => { const b = read(); return b && path in b ? (b[path] as T) : undefined; };
export const consumeBoot = (path: string) => { const b = read(); if (b) delete b[path]; };
