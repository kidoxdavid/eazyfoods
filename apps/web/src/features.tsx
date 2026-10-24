import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

type Flags = Record<string, boolean>;
const C = createContext<Flags>({});

/** The shop's feature switches (set by an admin in the Control centre). Until they load, everything counts as on, so nothing flickers away. */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Flags>({});
  useEffect(() => {
    let live = true;
    api<Flags>('/features').then((f) => live && setFlags(f), () => {});
    return () => { live = false; };
  }, []);
  return <C.Provider value={flags}>{children}</C.Provider>;
}

/** useFeature('shop.tips') is false only when an admin has switched it off. */
export const useFeature = (key: string) => useContext(C)[key] !== false;
export const useFeatures = () => { const f = useContext(C); return (key: string) => f[key] !== false; };
