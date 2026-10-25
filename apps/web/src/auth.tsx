import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, post } from './api';
import { windowOf, type Area } from './area';

export type Role = { role: string; vendor_id: string | null };
export type Me = { id: string; email: string; full_name: string; staff_signup?: 'vendor' | 'driver' | null; roles: Role[]; acting_vendor?: { id: string; name: string } } | null;
type Ctx = { me: Me; ready: boolean; reload: () => Promise<void>; logout: () => Promise<void>; has: (role: string) => boolean; isStaff: boolean; isVendor: boolean; shopMe: Me; reloadShop: () => Promise<void>; reloadStaff: () => Promise<void> };

const STAFF = ['admin', 'support', 'finance', 'dispatcher', 'catalog'];
const C = createContext<Ctx>(null as any);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const loc = useLocation();
  // Five independent sign-ins: the shop and each staff window. Being signed in to one never signs you in or out of another.
  const area: Area = windowOf(loc.pathname) ?? 'shop';
  const [mes, setMes] = useState<Partial<Record<Area, Me>>>({});
  const [ready, setReady] = useState<Partial<Record<Area, boolean>>>({});
  const load = useCallback(async (a: Area) => {
    let m: Me = null;
    try { m = await api<Me>('/auth/me', a === 'shop' ? {} : { headers: { 'x-area': a } }); } catch { m = null; }
    setMes((s) => ({ ...s, [a]: m })); setReady((r) => ({ ...r, [a]: true }));
  }, []);
  // Each sign-in is loaded the first time its area is visited, so a shopper never waits on a staff check.
  useEffect(() => { load(area); }, [area, load]);
  const me = mes[area] ?? null;
  const value = useMemo<Ctx>(() => ({
    me, ready: !!ready[area], reload: async () => { await load(area); },
    logout: async () => { await post('/auth/logout', {}, area === 'shop' ? undefined : { 'x-area': area }); setMes((s) => ({ ...s, [area]: null })); },
    has: (r) => !!me?.roles.some((x) => x.role === r),
    isStaff: !!me?.roles.some((x) => STAFF.includes(x.role)),
    isVendor: !!me?.roles.some((x) => x.role.startsWith('vendor_')),
    shopMe: mes.shop ?? null, reloadShop: () => load('shop'), reloadStaff: () => load(area),
  }), [me, ready, area, load, mes.shop]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
