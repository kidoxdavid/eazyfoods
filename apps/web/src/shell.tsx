import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useFeatures } from './features';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { money, type Region } from './api';
import { useApi } from './hooks';
import { useSiteTheme } from './theme';
import { useAuth } from './auth';
import { useCart } from './cart';
import { usePlace } from './place';
import { IconBasket, IconChevron, IconClose, IconHome, IconKitchen, IconMenu, IconOrders, IconPin, IconSearch, IconStore, IconUser } from './icons';
import { Button, Field, Input, Modal, Notice } from './ui';
import { LangSwitch, useT } from './i18n';
import { InstallApp } from './pwa';

function PlaceModal() {
  const { place, check, clear, open, setOpen } = usePlace();
  const [err, setErr] = useState<string>(); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setErr(undefined);
    try { await check(String(new FormData(e.currentTarget).get('postal'))); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Where should we deliver?">
      <p className="muted">Enter your postal code to see whether we deliver to you and what it costs. You choose your exact address at checkout.</p>
      <form onSubmit={submit} className="row top">
        <div className="grow"><Field label="Postal code"><Input name="postal" defaultValue={place?.postal ?? ''} placeholder="T2A 0A0" autoComplete="postal-code" required /></Field></div>
        <Button type="submit" busy={busy} style={{ marginTop: 26 }}>Check</Button>
      </form>
      {err && <Notice tone="error">{err}</Notice>}
      {place && (place.serviceable
        ? <Notice tone="ok"><strong>Yes, we deliver to {place.fsa}.</strong> {place.zone}: delivery fee {money(place.fee_cents)} per store{place.free_over_cents ? `, free when that store’s items come to ${money(place.free_over_cents)}+` : ''}, about {place.eta_minutes} minutes after the store confirms.</Notice>
        : <Notice tone="warn"><strong>We don’t deliver to {place.fsa} yet.</strong> You can still browse, and stores that offer pickup may be an option.</Notice>)}
      {place && <button className="link" onClick={clear}>Clear location</button>}
    </Modal>
  );
}

/** A collapsible section on phones; on desktop the sections are always open and the header is plain text. */
function Acc({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: (id: string | null) => void; children: ReactNode }) {
  return (
    <div className={`acc${open ? ' open' : ''}`}>
      <button type="button" className="acc-head" aria-expanded={open} onClick={() => onToggle(open ? null : id)}><h3>{title}</h3><IconChevron /></button>
      <div className="acc-body">{children}</div>
    </div>
  );
}

function Mega({ onClose, closing }: { onClose: () => void; closing: boolean }) {
  const on = useFeatures();
  const t = useT();
  const regions = useApi<Region[]>('/regions');
  const cats = useApi<{ slug: string; name: string }[]>('/categories');
  const loc = useLocation();
  const [openSec, setOpenSec] = useState<string | null>('region');
  const [openRegion, setOpenRegion] = useState<string | null>(null);
  // Close when the location actually changes. Comparing values (not counting runs) is robust to React StrictMode,
  // which runs effects twice on mount in development and previously made the menu close the instant it opened.
  const here = loc.pathname + loc.search;
  const opened = useRef(here);
  useEffect(() => { if (opened.current !== here) { opened.current = here; onClose(); } }, [here, onClose]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className={`mega-wrap${closing ? ' closing' : ''}`} aria-hidden={closing || undefined} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mega" role="dialog" aria-label={t('All departments')}>
        <div className="mega-head"><strong>{t('Shop EAZyfoods')}</strong><button className="icon-btn" onClick={onClose} aria-label={t('Close menu')}><IconClose /></button></div>
        <div className="mega-quick" aria-label={t('Quick links')}>
          <Link to="/deals" className="hot">{t('Weekly deals')}</Link>{on('shop.flyer') && <Link to="/flyer">{t('Weekly flyer')}</Link>}<Link to="/new">{t('New arrivals')}</Link><Link to="/recipes">{t('Recipes')}</Link><Link to="/kitchens">{t('Home chefs')}</Link><Link to="/stores">{t('All stores')}</Link>
        </div>
        <div className="mega-cols">
          <Acc id="region" title={t('By region')} open={openSec === 'region'} onToggle={setOpenSec}>
            <ul role="list">{regions.data?.map((r) => (
              <li key={r.slug} className={openRegion === r.slug ? 'open' : ''}>
                <div className="mega-row"><Link to={`/search?region=${r.slug}`}>{r.name}</Link>
                  <button type="button" className="mega-chev" aria-expanded={openRegion === r.slug} aria-label={`${r.name}: show countries`} onClick={() => setOpenRegion(openRegion === r.slug ? null : r.slug)}><IconChevron /></button></div>
                <span className="mega-sub">{r.countries.map((c) => <Link key={c.slug} to={`/search?region=${r.slug}&country=${c.slug}`}>{c.name}</Link>)}</span></li>))}</ul>
          </Acc>
          <Acc id="dept" title={t('By department')} open={openSec === 'dept'} onToggle={setOpenSec}>
            <ul role="list">{cats.data?.map((c) => <li key={c.slug}><Link to={`/search?category=${c.slug}`}>{c.name}</Link></li>)}</ul>
          </Acc>
          <div className="mega-more">
            <Acc id="partner" title={t('Partner with us')} open={openSec === 'partner'} onToggle={setOpenSec}>
              <ul role="list"><li><Link to="/vendor">{t('Sell on EAZyfoods')}</Link></li><li><Link to="/vendor?kind=chef">{t('Cook with us')}</Link></li><li><Link to="/driver">{t('Drive with us')}</Link></li></ul>
            </Acc>
            {on('shop.help_centre') && <h3 className="mega-help"><Link to="/help">{t('Help centre')}</Link></h3>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const on = useFeatures();
  const t = useT();
  const nav = useNavigate(); const loc = useLocation();
  const { me, logout, isStaff, isVendor, has } = useAuth();
  const { count, cart, guest } = useCart();
  const { place, setOpen } = usePlace();
  const [q, setQ] = useState(''); const [dept, setDept] = useState('');
  const [menu, setMenu] = useState(false);
  const regions = useApi<Region[]>('/regions');
  const cats = useApi<{ slug: string; name: string }[]>('/categories');
  const content = useApi<{ announcement?: { text: string; active: boolean } }>('/content/home');
  const { theme } = useSiteTheme();
  const active = loc.pathname === '/search' ? new URLSearchParams(loc.search).get('region') : null;
  const ann = content.data?.announcement;
  const subtotal = cart ? cart.subtotal_cents : guest.reduce((a, g) => a + g.unit_price_cents * g.quantity, 0);
  const submit = (e: FormEvent) => { e.preventDefault(); const p = new URLSearchParams(); if (q.trim()) p.set('q', q.trim()); if (dept) p.set('category', dept); nav(`/search?${p}`); };
  // On phones the header slides away while reading down the page and returns as soon as you scroll up, so the screen is for content.
  const [away, setAway] = useState(false);
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    const on = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY, narrow = window.innerWidth < 600;
        const hide = narrow && y > 140 && y > last + 4 ? true : y < last - 4 || y <= 140 || !narrow ? false : undefined;
        if (hide !== undefined) { setAway(hide); document.documentElement.classList.toggle('hdr-gone', hide); }
        last = y; ticking = false;
      });
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); document.documentElement.classList.remove('hdr-gone'); };
  }, []);
  const [leaving, setLeaving] = useState(false);
  // The menu fades out before it is removed, so closing is as smooth as opening.
  const closeMenu = useRef(() => { setMenu(false); setLeaving(true); setTimeout(() => setLeaving(false), 200); }).current;
  const openMenu = () => { setLeaving(false); setMenu(true); };
  return (
    <>
      {ann?.active && ann.text ? <div className="announce" role="note">{ann.text}</div>
        : theme?.banner_text ? <div className="announce festive" role="note"><span aria-hidden="true">{theme.emoji} </span>{theme.banner_text}{theme.preview && ' (preview)'}</div> : null}
      <header className={`hdr${away && !menu ? ' away' : ''}`}>
        <div className="hdr-util"><div className="wrap">
          <span>{t('Calgary, Alberta · African groceries from local stores')}</span>
          <span className="util-links"><Link to="/vendor">{t('Sell on EAZyfoods')}</Link><Link to="/vendor?kind=chef">{t('Cook with us')}</Link><Link to="/driver">{t('Drive with us')}</Link><Link to="/pages/how-it-works">{t('How it works')}</Link>{on('shop.help_centre') && <Link to="/help">{t('Help')}</Link>}{on('shop.language_switch') && <LangSwitch />}</span>
        </div></div>
        <div className="hdr-main"><div className="wrap hdr-row">
          <button className="icon-btn menu-btn" aria-label={t('Open all departments')} aria-expanded={menu} onClick={openMenu}><IconMenu /></button>
          <Link to="/" className="logo"><img className="logo-mark" src="/logo-192.png" alt="e" width={36} height={36} /><b className="wm">azy<span>foods</span></b></Link>
          <button className="deliver" onClick={() => setOpen(true)}>
            <IconPin width={22} height={22} /><span><small>{t('Deliver to')}</small><b>{place ? `${place.fsa} ${place.serviceable ? '' : '(not yet)'}` : t('Choose location')}</b></span>
          </button>
          <form onSubmit={submit} role="search" className="hsearch">
            <label className="sr-only" htmlFor="dept">{t('Department')}</label>
            <select id="dept" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">{t('All')}</option>{cats.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
            <label className="sr-only" htmlFor="q">{t('Search products, brands and stores')}</label>
            <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search garri, shito, berbere, pondu…')} autoComplete="off" enterKeyHint="search" />
            <button type="submit" aria-label={t('Search')}><IconSearch /></button>
          </form>
          <div className="hacct desktop-only">
            {me ? (<><Link to="/account"><small>{t('Hello')}, {me.full_name.split(' ')[0]}</small><b>{t('Account')}</b></Link><Link to="/orders"><small>{t('Returns &')}</small><b>{t('Orders')}</b></Link></>)
              : (<Link to="/signin"><small>{t('Hello, sign in')}</small><b>{t('Account')}</b></Link>)}
          </div>
          <MiniCart />
        </div></div>
        <nav className="hdr-nav" aria-label="Shop"><div className="wrap hdr-navrow">
          <button className="alldept" onClick={openMenu} aria-expanded={menu}><IconMenu width={18} height={18} /> {t('All departments')}</button>
          {regions.data?.map((r) => <Link key={r.slug} to={`/search?region=${r.slug}`} className={active === r.slug ? 'active' : ''} aria-current={active === r.slug ? 'page' : undefined}>{r.name}</Link>)}
          <Link to="/deals" className="hot">{t('Deals')}</Link><Link to="/new">{t('New')}</Link><Link to="/recipes">{t('Recipes')}</Link><Link to="/stores">{t('Stores')}</Link><Link to="/kitchens">{t('Home chefs')}</Link>
          <span className="grow" />
          <span className="desktop-only navr">{isVendor && <Link to="/vendor">Vendor portal</Link>}{has('driver') && <Link to="/driver">Driver</Link>}{isStaff && <Link to="/admin">Admin</Link>}{me && <button className="link" onClick={logout}>{t('Sign out')}</button>}</span>
        </div></nav>
      </header>
      {(menu || leaving) && <Mega onClose={closeMenu} closing={!menu} />}
      <PlaceModal />
    </>
  );
}

/** The basket button at the top right opens a small preview first (what is in it, the total, View basket / Checkout), instead of jumping to the basket page. */
function MiniCart() {
  const t = useT(); const loc = useLocation();
  const { count, cart, guest } = useCart();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('touchstart', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('touchstart', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const lines = cart
    ? cart.stores.flatMap((st) => st.items.map((i) => ({ id: i.offer_id, name: i.name, qty: i.quantity, unit: i.unit_price_cents, store: st.name, img: i.image_url ?? null })))
    : guest.map((g) => ({ id: g.offer_id, name: g.name, qty: g.quantity, unit: g.unit_price_cents, store: g.store_name, img: null as string | null }));
  const subtotal = cart ? cart.subtotal_cents : guest.reduce((a, g) => a + g.unit_price_cents * g.quantity, 0);
  return (
    <div className="hcart-wrap" ref={box}>
      <button type="button" className="hcart" aria-haspopup="dialog" aria-expanded={open} aria-controls="minicart" onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">Basket, {count} item{count === 1 ? '' : 's'}</span><span className="hcart-ico"><IconBasket width={28} height={28} />{count > 0 && <span className="count">{count}</span>}</span>
        <span className="hcart-txt"><small>{count ? `${count} item${count === 1 ? '' : 's'}` : t('Basket')}</small><b>{count ? money(subtotal) : t('Empty')}</b></span>
      </button>
      {open && (
        <div id="minicart" className="minicart" role="dialog" aria-label={t('Basket preview')}>
          {lines.length === 0 ? <p className="minicart-empty">{t('Your basket is empty.')}</p> : (
            <ul className="minicart-list">{lines.map((l) => (
              <li key={l.id}>{l.img ? <img src={l.img} alt="" loading="lazy" /> : <span className="minicart-ph" aria-hidden />}
                <span className="minicart-name"><b>{l.name}</b><small>{l.store}</small></span>
                <span className="minicart-amt">{l.qty} × {money(l.unit)}<b>{money(l.unit * l.qty)}</b></span></li>))}</ul>)}
          <div className="minicart-total"><span>{t('Subtotal')}</span><b>{money(subtotal)}</b></div>
          <div className="minicart-actions"><Link to="/cart" className="btn secondary">{t('View basket')}</Link>{lines.length > 0 && <Link to="/checkout" className="btn">{t('Checkout')}</Link>}</div>
        </div>)}
    </div>
  );
}

export function TabBar() {
  const t = useT();
  const { count } = useCart(); const { me } = useAuth();
  const tab = (to: string, label: string, Icon: typeof IconHome, end = false) => <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}><Icon /><span>{label}</span></NavLink>;
  return (
    <nav className="tabbar" aria-label="Main">
      {tab('/', t('Shop'), IconHome, true)}{tab('/stores', t('Stores'), IconStore)}{tab('/kitchens', t('Kitchens'), IconKitchen)}
      <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}><IconBasket /><span>{t('Basket')}</span>{count > 0 && <span className="count">{count}</span>}</NavLink>
      {tab('/orders', t('Orders'), IconOrders)}{tab(me ? '/account' : '/signin', me ? t('Account') : t('Sign in'), IconUser)}
    </nav>
  );
}

export function Footer() {
  const on = useFeatures();
  const t = useT();
  const pages = useApi<{ slug: string; title: string }[]>('/pages');
  const regions = useApi<Region[]>('/regions');
  return (
    <footer className="ftr">
      <button className="totop" onClick={() => window.scrollTo({ top: 0 })}>{t('Back to top')}</button>
      <div className="wrap ftr-cols">
        <div><h3>{t('Shop')}</h3><ul role="list">{regions.data?.map((r) => <li key={r.slug}><Link to={`/search?region=${r.slug}`}>{r.name}</Link></li>)}<li><Link to="/deals">{t('Weekly deals')}</Link></li>{on('shop.flyer') && <li><Link to="/flyer">{t('Weekly flyer')}</Link></li>}{on('shop.gift_cards') && <li><Link to="/gift-cards">{t('Gift cards')}</Link></li>}<li><Link to="/new">{t('New arrivals')}</Link></li><li><Link to="/stores">{t('Stores')}</Link></li></ul></div>
        <div><h3>{t('Help')}</h3><ul role="list">{pages.data?.filter((p) => ['how-it-works', 'delivery-policy', 'refund-policy', 'our-guarantee', 'faq'].includes(p.slug)).map((p) => <li key={p.slug}><Link to={`/pages/${p.slug}`}>{p.title}</Link></li>)}{on('shop.help_centre') && <li><Link to="/help">{t('Help centre')}</Link></li>}<li><Link to="/orders">{t('Your orders')}</Link></li>{on('shop.install_app') && <li><InstallApp /></li>}</ul></div>
        <div><h3>{t('Work with us')}</h3><ul role="list"><li><Link to="/vendor">{t('Sell on EAZyfoods')}</Link></li><li><Link to="/vendor?kind=chef">{t('Cook with us')}</Link></li><li><Link to="/driver">{t('Drive with us')}</Link></li><li><Link to="/portals">{t('All portals')}</Link></li></ul></div>
        <div><h3>{t('Legal')}</h3><ul role="list">{pages.data?.filter((p) => ['privacy', 'terms'].includes(p.slug)).map((p) => <li key={p.slug}><Link to={`/pages/${p.slug}`}>{p.title}</Link></li>)}</ul></div>
      </div>
      <div className="ftr-base"><div className="wrap"><strong className="logo"><img className="logo-mark" src="/logo-192.png" alt="" width={28} height={28} /><b className="wm">azy<span>foods</span></b></strong><span>African groceries from local stores, starting in Calgary, Alberta. Prices and availability are set by each store.</span></div></div>
    </footer>
  );
}
