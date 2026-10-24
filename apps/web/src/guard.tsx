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

/** Which accounts may open each staff area. Each area has its own sign-in window; the admin opens the admin area only. */
const AREA_ROLES: Record<string, string[]> = {
  admin: ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing'],   // marketing reaches only the shared studio and coupons here: the console menu is filtered by permission
  marketing: ['marketing'],
  vendor: ['vendor_owner', 'vendor_staff'],   // an admin who chose "open their portal" holds a temporary vendor_owner role
  driver: ['driver'],
};

export function RequireArea({ area, children }: { area: 'admin' | 'marketing' | 'vendor' | 'driver'; children: ReactNode }) {
  const { me, ready, has, logout } = useAuth();
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  const allowed = !!me && (AREA_ROLES[area].some((r) => has(r)) || (me.staff_signup === area));
  if (!ready) return <div className="wrap"><Loading /></div>;
  if (!me) return <Navigate to={`/${area}/signin?next=${next}`} replace />;
  if (!allowed) return (
    <div className="wrap" style={{ maxWidth: 520, margin: '40px auto' }}>
      <Notice tone="warn">You are signed in as <strong>{me.email}</strong>, which cannot open the {area} area. Each area has its own sign-in.</Notice>
      <p><button className="btn primary" onClick={async () => { await logout(); }}>Sign out and use a {area} account</button></p>
      <p className="small muted"><a href="/">Back to the shop</a></p>
    </div>
  );
  return <>{children}</>;
}
