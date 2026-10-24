import { pool } from '../db/pool.js';
import { config, isProd } from '../config.js';

/** Search engines index only a production site (or when SEO_INDEX is on). The demo and staging sites stay out of Google. */
export const seoIndexing = () => (process.env.SEO_INDEX ? process.env.SEO_INDEX === 'true' || process.env.SEO_INDEX === '1' : isProd);

export const siteOrigin = (hostHeader?: string, proto = 'https') => {
  const o = config.WEB_ORIGIN.replace(/\/$/, '');
  if (!/localhost|127\.0\.0\.1/.test(o)) return o;
  return hostHeader ? `${proto}://${hostHeader}` : o;
};

export type Seo = { title: string; description: string; canonical: string; image?: string; type?: 'website' | 'product' | 'article'; noindex?: boolean; jsonLd?: object[] };

const NOINDEX = /^\/(cart|checkout|orders|account|lists|alerts|credit|signin|register|forgot|reset|verify|unsubscribe|l\/|admin|vendor|driver|marketing|api)/;
const clip = (s: string | null | undefined, n = 155) => { const t = (s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const SITE = 'EAZyfoods';
const DEFAULT_DESC = 'Shop authentic African groceries from local stores in Calgary. Compare prices, order for delivery or pickup, and order from home chefs.';

/** Work out the title, description, canonical link and structured data for a public path. Never includes private data (kitchen street addresses, customer details). */
export async function seoFor(path: string, origin: string): Promise<Seo> {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  const abs = (u?: string | null) => (u ? (u.startsWith('http') ? u : origin + u) : undefined);
  const base: Seo = { title: `${SITE} – African groceries from local stores`, description: DEFAULT_DESC, canonical: origin + (clean === '/' ? '/' : clean) };
  if (NOINDEX.test(clean)) return { ...base, title: SITE, noindex: true };

  let m: RegExpMatchArray | null;
  if ((m = clean.match(/^\/p\/([^/]+)$/))) {
    const p = (await pool.query(
      `SELECT p.id, p.name, p.description, b.name AS brand, c.name AS category, (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image,
              (SELECT min(o.price_cents) FILTER (WHERE o.stock_on_hand > o.stock_reserved) FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE o.product_id = p.id AND o.is_active) AS low,
              (SELECT max(o.price_cents) FILTER (WHERE o.stock_on_hand > o.stock_reserved) FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE o.product_id = p.id AND o.is_active) AS high,
              (SELECT count(DISTINCT o.store_id)::int FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE o.product_id = p.id AND o.is_active AND o.stock_on_hand > o.stock_reserved) AS stores,
              (SELECT CASE WHEN count(*) >= 3 THEN round(avg(r.rating)::numeric, 1)::float END FROM reviews r WHERE r.product_id = p.id AND NOT r.is_hidden) AS rating,
              (SELECT count(*)::int FROM reviews r WHERE r.product_id = p.id AND NOT r.is_hidden) AS reviews
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = $1 AND p.status = 'published'`, [m[1]])).rows[0];
    if (!p) return { ...base, noindex: true };
    const price = p.low != null ? ` From $${(p.low / 100).toFixed(2)}.` : '';
    const ld: any = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: clip(p.description, 300) || undefined, image: abs(p.image), brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined, category: p.category ?? undefined };
    if (p.low != null) ld.offers = { '@type': 'AggregateOffer', priceCurrency: 'CAD', lowPrice: (p.low / 100).toFixed(2), highPrice: (p.high / 100).toFixed(2), offerCount: p.stores, availability: 'https://schema.org/InStock' };
    if (p.rating != null) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews };   // only once there are 3+ verified reviews, same rule as the page
    return { title: `${p.name}${p.brand ? ` by ${p.brand}` : ''} – ${SITE}`, description: clip(`${p.description ?? `Buy ${p.name} online from local African grocers in Calgary.`}${price}`), canonical: `${origin}/p/${m[1]}`, image: abs(p.image), type: 'product', jsonLd: [ld] };
  }
  if ((m = clean.match(/^\/s\/([^/]+)$/))) {
    const s = (await pool.query(`SELECT name, description, city, cover_url, logo_url FROM storefronts WHERE slug = $1 AND orderable AND kind = 'grocery'`, [m[1]])).rows[0];
    if (!s) return { ...base, noindex: true };
    return { title: `${s.name} – ${SITE}`, description: clip(s.description ?? `Order from ${s.name}, an African grocery store in ${s.city ?? 'Calgary'}, for delivery or pickup.`), canonical: `${origin}/s/${m[1]}`, image: abs(s.cover_url ?? s.logo_url),
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'GroceryStore', name: s.name, description: clip(s.description, 300) || undefined, image: abs(s.cover_url ?? s.logo_url), address: { '@type': 'PostalAddress', addressLocality: s.city ?? 'Calgary', addressRegion: 'AB', addressCountry: 'CA' } }] };
  }
  if ((m = clean.match(/^\/k\/([^/]+)$/))) {
    // Home kitchens: name, cuisine and area only. The cook's street address is never published.
    const s = (await pool.query(`SELECT name, description, city, cover_url, logo_url FROM storefronts WHERE slug = $1 AND orderable AND kind = 'kitchen'`, [m[1]])).rows[0];
    if (!s) return { ...base, noindex: true };
    return { title: `${s.name} – home kitchen on ${SITE}`, description: clip(s.description ?? `Home-cooked meals from ${s.name} in ${s.city ?? 'Calgary'}. Order for delivery or pickup.`), canonical: `${origin}/k/${m[1]}`, image: abs(s.cover_url ?? s.logo_url),
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'FoodEstablishment', name: s.name, description: clip(s.description, 300) || undefined, image: abs(s.cover_url ?? s.logo_url), address: { '@type': 'PostalAddress', addressLocality: s.city ?? 'Calgary', addressRegion: 'AB', addressCountry: 'CA' } }] };
  }
  if ((m = clean.match(/^\/recipes\/([^/]+)$/))) {
    const r = (await pool.query(`SELECT title, summary, servings, prep_minutes, cook_minutes FROM recipes WHERE slug = $1 AND status = 'published'`, [m[1]])).rows[0];
    if (!r) return { ...base, noindex: true };
    const iso = (min: number | null) => (min ? `PT${min}M` : undefined);
    return { title: `${r.title} recipe – ${SITE}`, description: clip(r.summary ?? `How to cook ${r.title}, with the ingredients you can order here.`), canonical: `${origin}/recipes/${m[1]}`, type: 'article',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Recipe', name: r.title, description: clip(r.summary, 300) || undefined, recipeYield: r.servings ? `${r.servings} servings` : undefined, prepTime: iso(r.prep_minutes), cookTime: iso(r.cook_minutes) }] };
  }
  if ((m = clean.match(/^\/pages\/([^/]+)$/))) {
    const pg = (await pool.query('SELECT title, body FROM pages WHERE slug = $1', [m[1]])).rows[0];
    if (!pg) return { ...base, noindex: true };
    return { title: `${pg.title} – ${SITE}`, description: clip(pg.body.replace(/^#+\s.*$/gm, '').replace(/[*_`]/g, '')) || DEFAULT_DESC, canonical: `${origin}/pages/${m[1]}` };
  }
  const fixed: Record<string, [string, string]> = {
    '/': [base.title, DEFAULT_DESC],
    '/deals': [`Weekly deals – ${SITE}`, 'Live sales on African pantry staples from local stores, priced as you will pay.'],
    '/flyer': [`Weekly flyer – ${SITE}`, 'This week’s sales and multi-buy offers from Calgary African grocers, in one printable flyer.'],
    '/new': [`New arrivals – ${SITE}`, 'Recently added African groceries and ingredients.'],
    '/stores': [`African grocery stores in Calgary – ${SITE}`, 'Independent African grocers with their own prices and stock. Compare delivery to your area.'],
    '/recipes': [`African recipes – ${SITE}`, 'Recipes from across Africa, with the ingredients ready to order.'],
    '/kitchens': [`Home chefs in Calgary – ${SITE}`, 'Home-cooked African meals from local cooks.'],
    '/search': [`Shop African groceries – ${SITE}`, DEFAULT_DESC],
    '/help': [`Help centre – ${SITE}`, 'Answers about orders, delivery, refunds, tips and store credit.'],
  };
  if (fixed[clean]) return { ...base, title: fixed[clean][0], description: fixed[clean][1],
    jsonLd: clean === '/' ? [{ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: origin + '/', potentialAction: { '@type': 'SearchAction', target: `${origin}/search?q={query}`, 'query-input': 'required name=query' } }] : undefined };
  return base;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Put the page's own title, description, canonical link, social tags and structured data into the HTML head. */
export function applySeo(html: string, seo: Seo, indexable: boolean): string {
  const tags = [
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<link rel="canonical" href="${esc(seo.canonical)}" />`,
    `<meta property="og:site_name" content="EAZyfoods" /><meta property="og:type" content="${seo.type === 'product' ? 'product' : seo.type ?? 'website'}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" /><meta property="og:description" content="${esc(seo.description)}" /><meta property="og:url" content="${esc(seo.canonical)}" />`,
    seo.image ? `<meta property="og:image" content="${esc(seo.image)}" /><meta name="twitter:card" content="summary_large_image" />` : `<meta name="twitter:card" content="summary" />`,
    !indexable || seo.noindex ? `<meta name="robots" content="noindex, nofollow" />` : '',
    ...(seo.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].filter(Boolean).join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(seo.title)}</title>`)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

export async function sitemapXml(origin: string): Promise<string> {
  const q = async (sql: string) => (await pool.query(sql)).rows as { slug: string; at: Date | null }[];
  const urls: [string, Date | null][] = [['/', null], ['/deals', null], ['/flyer', null], ['/new', null], ['/stores', null], ['/recipes', null], ['/kitchens', null], ['/help', null]];
  for (const r of await q(`SELECT p.slug, NULL::timestamptz AS at FROM products p WHERE p.status = 'published' AND EXISTS (SELECT 1 FROM offers_live o JOIN storefronts s ON s.id = o.store_id AND s.orderable WHERE o.product_id = p.id AND o.is_active) ORDER BY p.slug LIMIT 40000`)) urls.push([`/p/${r.slug}`, r.at]);
  for (const r of await q(`SELECT slug, NULL::timestamptz AS at FROM storefronts WHERE orderable AND kind = 'grocery' ORDER BY slug`)) urls.push([`/s/${r.slug}`, r.at]);
  for (const r of await q(`SELECT slug, NULL::timestamptz AS at FROM storefronts WHERE orderable AND kind = 'kitchen' ORDER BY slug`)) urls.push([`/k/${r.slug}`, r.at]);
  for (const r of await q(`SELECT slug, NULL::timestamptz AS at FROM recipes WHERE status = 'published' ORDER BY slug`)) urls.push([`/recipes/${r.slug}`, r.at]);
  for (const r of await q(`SELECT slug, NULL::timestamptz AS at FROM pages WHERE needs_legal_review = false ORDER BY slug`)) urls.push([`/pages/${r.slug}`, r.at]);
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, at]) => `<url><loc>${e(origin + u)}</loc>${at ? `<lastmod>${new Date(at).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}

export function robotsTxt(origin: string, indexable: boolean): string {
  if (!indexable) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nDisallow: /api/\nDisallow: /admin\nDisallow: /vendor\nDisallow: /driver\nDisallow: /marketing\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\nDisallow: /orders\nDisallow: /lists\nDisallow: /alerts\nDisallow: /credit\n\nSitemap: ${origin}/sitemap.xml\n`;
}
