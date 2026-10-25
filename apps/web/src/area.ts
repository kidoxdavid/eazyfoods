/** The staff areas (admin, marketing, vendor, driver) keep their own sign-in, separate from the shop's. */
export const STAFF_PATH = /^\/(admin|marketing|vendor|driver)(\/|\?|$)/;
export const isStaffPath = (p: string) => STAFF_PATH.test(p);
export type Window = 'admin' | 'marketing' | 'vendor' | 'driver';
export type Area = 'shop' | Window;
/** Which staff window a page path belongs to (null for the shop). Each window has its own sign-in. */
export const windowOf = (p: string): Window | null => (/^\/(admin|marketing|vendor|driver)(\/|\?|$)/.exec(p)?.[1] as Window | undefined) ?? null;
/** The area a post-sign-in destination belongs to. */
export const areaForNext = (next: string | null | undefined) => (next && isStaffPath(next) ? 'staff' : 'shop');

/**
 * Every request to /api made from a staff page is marked as staff, so it uses the staff sign-in. Done once, here, so no page can forget.
 * (The API also treats /api/admin, /api/marketing, /api/vendor and /api/driver as staff by path, which covers links opened in a new tab.)
 */
export function installAreaFetch() {
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const win = windowOf(window.location.pathname);
    if (url.startsWith('/api') && win) {
      const h = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined));
      if (!h.has('x-area')) h.set('x-area', win);
      return orig(input, { ...init, headers: h });
    }
    return orig(input, init);
  };
}
