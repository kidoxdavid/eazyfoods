import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { put } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { paletteCss } from '../../theme';
import { Button, Card, ErrorBox, Field, Input, Loading, Notice, PageHeader, Textarea } from '../../ui';
import { StoreSelect, useVendor } from './Shared';

type Accent = { key: string; label: string; primary: string; deep: string; tint: string; glow: string };
type Branding = { accent: string | null; tagline: string | null; story: string | null; announcement: string | null; featured_slugs: string[]; website: string | null; instagram: string | null; facebook: string | null; accents: Accent[]; products: { slug: string; name: string }[] };

export default function Storefront() {
  const { storeId } = useVendor();
  return (<><PageHeader title="Storefront" sub="Make your store page yours: colour, story, announcement and featured products." /><StoreSelect /><Editor key={storeId} /></>);
}

function Editor() {
  const { storeId, store } = useVendor(); const toast = useToast();
  const b = useApi<Branding>(`/vendor/stores/${storeId}/branding`);
  const [f, setF] = useState<Branding | null>(null);
  useEffect(() => { if (b.data) setF(b.data); }, [b.data]);
  const save = useAction(async () => {
    if (!f) return;
    await put(`/vendor/stores/${storeId}/branding`, { accent: f.accent, tagline: f.tagline, story: f.story, announcement: f.announcement, featured_slugs: f.featured_slugs, website: f.website || null, instagram: f.instagram || null, facebook: f.facebook || null });
    toast('Storefront saved. It is live now.'); b.reload();
  });
  if (b.loading && !f) return <Loading />;
  if (b.error) return <ErrorBox message={b.error} retry={b.reload} />;
  if (!f) return null;
  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => setF({ ...f, [k]: v });
  const acc = f.accents.find((a) => a.key === f.accent) ?? { primary: '#1f5b3a', deep: '#15412a', tint: '#dcefe2', glow: '#72c795' };
  const toggle = (slug: string) => set('featured_slugs', f.featured_slugs.includes(slug) ? f.featured_slugs.filter((s) => s !== slug) : f.featured_slugs.length < 8 ? [...f.featured_slugs, slug] : f.featured_slugs);
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.run(); }}>
      {save.error && <Notice tone="error">{save.error}</Notice>}
      <Card>
        <h2>Brand colour</h2>
        <p className="small muted">Your store page, buttons and highlights use this colour. Each option is checked to be easy to read, in light and dark mode.</p>
        <div className="accent-pick" role="group" aria-label="Brand colour">
          <button type="button" aria-pressed={!f.accent} onClick={() => set('accent', null)}><i style={{ background: '#1f5b3a' }} aria-hidden="true" />EAZyfoods green</button>
          {f.accents.map((a) => <button type="button" key={a.key} aria-pressed={f.accent === a.key} onClick={() => set('accent', a.key)}><i style={{ background: a.primary }} aria-hidden="true" />{a.label}</button>)}
        </div>
        <div className="store-page" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <style>{paletteCss(acc, '.store-page')}</style>
          <div><strong style={{ fontSize: '1.2rem', color: 'var(--green-2)' }}>{store.name}</strong>{f.tagline && <p className="tagline">{f.tagline}</p>}</div>
          {f.announcement && <div className="store-ann">{f.announcement}</div>}
          <div className="catchips" aria-hidden="true"><button type="button" className="on" tabIndex={-1}>Preview</button></div>
        </div>
      </Card>
      <Card>
        <h2>Words</h2>
        <Field label="Tagline" hint="One short line under your store name."><Input value={f.tagline ?? ''} maxLength={80} onChange={(e) => set('tagline', e.target.value)} /></Field>
        <Field label="Announcement" hint="A highlighted note at the top of your store page, e.g. holiday hours. Only say what is true."><Input value={f.announcement ?? ''} maxLength={140} onChange={(e) => set('announcement', e.target.value)} /></Field>
        <Field label="Our story" hint="Who you are, where your products come from."><Textarea value={f.story ?? ''} maxLength={1200} onChange={(e) => set('story', e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Website" hint="Starts with https://"><Input type="url" value={f.website ?? ''} onChange={(e) => set('website', e.target.value)} /></Field>
          <Field label="Instagram"><Input type="url" value={f.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} /></Field>
          <Field label="Facebook"><Input type="url" value={f.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} /></Field>
        </div>
      </Card>
      <Card>
        <h2>Featured products <span className="muted small">({f.featured_slugs.length}/8)</span></h2>
        <p className="small muted">Shown first on your store page.</p>
        {f.products.length ? <div className="check-list" role="group" aria-label="Featured products">{f.products.map((p) => (
          <label key={p.slug} className="check"><input type="checkbox" checked={f.featured_slugs.includes(p.slug)} onChange={() => toggle(p.slug)} disabled={!f.featured_slugs.includes(p.slug) && f.featured_slugs.length >= 8} />{p.name}</label>
        ))}</div> : <p className="muted">Add products to your inventory first.</p>}
      </Card>
      <div className="row end">{store.orderable && <Link className="btn ghost" to={`/s/${store.slug}`} target="_blank" rel="noopener">View my store<span className="sr-only"> (opens in a new tab)</span></Link>}<Button type="submit" busy={save.busy}>Save storefront</Button></div>
    </form>
  );
}
