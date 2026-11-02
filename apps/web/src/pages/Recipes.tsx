import { useState } from 'react';
import { SkelGrid, SkelRows } from '../skeletons';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { money, post } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { useAction, useApi } from '../hooks';
import { Badge, Button, Empty, ErrorBox, Loading, Notice } from '../ui';

export function RecipesPage() {
  const [sp, setSp] = useSearchParams();
  const regions = useApi<{ slug: string; name: string }[]>('/regions');
  const { data, loading, error, reload } = useApi<{ slug: string; title: string; summary: string; servings: number; prep_minutes: number | null; cook_minutes: number | null; region: string | null; country: string | null }[]>(`/recipes${sp.get('region') ? `?region=${sp.get('region')}` : ''}`);
  return (
    <>
      <h1>Recipes</h1>
      <p className="muted">Cook with ingredients you can buy here. We only add what is genuinely in stock.</p>
      <div className="row wrap hscroll" style={{ marginBottom: 12 }}>
        <Button size="sm" variant={sp.get('region') ? 'secondary' : 'primary'} onClick={() => setSp({})}>All</Button>
        {regions.data?.map((r) => <Button key={r.slug} size="sm" variant={sp.get('region') === r.slug ? 'primary' : 'secondary'} onClick={() => setSp({ region: r.slug })}>{r.name}</Button>)}
      </div>
      {loading && <SkelGrid n={6} label="Loading recipes" />}{error && <ErrorBox message={error} retry={reload} />}
      {data && !data.length && <Empty title="No recipes here yet" />}
      <ul className="cards stores" role="list">{data?.map((r) => <li key={r.slug}><Link to={`/recipes/${r.slug}`} className="card"><div className="card-body" style={{ padding: 14 }}><h3>{r.title}</h3><span className="muted small">{r.summary}</span><span className="small">{[r.country ?? r.region, `${r.servings} servings`, r.cook_minutes ? `${(r.prep_minutes ?? 0) + r.cook_minutes} min` : null].filter(Boolean).join(' · ')}</span></div></Link></li>)}</ul>
    </>
  );
}

type Recipe = { title: string; summary: string; region: string | null; country: string | null; servings: number; prep_minutes: number | null; cook_minutes: number | null; steps: string[]; food_safety_note: string | null; reviewed: boolean; ai_generated: boolean;
  ingredients: { label: string; quantity_text: string | null; optional: boolean; product_slug: string | null; product_name: string | null; available_from: { offer_id: string; price_cents: number; store_name: string; store_slug: string } | null; alternatives: { slug: string; name: string; note: string | null }[] }[] };

export function RecipePage() {
  const { slug } = useParams(); const { me } = useAuth(); const { refresh } = useCart();
  const { data: r, loading, error, reload } = useApi<Recipe>(`/recipes/${slug}`);
  if (loading) return <SkelRows n={4} label="Loading recipe" />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!r) return null;
  return (
    <article className="prose">
      <h1>{r.title}</h1>
      <p className="muted">{[r.country ?? r.region, `Serves ${r.servings}`, r.prep_minutes != null ? `Prep ${r.prep_minutes} min` : null, r.cook_minutes != null ? `Cook ${r.cook_minutes} min` : null].filter(Boolean).join(' · ')}</p>
      <p>{r.summary}</p>
      {!r.reviewed && <Notice tone="warn"><strong>Draft recipe{r.ai_generated ? ', written with AI assistance' : ''} and not yet reviewed by a person.</strong> Check ingredient labels for allergens. Availability and prices below come from real store listings.</Notice>}
      <h2>Ingredients</h2>
      <ShoppableIngredients recipe={r} slug={slug!} />
      <h2>Method</h2>
      <ol className="recipe-steps">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {r.food_safety_note && <Notice><strong>Food safety:</strong> {r.food_safety_note}</Notice>}
    </article>
  );
}

/** The ingredient list with a tick box on every ingredient that is in stock: tick what you need, see the total, add it all in one tap (signed in or not). */
function ShoppableIngredients({ recipe: r, slug }: { recipe: Recipe; slug: string }) {
  const { setQty, qtyOf } = useCart();
  const stocked = r.ingredients.map((i, k) => (i.product_slug && i.available_from ? k : -1)).filter((k) => k >= 0);
  const [picked, setPicked] = useState<Set<number>>(() => new Set(stocked.filter((k) => !r.ingredients[k].optional)));
  const [busy, setBusy] = useState(false); const [done, setDone] = useState<string[] | null>(null);
  const toggle = (k: number) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const chosen = [...picked].filter((k) => r.ingredients[k].available_from);
  const total = chosen.reduce((a, k) => a + r.ingredients[k].available_from!.price_cents, 0);
  const add = async () => {
    setBusy(true); const names: string[] = [];
    try {
      for (const k of chosen) {
        const i = r.ingredients[k], o = i.available_from!;
        await setQty({ offer_id: o.offer_id, slug: i.product_slug!, name: i.product_name ?? i.label, unit_price_cents: o.price_cents, store_name: o.store_name, store_slug: o.store_slug, pack: '' }, Math.max(1, qtyOf(o.offer_id)));
        names.push(i.label);
      }
      setDone(names);
    } finally { setBusy(false); }
  };
  return (
    <>
      <ul className="shop-ings" role="list">
        {r.ingredients.map((i, k) => {
          const buy = i.product_slug && i.available_from;
          return (
            <li key={k}>
              {buy ? <label className="shop-ing"><input type="checkbox" checked={picked.has(k)} onChange={() => toggle(k)} aria-label={`Add ${i.label} to my basket`} />
                <span>{i.quantity_text ? `${i.quantity_text} ` : ''}{i.label}{i.optional && <span className="muted"> (optional)</span>}
                  <small className="muted"> · <Link to={`/p/${i.product_slug}`}>{money(i.available_from!.price_cents)}</Link> at {i.available_from!.store_name}</small></span></label>
                : <span className="shop-ing off"><span>{i.quantity_text ? `${i.quantity_text} ` : ''}{i.label}{i.optional && <span className="muted"> (optional)</span>}
                  {i.product_slug && <span> · <Badge tone="warn">not in stock right now</Badge>{i.alternatives.length > 0 && <span className="small"> Try: {i.alternatives.map((a, n) => <span key={a.slug}>{n ? ', ' : ''}<Link to={`/p/${a.slug}`}>{a.name}</Link></span>)}</span>}</span>}</span></span>}
            </li>);
        })}
      </ul>
      {stocked.length > 0 && (
        <div className="panel shop-ings-bar" aria-label="Add this recipe to your basket">
          <Button onClick={add} busy={busy} disabled={!chosen.length}>{chosen.length ? `Add ${chosen.length} item${chosen.length === 1 ? '' : 's'} · ${money(total)} to my basket` : 'Tick what you need'}</Button>
          <p className="small muted" style={{ marginBottom: 0 }}>One pack of each ticked ingredient, from the cheapest store that has it. Change quantities in the basket.</p>
          {done && <Notice tone="ok">Added: {done.join(', ') || 'nothing'}. <Link to="/cart">View basket</Link></Notice>}
        </div>)}
    </>
  );
}
