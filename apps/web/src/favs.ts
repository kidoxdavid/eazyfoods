import { useEffect, useSyncExternalStore } from 'react';
import { api, del, put } from './api';
import { useAuth } from './auth';

/** One shared set of saved product slugs, so every card on the page shows its heart without a request per card. */
let saved = new Set<string>();
let loaded = false;
const subs = new Set<() => void>();
const emit = () => { saved = new Set(saved); subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

async function load() {
  try { const rows = await api<{ slug: string }[]>('/favourites'); saved = new Set(rows.map((r) => r.slug)); loaded = true; emit(); } catch { /* not signed in or offline: hearts stay empty */ }
}

export function useFavourites() {
  const { me } = useAuth();
  const set = useSyncExternalStore(subscribe, () => saved);
  useEffect(() => {
    if (!me) { if (loaded || saved.size) { saved = new Set(); loaded = false; emit(); } return; }
    if (!loaded) load();
  }, [me]);
  const toggle = async (slug: string) => {
    const on = saved.has(slug);
    if (on) saved.delete(slug); else saved.add(slug);
    emit();
    try { await (on ? del(`/favourites/${slug}`) : put(`/favourites/${slug}`)); }
    catch { if (on) saved.add(slug); else saved.delete(slug); emit(); }   // put it back if the server said no
  };
  return { me, has: (slug: string) => set.has(slug), toggle };
}
