import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { canDo } from './admin/perms';
import { IconMenu, IconClose, IconSearch } from '../icons';
import type { NavItem } from '../ui';
import './backoffice.css';

type Tone = 'admin' | 'vendor' | 'driver' | 'chef' | 'marketing';
type Cfg = { hidden_nav: string[]; notice: string | null; notice_tone: 'info' | 'warn' };

/**
 * The shared back-office frame for every staff area: a thin top bar (where am I, jump anywhere, switch area, who am I),
 * a grouped sidebar that collapses, and a content area with a breadcrumb. Admins can hide menu items and post a notice per area (Control centre).
 */
export function PortalLayout({ title, subtitle, nav, tone, children }: { title: string; subtitle?: string; nav: NavItem[]; tone: Tone; children: ReactNode }) {
  const { me, logout, isStaff, isVendor, has } = useAuth();
  const loc = useLocation(); const go = useNavigate();
  const cfg = useApi<Cfg>(`/portal-config/${tone}`);
  const hidden = new Set(cfg.data?.hidden_nav ?? []);
  const items = nav.filter((n) => !hidden.has(n.to));
  const groups = useMemo(() => {
    const m = new Map<string, NavItem[]>();
    for (const n of items) (m.get(n.group ?? '') ?? m.set(n.group ?? '', []).get(n.group ?? '')!).push(n);
    return [...m.entries()];
  }, [items.map((i) => i.to + (i.badge ?? '')).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const [open, setOpen] = useState(false);                    // drawer on phones
  const [shut, setShut] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(`bo_shut_${tone}`) ?? '{}'); } catch { return {}; } });
  const toggleGroup = (g: string) => setShut((s) => { const n = { ...s, [g]: !s[g] }; try { localStorage.setItem(`bo_shut_${tone}`, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);

  // "Jump to…": type part of a page name, Enter goes to the first match. Press / anywhere to start.
  const [q, setQ] = useState(''); const jump = useRef<HTMLInputElement>(null);
  const matches = q.trim() ? items.filter((i) => `${i.label} ${i.group ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 7) : [];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === '/' && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '')) { e.preventDefault(); jump.current?.focus(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);

  const current = [...items].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? loc.pathname === i.to : loc.pathname === i.to || loc.pathname.startsWith(i.to + '/')));
  const roles = me?.roles ?? [];
  const areas = [
    { to: '/', label: 'Shop' },
    ...(isStaff && canDo(roles, 'orders.view', 'catalog.manage', 'vendors.manage', 'support.manage', 'dispatch.manage', 'ledger.view', 'control.manage') ? [{ to: '/admin', label: 'Admin' }] : []),
    ...(canDo(roles, 'marketing.manage') ? [{ to: '/marketing', label: 'Marketing' }] : []),
    ...(isVendor ? [{ to: '/vendor', label: 'Store / kitchen' }] : []),
    ...(has('driver') ? [{ to: '/driver', label: 'Driver' }] : []),
  ];
  const badgeTotal = items.reduce((a, i) => a + (i.badge ?? 0), 0);

  return (
    <div className="portal bo" data-portal={tone}>
      <header className="bo-top">
        <button className="bo-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? <IconClose width={20} height={20} /> : <IconMenu width={20} height={20} />}{!open && badgeTotal > 0 && <span className="bo-dot" />}</button>
        <Link to={areas[0].to === '/' && tone === 'admin' ? '/admin' : `/${tone === 'chef' ? 'vendor' : tone}`} className="bo-brand"><img src="/logo-64.png" alt="" width={22} height={22} /><strong>{title}</strong>{subtitle && <span className="bo-sub">{subtitle}</span>}</Link>
        <div className="bo-jump">
          <IconSearch width={15} height={15} />
          <input ref={jump} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Go to…  ( / )" aria-label="Go to a page"
            onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { go(matches[0].to); setQ(''); } if (e.key === 'Escape') setQ(''); }} />
          {matches.length > 0 && <ul className="bo-jump-list" role="listbox">{matches.map((m) => <li key={m.to}><button type="button" onMouseDown={(e) => { e.preventDefault(); go(m.to); setQ(''); }}>{m.label}{m.group && <small>{m.group}</small>}</button></li>)}</ul>}
        </div>
        <span className="grow" />
        <details className="bo-menu"><summary>Switch area</summary><div>{areas.map((a) => <Link key={a.to} to={a.to}>{a.label}</Link>)}</div></details>
        <details className="bo-menu bo-user"><summary><span className="bo-avatar" aria-hidden="true">{(me?.full_name ?? '?').slice(0, 1).toUpperCase()}</span><span className="bo-uname">{me?.full_name?.split(' ')[0]}</span></summary>
          <div><div className="bo-who"><b>{me?.full_name}</b><small>{me?.email}</small><small>{roles.map((r) => r.role).join(', ')}</small></div><Link to="/account">My account</Link><button type="button" onClick={async () => { await logout(); go('/'); }}>Sign out</button></div></details>
      </header>
      <div className="bo-body">
        {open && <div className="bo-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
        <aside className={`bo-side${open ? ' open' : ''}`} aria-label={`${title} navigation`}>
          <nav>
            {groups.map(([g, list]) => (
              <div key={g || 'main'} className="bo-group">
                {g && <button type="button" className="bo-ghead" aria-expanded={!shut[g]} onClick={() => toggleGroup(g)}><span>{g}</span><i aria-hidden="true" /></button>}
                {(!g || !shut[g] || list.some((i) => i === current)) && <ul>{list.map((n) => (
                  <li key={n.to}><NavLink to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>{n.label}{n.badge ? <span className="count">{n.badge}</span> : null}</NavLink></li>))}</ul>}
              </div>))}
          </nav>
        </aside>
        <main className="portal-main bo-main">
          {current && <div className="bo-crumbs"><span>{title}</span>{current.group && <><i>›</i><span>{current.group}</span></>}<i>›</i><b>{current.label}</b></div>}
          {cfg.data?.notice && <div className={`bo-notice ${cfg.data.notice_tone}`} role="note">{cfg.data.notice}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
