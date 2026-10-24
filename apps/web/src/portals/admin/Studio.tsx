import { useState } from 'react';
import { useApi, useAction } from '../../hooks';
import { useToast } from '../../toast';
import { Badge, Button, Card, Field, ImageUpload, Input, Modal, Notice, PageHeader, Select, Tabs, Textarea, VideoUpload, Switch } from '../../ui';
import { Fetch, Need, del, post, put, useForm } from './common';

type Palette = { primary: string; deep: string; tint: string; glow: string; hero_from: string; hero_to: string };
type Theme = { id: string; slug: string; name: string; kind: string; emoji: string; motif: string; starts_on: string; ends_on: string; repeats_yearly: boolean; priority: number; status: 'auto' | 'on' | 'off'; palette: Palette;
  headline: string; subtitle: string; cta_label: string; cta_link: string; banner_text: string; notes: string; is_preset: boolean };
type Banner = { id: string; title: string; subtitle: string; cta_label: string; cta_link: string; image_url: string | null; video_url: string | null; from_color: string; to_color: string; status: 'draft' | 'live'; starts_at: string | null; ends_at: string | null; position: number };

const day = (s: string) => s.slice(0, 10);
const fmt = (s: string) => new Date(day(s) + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
const range = (t: Theme) => (t.repeats_yearly ? `${fmt(t.starts_on).replace(/, \d{4}/, '')} – ${fmt(t.ends_on).replace(/, \d{4}/, '')}, every year` : `${fmt(t.starts_on)} – ${fmt(t.ends_on)}`);
const KINDS: Record<string, string> = { festival: 'Festival', season: 'Season', holiday: 'Holiday', custom: 'Custom' };

export default function Studio() {
  const [tab, setTab] = useState('themes');
  return (
    <Need perm={['content.manage']} what="the storefront studio">
      <PageHeader title="Storefront studio" sub="Festival and season themes, homepage banners and homepage layout. Changes go live on the shop straight away." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'themes', label: 'Themes' }, { id: 'banners', label: 'Banners' }, { id: 'layout', label: 'Homepage layout' }]} />
      {tab === 'themes' ? <Themes /> : tab === 'banners' ? <Banners /> : <Layout />}
    </Need>
  );
}

// ---------- Themes ----------
function Themes() {
  const toast = useToast();
  const active = useApi<{ theme: { slug: string } | null }>('/theme/active');
  const [kind, setKind] = useState('all');
  const [edit, setEdit] = useState<Theme | 'new' | null>(null);
  const setStatus = useAction(async (t: Theme, status: string, reload: () => void) => { await post(`/admin/themes/${t.id}/status`, { status }); toast(status === 'on' ? `${t.name} is now forced on` : status === 'off' ? `${t.name} turned off` : `${t.name} follows its dates`); reload(); active.reload(); });
  return (
    <Fetch path="/admin/themes">{(rows: Theme[], reload) => {
      const live = active.data?.theme?.slug;
      const shown = rows.filter((t) => kind === 'all' || t.kind === kind);
      return (
        <>
          <Notice>Pick <strong>Auto</strong> and a theme switches on and off by its dates. <strong>On</strong> forces it now (only one theme can be forced). <strong>Off</strong> never shows it. Festivals that move each year (Easter, Eid, Ramadan, Diwali, Lunar New Year…) carry the next date only: check and update them yearly.</Notice>
          <div className="row between wrap" style={{ margin: '10px 0' }}>
            <div className="seg" role="group" aria-label="Filter themes">{['all', 'festival', 'season', 'holiday', 'custom'].map((k) => <button key={k} className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? 'All' : KINDS[k]}</button>)}</div>
            <Button onClick={() => setEdit('new')}>New theme</Button>
          </div>
          <div className="theme-grid">
            {shown.map((t) => (
              <div key={t.id} className={`theme-card ${live === t.slug ? 'live' : ''}`}>
                <div className="swatch" style={{ background: `linear-gradient(115deg, ${t.palette.hero_from}, ${t.palette.hero_to})` }}><span className="e" aria-hidden="true">{t.emoji}</span>{live === t.slug && <span className="badge ok">Live now</span>}</div>
                <div className="body">
                  <h3>{t.name}</h3>
                  <div className="small muted">{KINDS[t.kind]} · {range(t)}</div>
                  <div className="chips" aria-hidden="true">{[t.palette.primary, t.palette.deep, t.palette.tint, t.palette.glow].map((c) => <span key={c} className="chip-dot" style={{ background: c }} />)}</div>
                  {t.notes.startsWith('MOVES') && <Badge tone="warn">Dates move yearly</Badge>}
                  <div className="seg" role="group" aria-label={`${t.name} mode`}>{(['auto', 'on', 'off'] as const).map((s) => <button key={s} className={t.status === s ? 'on' : ''} aria-pressed={t.status === s} onClick={() => setStatus.run(t, s, reload)}>{s === 'auto' ? 'Auto' : s === 'on' ? 'On' : 'Off'}</button>)}</div>
                  <div className="row"><Button size="sm" variant="secondary" onClick={() => setEdit(t)}>Edit</Button><a className="btn ghost sm" href={`/?preview_theme=${t.slug}`} target="_blank" rel="noopener noreferrer">Preview<span className="sr-only"> {t.name} (opens in a new tab)</span></a></div>
                </div>
              </div>
            ))}
          </div>
          {edit && <ThemeEditor key={edit === 'new' ? 'new' : edit.id} theme={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); active.reload(); }} />}
        </>
      );
    }}</Fetch>
  );
}

const BLANK: Omit<Theme, 'id' | 'slug' | 'is_preset'> = { name: '', kind: 'custom', emoji: '🎉', motif: 'confetti', starts_on: new Date().toISOString().slice(0, 10), ends_on: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), repeats_yearly: false, priority: 50, status: 'auto',
  palette: { primary: '#1f5b3a', deep: '#15412a', tint: '#dcefe2', glow: '#72c795', hero_from: '#0b3a24', hero_to: '#1d7a4c' }, headline: '', subtitle: '', cta_label: 'Start shopping', cta_link: '/search', banner_text: '', notes: '' };

function ThemeEditor({ theme, onClose, onSaved }: { theme: Theme | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const f = useForm<Omit<Theme, 'id' | 'slug' | 'is_preset'>>(theme ? { ...theme, starts_on: day(theme.starts_on), ends_on: day(theme.ends_on) } : BLANK);
  const setP = (k: keyof Palette) => (e: any) => f.setV((s) => ({ ...s, palette: { ...s.palette, [k]: e.target.value } }));
  const body = () => { const { palette, ...rest } = f.v; return { ...rest, palette }; };
  const save = useAction(async () => { if (theme) await put(`/admin/themes/${theme.id}`, body()); else await post('/admin/themes', body()); toast('Theme saved'); onSaved(); });
  const remove = useAction(async () => { if (theme) { await del(`/admin/themes/${theme.id}`); toast('Theme deleted'); onSaved(); } });
  const p = f.v.palette;
  const L: [keyof Palette, string][] = [['primary', 'Main colour'], ['deep', 'Darker shade'], ['tint', 'Light background'], ['glow', 'Dark-mode colour'], ['hero_from', 'Banner start'], ['hero_to', 'Banner end']];
  return (
    <Modal open onClose={onClose} title={theme ? `Edit ${theme.name}` : 'New theme'}>
      {(save.error || remove.error) && <Notice tone="error">{save.error || remove.error}</Notice>}
      <div className="preview-hero" style={{ background: `linear-gradient(115deg, ${p.hero_from}, ${p.hero_to})` }} aria-label="Preview of the homepage banner">
        <small>{f.v.emoji} {f.v.name || 'Theme name'}</small><h4>{f.v.headline || 'Your headline'}</h4><p>{f.v.subtitle}</p><span className="fake-btn">{f.v.cta_label || 'Button'}</span>
      </div>
      <div className="form-grid">
        <Field label="Name"><Input value={f.v.name} onChange={f.set('name')} maxLength={60} /></Field>
        <Field label="Type"><Select value={f.v.kind} onChange={f.set('kind')}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Emoji"><Input value={f.v.emoji} onChange={f.set('emoji')} maxLength={8} /></Field>
        <Field label="Falling decoration"><Select value={f.v.motif} onChange={f.set('motif')}><option value="none">None</option><option value="confetti">Confetti</option><option value="snow">Snow</option><option value="leaves">Leaves</option><option value="stars">Stars</option></Select></Field>
        <Field label="Starts"><Input type="date" value={f.v.starts_on} onChange={f.set('starts_on')} /></Field>
        <Field label="Ends (inclusive)"><Input type="date" value={f.v.ends_on} onChange={f.set('ends_on')} /></Field>
        <Field label="Priority (0–100)" hint="If two themes overlap, the higher number shows."><Input type="number" min={0} max={100} value={f.v.priority} onChange={(e) => f.setV((s) => ({ ...s, priority: Number(e.target.value) }))} /></Field>
        <Field label="Mode"><Select value={f.v.status} onChange={f.set('status')}><option value="auto">Auto (by dates)</option><option value="on">Force on now</option><option value="off">Off</option></Select></Field>
      </div>
      <Switch checked={f.v.repeats_yearly} label="Repeats every year on the same dates" onChange={f.set('repeats_yearly')} />
      <h4>Colours</h4>
      <p className="small muted">The shop’s green becomes your main colour while this theme is live. Pick colours that read clearly: dark enough for white text, and a light version for dark mode.</p>
      <div className="color-row">{L.map(([k, l]) => <label key={k}>{l}<input type="color" value={p[k]} onChange={setP(k)} aria-label={l} /></label>)}</div>
      <h4>Words</h4>
      <Field label="Headline"><Input value={f.v.headline} onChange={f.set('headline')} maxLength={90} /></Field>
      <Field label="Sub-headline"><Textarea value={f.v.subtitle} onChange={f.set('subtitle')} maxLength={220} style={{ minHeight: 60 }} /></Field>
      <div className="form-grid">
        <Field label="Button text"><Input value={f.v.cta_label} onChange={f.set('cta_label')} maxLength={40} /></Field>
        <Field label="Button link" hint="A page on this site, e.g. /deals or /search?region=west-africa"><Input value={f.v.cta_link} onChange={f.set('cta_link')} /></Field>
      </div>
      <Field label="Top-of-shop message" hint="Shown in a coloured strip above the header. Only make claims you can stand behind."><Input value={f.v.banner_text} onChange={f.set('banner_text')} maxLength={160} /></Field>
      <Field label="Notes for your team"><Textarea value={f.v.notes} onChange={f.set('notes')} maxLength={400} style={{ minHeight: 56 }} /></Field>
      <div className="row end">
        {theme && !theme.is_preset && <Button variant="danger" busy={remove.busy} onClick={() => remove.run()}>Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button busy={save.busy} disabled={f.v.name.length < 2 || f.v.headline.length < 2} onClick={() => save.run()}>Save theme</Button>
      </div>
    </Modal>
  );
}

// ---------- Banners ----------
const BLANK_B = { title: '', subtitle: '', cta_label: 'Shop now', cta_link: '/deals', image_url: null as string | null, video_url: null as string | null, from_color: '#0b3a24', to_color: '#1d7a4c', status: 'draft' as 'draft' | 'live', starts_at: '', ends_at: '' };
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
function Banners() {
  const toast = useToast();
  const [edit, setEdit] = useState<Banner | 'new' | null>(null);
  const reorder = useAction(async (ids: string[], reload: () => void) => { await post('/admin/banners/order', { ids }); reload(); });
  return (
    <Fetch path="/admin/banners">{(rows: Banner[], reload) => (
      <>
        <Notice>Live banners appear as slides at the start of the homepage carousel, after the active theme. Use them for sales events, new vendors or announcements.</Notice>
        <div className="row end" style={{ margin: '10px 0' }}><Button onClick={() => setEdit('new')}>New banner</Button></div>
        {!rows.length && <Card><p className="muted">No banners yet.</p></Card>}
        {rows.map((b, i) => (
          <div key={b.id} className="layout-row">
            <span className="chip-dot" style={{ background: `linear-gradient(115deg, ${b.from_color}, ${b.to_color})`, width: 40, borderRadius: 8 }} aria-hidden="true" />
            <span className="grow">{b.title}<span className="small muted" style={{ display: 'block', fontWeight: 400 }}>{b.cta_link}{b.ends_at ? ` · until ${new Date(b.ends_at).toLocaleDateString('en-CA')}` : ''}</span></span>
            <Badge tone={b.status === 'live' ? 'ok' : 'neutral'}>{b.status === 'live' ? 'Live' : 'Draft'}</Badge>
            <Button size="sm" variant="ghost" aria-label={`Move ${b.title} up`} disabled={i === 0} onClick={() => reorder.run(swap(rows, i, i - 1), reload)}>↑</Button>
            <Button size="sm" variant="ghost" aria-label={`Move ${b.title} down`} disabled={i === rows.length - 1} onClick={() => reorder.run(swap(rows, i, i + 1), reload)}>↓</Button>
            <Button size="sm" variant="secondary" onClick={() => setEdit(b)}>Edit</Button>
          </div>
        ))}
        {edit && <BannerEditor key={edit === 'new' ? 'new' : edit.id} b={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={(m) => { toast(m); setEdit(null); reload(); }} />}
      </>
    )}</Fetch>
  );
}
const swap = (rows: Banner[], a: number, b: number) => { const ids = rows.map((r) => r.id); [ids[a], ids[b]] = [ids[b], ids[a]]; return ids; };

function BannerEditor({ b, onClose, onSaved }: { b: Banner | null; onClose: () => void; onSaved: (m: string) => void }) {
  const f = useForm(b ? { ...b, starts_at: local(b.starts_at), ends_at: local(b.ends_at) } : BLANK_B);
  const payload = () => ({ title: f.v.title, subtitle: f.v.subtitle, cta_label: f.v.cta_label, cta_link: f.v.cta_link, image_url: f.v.image_url, video_url: f.v.video_url, from_color: f.v.from_color, to_color: f.v.to_color, status: f.v.status,
    starts_at: f.v.starts_at ? new Date(f.v.starts_at).toISOString() : null, ends_at: f.v.ends_at ? new Date(f.v.ends_at).toISOString() : null });
  const save = useAction(async () => { if (b) await put(`/admin/banners/${b.id}`, payload()); else await post('/admin/banners', payload()); onSaved('Banner saved'); });
  const remove = useAction(async () => { if (b) { await del(`/admin/banners/${b.id}`); onSaved('Banner deleted'); } });
  return (
    <Modal open onClose={onClose} title={b ? 'Edit banner' : 'New banner'}>
      {(save.error || remove.error) && <Notice tone="error">{save.error || remove.error}</Notice>}
      <div className="preview-hero" style={{ background: `linear-gradient(115deg, ${f.v.from_color}, ${f.v.to_color})` }}><h4>{f.v.title || 'Banner title'}</h4><p>{f.v.subtitle}</p><span className="fake-btn">{f.v.cta_label || 'Button'}</span></div>
      <Field label="Title"><Input value={f.v.title} onChange={f.set('title')} maxLength={90} /></Field>
      <Field label="Sub-headline"><Textarea value={f.v.subtitle} onChange={f.set('subtitle')} maxLength={220} style={{ minHeight: 60 }} /></Field>
      <div className="form-grid">
        <Field label="Button text"><Input value={f.v.cta_label} onChange={f.set('cta_label')} maxLength={40} /></Field>
        <Field label="Button link" hint="A page on this site, starting with /"><Input value={f.v.cta_link} onChange={f.set('cta_link')} /></Field>
        <Field label="Show from (optional)"><Input type="datetime-local" value={f.v.starts_at} onChange={f.set('starts_at')} /></Field>
        <Field label="Hide after (optional)"><Input type="datetime-local" value={f.v.ends_at} onChange={f.set('ends_at')} /></Field>
        <Field label="Status"><Select value={f.v.status} onChange={f.set('status')}><option value="draft">Draft (hidden)</option><option value="live">Live</option></Select></Field>
      </div>
      <div className="color-row"><label>Start colour<input type="color" value={f.v.from_color} onChange={f.set('from_color')} aria-label="Start colour" /></label><label>End colour<input type="color" value={f.v.to_color} onChange={f.set('to_color')} aria-label="End colour" /></label></div>
      <p className="small muted">Text on a banner is white, so choose dark colours.</p>
      <span className="label" style={{ fontWeight: 600, fontSize: '.9rem' }}>Background picture (optional)</span>
      <ImageUpload value={f.v.image_url} onChange={(u) => f.setV((s) => ({ ...s, image_url: u }))} label="Banner picture" />
      <span className="label" style={{ fontWeight: 600, fontSize: '.9rem' }}>Background video (optional)</span>
      <VideoUpload value={f.v.video_url} onChange={(u) => f.setV((s) => ({ ...s, video_url: u }))} label="Banner video" />
      {f.v.video_url && <p className="small muted">The picture above is shown while the video loads, and to visitors who have reduced motion or data saving turned on, so add one. Videos have no sound. Make sure the words stay readable over the footage: a dark overlay is added automatically.</p>}
      <div className="row end">
        {b && <Button variant="danger" busy={remove.busy} onClick={() => remove.run()}>Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button busy={save.busy} disabled={f.v.title.length < 2 || !/^\//.test(f.v.cta_link)} onClick={() => save.run()}>Save banner</Button>
      </div>
    </Modal>
  );
}

// ---------- Homepage layout ----------
const LABELS: Record<string, string> = { regions: 'Shop-by-region tiles', deals: 'Today’s deals', departments: 'Shop by department', collections_a: 'Featured collections (first two)', new: 'New arrivals', collections_b: 'Featured collections (next two)', stores: 'Stores near you', kitchens: 'Home chefs', recipes: 'Recipes', trust: 'Trust strip (stores, delivery, help)' };
function Layout() {
  return <Fetch path="/content/home">{(c: any) => <LayoutForm initial={c.home_layout?.sections ?? Object.keys(LABELS).map((id) => ({ id, enabled: true }))} />}</Fetch>;
}
function LayoutForm({ initial }: { initial: { id: string; enabled: boolean }[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(() => [...initial, ...Object.keys(LABELS).filter((id) => !initial.some((r) => r.id === id)).map((id) => ({ id, enabled: true }))]);
  const move = (i: number, j: number) => setRows((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = useAction(async () => { await put('/admin/layout', { sections: rows }); toast('Homepage layout saved'); });
  return (
    <>
      <Notice>Reorder or hide the sections below the carousel. The carousel itself is controlled by Themes and Banners.</Notice>
      {save.error && <Notice tone="error">{save.error}</Notice>}
      <div style={{ marginTop: 10 }}>
        {rows.map((r, i) => (
          <div key={r.id} className={`layout-row ${r.enabled ? '' : 'off'}`}>
            <Switch checked={r.enabled} label={`Show ${LABELS[r.id]}`} onChange={(v) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, enabled: v } : y)))} />
            <span className="grow">{LABELS[r.id]}</span>
            <Button size="sm" variant="ghost" aria-label={`Move ${LABELS[r.id]} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</Button>
            <Button size="sm" variant="ghost" aria-label={`Move ${LABELS[r.id]} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)}>↓</Button>
          </div>
        ))}
      </div>
      <div className="row end"><Button busy={save.busy} onClick={() => save.run()}>Save layout</Button></div>
    </>
  );
}
