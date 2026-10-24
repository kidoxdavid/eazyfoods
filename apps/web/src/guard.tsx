import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Loading, Notice } from './ui';

/** Requires sign-in; optionally one of `roles` (any match). Redirects to sign-in, remembering where the person was going. */
export function RequireAuth({ children, roles, fallback }: { children: ReactNode; roles?: string[]; fallback?: ReactNode }) {
  const { me, ready, has } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="wrap"><Loading /></div>;
  if (!me) return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.some((r) => has(r))) return <>{fallback ?? <div className="wrap"><Notice tone="warn">You do not have access to this area. If you think you should, ask the account owner to check your role.</Notice></div>}</>;
  return <>{children}</>;
}

/** Which accounts may open each staff area. Anyone else is signed out of the staff area and asked for the right email. */
const AREA_ROLES: Record<string, string[]> = {
  admin: ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing'],   // marketing reaches only the shared studio and coupons here: the console menu is filtered by permission
  marketing: ['admin', 'marketing'],
  vendor: ['vendor_owner', 'vendor_staff', 'admin'],   // an admin lands on a pointer to Admin → Vendors → Open their portal
  driver: ['driver', 'admin'],
};

export function RequireArea({ area, children }: { area: 'admin' | 'marketing' | 'vendor' | 'driver'; children: ReactNode }) {
  const { me, ready, has, logout } = useAuth();
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  const allowed = !!me && AREA_ROLES[area].some((r) => has(r));
  useEffect(() => { if (ready && me && !allowed) logout(); }, [ready, me, allowed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <div className="wrap"><Loading /></div>;
  if (!me) return <Navigate to={`/signin?next=${next}`} replace />;
  if (!allowed) return <Navigate to={`/signin?next=${next}&wrong=1`} replace />;
  return <>{children}</>;
}
