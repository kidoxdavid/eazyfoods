import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, post } from './api';
import { isStaffPath } from './area';

export type Role = { role: string; vendor_id: string | null };
export type Me = { id: string; email: string; full_name: string; staff_signup?: 'vendor' | 'driver' | null; roles: Role[]; acting_vendor?: { id: string; name: string } } | null;
type Ctx = { me: Me; ready: boolean; reload: () => Promise<void>; logout: () => Promise<void>; has: (role: string) => boolean; isStaff: boolean; isVendor: boolean; shopMe: Me; reloadShop: () => Promise<void>; reloadStaff: () => Promise<void> };

const STAFF = ['admin', 'support', 'finance', 'dispatcher', 'catalog'];
const C = createContext<Ctx>(null as any);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const area: 'shop' | 'staff' = isStaffPath(loc.pathname) ? 'staff' : 'shop';
  const [meShop, setShop] = useState<Me>(null);
  const [meStaff, setStaff] = useState<Me>(null);
  const [ready, setReady] = useState<{ shop: boolean; staff: boolean }>({ shop: false, staff: false });
  const load = useCallback(async (a: 'shop' | 'staff') => {
    try { const m = await api<Me>('/auth/me', a === 'staff' ? { headers: { 'x-area': 'staff' } } : {}); a === 'staff' ? setStaff(m) : setShop(m); }
    catch { a === 'staff' ? setStaff(null) : setShop(null); }
    finally { setReady((r) => ({ ...r, [a]: true })); }
  }, []);
  // Each sign-in is loaded the first time its area is visited, so a shopper never waits on the staff check.
  useEffect(() => { load(area); }, [area, load]);
  const me = area === 'staff' ? meStaff : meShop;
  const value = useMemo<Ctx>(() => ({
    me, ready: ready[area], reload: async () => { await load(area); },
    logout: async () => { await post('/auth/logout', {}, area === 'staff' ? { 'x-area': 'staff' } : undefined); area === 'staff' ? setStaff(null) : setShop(null); },
    has: (r) => !!me?.roles.some((x) => x.role === r),
    isStaff: !!me?.roles.some((x) => STAFF.includes(x.role)),
    isVendor: !!me?.roles.some((x) => x.role.startsWith('vendor_')),
    shopMe: meShop, reloadShop: () => load('shop'), reloadStaff: () => load('staff'),
  }), [me, ready, area, load, meShop]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
