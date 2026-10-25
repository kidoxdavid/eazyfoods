import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, BookOpen, Calendar, Circle, DollarSign, FileText, Image as ImageIcon, LayoutDashboard, LogOut, Mail, Map, MapPin, Megaphone, Menu, MessageCircle, MessageSquare, Package,
  Palette, Search, Settings, ShoppingBag, SlidersHorizontal, Star, Store, Tag, Target, Truck, User, Users, UtensilsCrossed, Wallet, Workflow, X, Share2, Gift, Layers, HelpCircle, ClipboardList, ScanLine, RotateCcw, Navigation, History,
} from 'lucide-react';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { canDo } from './admin/perms';
import { Button, Field, Input, Modal, Notice, type NavItem } from '../ui';
import { post } from '../api';
import { useAction } from '../hooks';
import './backoffice.css';

type Tone = 'admin' | 'vendor' | 'driver' | 'chef' | 'marketing';
type Cfg = { hidden_nav: string[]; notice: string | null; notice_tone: 'info' | 'warn' };

/** Menu icons by what the item is called, so every area gets them without each page having to choose. */
const ICONS: [RegExp, typeof Circle][] = [
  [/dashboard|overview/i, LayoutDashboard], [/available/i, MapPin], [/my deliver|active/i, Navigation], [/history/i, History], [/dispatch/i, MapPin], [/driver/i, Truck], [/order|jobs/i, ShoppingBag],
  [/refund/i, RotateCcw], [/support|help|question/i, MessageSquare], [/message|chat/i, MessageCircle], [/vendor|store|kitchen|restaurant/i, Store], [/catalog|product|inventory/i, Package], [/dish|menu|cuisine/i, UtensilsCrossed],
  [/taxonomy|categor|coupon|promotion/i, Tag], [/zone/i, Map], [/ads?\b|advertis|campaign/i, Megaphone], [/studio|storefront|gallery/i, Palette], [/content|library|doc/i, FileText], [/pipeline|automation/i, Workflow],
  [/payout|earning/i, Wallet], [/finance/i, DollarSign], [/insight|analytic|report|performance/i, BarChart3], [/control/i, SlidersHorizontal], [/setting|setup|profile/i, Settings], [/system|audit|activity/i, Activity],
  [/email/i, Mail], [/audience|segment/i, Users], [/calendar|occasion/i, Calendar], [/social/i, Share2], [/budget/i, DollarSign], [/reward|credit|gift/i, Gift], [/rating|review/i, Star], [/target/i, Target],
  [/image/i, ImageIcon], [/barcode|scan/i, ScanLine], [/plan|guide/i, BookOpen], [/layer/i, Layers], [/task|list/i, ClipboardList], [/switch|area|people|user/i, User], [/\?/i, HelpCircle],
];
export const iconFor = (label: string) => ICONS.find(([re]) => re.test(label))?.[1] ?? Circle;

/**
 * The shared back-office frame, in the look of the original EAZyfoods portals: a white sidebar with a blue title bar, icon menu with red badges,
 * the signed-in person at the bottom, and a slim white header over a light grey page. Admins can hide menu items and post a notice per area.
 */
export function PortalLayout({ title, subtitle, nav, tone, children }: { title: string; subtitle?: string; nav: NavItem[]; tone: Tone; children: ReactNode }) {
  const { me, logout, isStaff, isVendor, has } = useAuth();
  const loc = useLocation(); const go = useNavigate();
  const cfg = useApi<Cfg>(`/portal-config/${tone}`);
  const hidden = new Set(cfg.data?.hidden_nav ?? []);
  // "Something is waiting" counts, refreshed every 30 seconds and whenever the tab is shown again.
  const badges = useApi<Record<string, number>>(`/${tone === 'chef' ? 'vendor' : tone}/badges`);
  useEffect(() => {
    const t = setInterval(badges.reload, 30000); const vis = () => { if (!document.hidden) badges.reload(); };
    document.addEventListener('visibilitychange', vis); return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [badges.reload]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = nav.filter((n) => !hidden.has(n.to)).map((n) => ({ ...n, badge: n.badge || badges.data?.[n.to] || 0 }));
  const waiting = items.reduce((a, n) => a + (n.badge || 0), 0);
  useEffect(() => { const base = document.title.replace(/^\(\d+\+?\) /, ''); document.title = waiting ? `(${waiting > 99 ? '99+' : waiting}) ${base}` : base; return () => { document.title = base; }; }, [waiting]);
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);

  const [q, setQ] = useState(''); const jump = useRef<HTMLInputElement>(null);
  const matches = q.trim() ? items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 7) : [];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === '/' && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '')) { e.preventDefault(); jump.current?.focus(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);

  const current = useMemo(() => [...items].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? loc.pathname === i.to : loc.pathname === i.to || loc.pathname.startsWith(i.to + '/'))), [items, loc.pathname]);
  const roles = me?.roles ?? [];
  // Each area is its own world with its own sign-in; the only way out is the shop.
  const areas = [{ to: '/', label: 'Shop' }];
  const windowOf = tone === 'chef' ? 'vendor' : tone;
  const [pw, setPw] = useState(false);
  const brand = `eazyfoods ${title.replace(/ portal$/i, '')}`;
  const name = me?.full_name ?? '';

  return (
    <div className="portal bo" data-portal={tone}>
      {open && <div className="bo-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`bo-side${open ? ' open' : ''}`} aria-label={`${title} navigation`}>
        <div className="bo-brandbar">
          <Link to={tone === 'chef' ? '/vendor' : `/${tone}`} className="bo-brand"><h1>{brand}</h1></Link>
          <button className="bo-close" aria-label="Close menu" onClick={() => setOpen(false)}><X size={22} /></button>
        </div>
        <nav>
          {items.map((n, i) => {
            const Icon = iconFor(n.label);
            return (
              <Fragment key={n.to}>
              {n.group && n.group !== items[i - 1]?.group && <div className="bo-grouplabel" role="presentation">{n.group}</div>}
              <NavLink to={n.to} end={n.end} className={({ isActive }) => `bo-link${isActive ? ' active' : ''}`}>
                <span className="bo-link-main"><Icon size={20} strokeWidth={1.9} /><span>{n.label}</span></span>
                {n.badge ? <span className="count">{n.badge > 99 ? '99+' : n.badge}</span> : null}
              </NavLink></Fragment>);
          })}
        </nav>
        <div className="bo-user">
          <div className="bo-who">
            <span className="bo-avatar" aria-hidden="true"><User size={20} /></span>
            <div><p className="bo-uname">{name}</p><p className="bo-umail">{me?.email}</p><p className="bo-urole">{roles.map((r) => r.role.replace('_', ' ')).join(', ')}</p></div>
          </div>
          <div className="bo-user-actions">
            {areas.map((a) => <Link key={a.to} to={a.to}>{a.label}</Link>)}
            <button type="button" onClick={() => setPw(true)}>Change password</button>
            <button type="button" onClick={async () => { await logout(); go(`/${windowOf}/signin`); }}><LogOut size={15} /> Sign out</button>
          </div>
        </div>
      </aside>

      <PasswordModal open={pw} onClose={() => setPw(false)} />
      <div className="bo-page">
        <header className="bo-top">
          <button className="bo-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}><Menu size={22} />{waiting > 0 && !open && <span className="bo-dot" aria-label={`${waiting} waiting`} />}</button>
          <div className="bo-jump">
            <Search size={15} />
            <input ref={jump} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Go to…  ( / )" aria-label="Go to a page"
              onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { go(matches[0].to); setQ(''); } if (e.key === 'Escape') setQ(''); }} />
            {matches.length > 0 && <ul className="bo-jump-list" role="listbox">{matches.map((m) => <li key={m.to}><button type="button" onMouseDown={(e) => { e.preventDefault(); go(m.to); setQ(''); }}>{m.label}</button></li>)}</ul>}
          </div>
          <span className="grow" />
          {subtitle && <span className="bo-sub">{subtitle}</span>}
          <span className="bo-topname">{name}</span>
        </header>
        <main className="portal-main bo-main">
          {cfg.data?.notice && <div className={`bo-notice ${cfg.data.notice_tone}`} role="note">{cfg.data.notice}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [done, setDone] = useState(false);
  const save = useAction(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await post('/account/password', { current_password: f.current_password, new_password: f.new_password });
    setDone(true);
  });
  return (
    <Modal open={open} onClose={() => { setDone(false); onClose(); }} title="Change password">
      {done ? <Notice tone="ok">Password changed.</Notice> : (
        <form onSubmit={save.run}>
          {save.error && <Notice tone="error">{save.error}</Notice>}
          <Field label="Current password"><Input name="current_password" type="password" required autoComplete="current-password" /></Field>
          <Field label="New password" hint="At least 10 characters."><Input name="new_password" type="password" required minLength={10} autoComplete="new-password" /></Field>
          <Button type="submit" busy={save.busy}>Change password</Button>
        </form>
      )}
    </Modal>
  );
}
