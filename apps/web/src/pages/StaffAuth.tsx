import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { post } from '../api';
import { useAuth } from '../auth';
import { useAction } from '../hooks';
import { Button, ErrorBox, Field, Input, Notice } from '../ui';
import '../portals/backoffice.css';

export type Window = 'admin' | 'marketing' | 'vendor' | 'driver';
const NAME: Record<Window, string> = { admin: 'Admin', marketing: 'Marketing', vendor: 'Vendor, chef and restaurant', driver: 'Driver' };
const BLURB: Record<Window, string> = {
  admin: 'For the EAZyfoods admin. This account opens the admin area only.',
  marketing: 'For the marketing team. Accounts are created by an admin.',
  vendor: 'For stores, home chefs and restaurants that sell on EAZyfoods.',
  driver: 'For delivery drivers.',
};
const values = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; };
const safeNext = (n: string | null, w: Window) => (n && n.startsWith(`/${w}`) && !n.startsWith('//') && !/^\/[a-z]+\/(signin|signup)/.test(n) ? n : `/${w}`);

function Frame({ w, title, children }: { w: Window; title: string; children: React.ReactNode }) {
  return (
    <div className="portal bo" data-portal={w}>
      <main className="bo-auth">
        <div className="bo-authbrand">eazyfoods <span>{NAME[w]}</span></div>
        <h1>{title}</h1>
        {children}
        <p className="small muted center" style={{ marginTop: 20 }}><Link to="/">← Back to the shop</Link></p>
      </main>
    </div>
  );
}

export function StaffSignIn({ area }: { area: Window }) {
  const [sp] = useSearchParams(); const nav = useNavigate(); const { reloadStaff, me, ready } = useAuth();
  const next = safeNext(sp.get('next'), area);
  const go = useAction(async (e: FormEvent<HTMLFormElement>) => { await post('/auth/login', { ...values(e), area }, { 'x-area': area }); await reloadStaff(); nav(next); });
  if (ready && me) return <Navigate to={next} replace />;
  return (
    <Frame w={area} title={`${NAME[area]} sign in`}>
      <form className="auth" onSubmit={go.run}>
        <p className="muted">{BLURB[area]}</p>
        {sp.get('wrong') && <Notice tone="warn">That account cannot open this area. Sign in with a {NAME[area].toLowerCase()} account.</Notice>}
        {go.error && <ErrorBox message={go.error} />}
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password"><Input name="password" type="password" required autoComplete="current-password" /></Field>
        <Button type="submit" size="lg" busy={go.busy}>Sign in</Button>
        {(area === 'vendor' || area === 'driver') && <p className="center">New here? <Link to={`/${area}/signup`}>Create a {area === 'vendor' ? 'vendor' : 'driver'} account</Link></p>}
        <p className="small muted center">This sign-in is separate from the shop. {area === 'admin' || area === 'marketing' ? 'Forgot your password? Ask an admin to reset it.' : ''}</p>
      </form>
    </Frame>
  );
}

export function StaffSignUp({ area }: { area: 'vendor' | 'driver' }) {
  const nav = useNavigate(); const { reloadStaff } = useAuth();
  const go = useAction(async (e: FormEvent<HTMLFormElement>) => { const f = values(e); await post('/auth/register-staff', { email: f.email, password: f.password, full_name: f.full_name, area }, { 'x-area': area }); await reloadStaff(); nav(`/${area}`); });
  return (
    <Frame w={area} title={area === 'vendor' ? 'Create a vendor account' : 'Create a driver account'}>
      <form className="auth" onSubmit={go.run}>
        <p className="muted">{area === 'vendor' ? 'Next you will tell us about your store, kitchen or restaurant. Nothing goes live until our team approves it.' : 'Next you will send your driver application. We verify your licence and run a background check before you can take deliveries.'}</p>
        {go.error && <ErrorBox message={go.error} />}
        <Field label="Full name"><Input name="full_name" required autoComplete="name" /></Field>
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password" hint="At least 10 characters."><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
        <Button type="submit" size="lg" busy={go.busy}>Create account</Button>
        <p className="small muted">By creating an account you agree to our <Link to="/pages/terms">terms</Link> and <Link to="/pages/privacy">privacy policy</Link>. This account is for {area === 'vendor' ? 'selling' : 'driving'} only; it is not a shopping account.</p>
        <p className="center">Already have an account? <Link to={`/${area}/signin`}>Sign in</Link></p>
      </form>
    </Frame>
  );
}
