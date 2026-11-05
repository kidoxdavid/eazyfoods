# The prompt to build EAZYstores

_How to use: paste everything below the line into a new Claude Code session in an empty folder with Postgres available. Give it to the model one phase at a time (section 16), and ask it to run the tests and commit at the end of each phase. The EAZyfoods repo (`kidoxdavid/eazyfoods`) is the reference implementation: if it is reachable, the model may copy the generic infrastructure from it and replace the food-specific parts (section 3 lists what is reused and what is removed). Decisions that are mine to change are marked **[ASSUMPTION]**._

---

# BRIEF: Build EAZYstores

## 1. Role and working agreement
You are the sole engineer building a premium, production-quality marketplace end to end in one monorepo. I am a data analyst / data engineer / CRM architect, not a front-end developer, so the product must feel finished without me tweaking CSS.
- **Be honest.** Never claim something works unless you ran it. Keep a running list of *verified* vs *written but never run against the real thing* (Stripe, email, push notifications on real phones, shipping carriers, real devices). Never claim real-device iOS verification.
- **Small change = quick change.** For small requests: change, run the relevant tests, push. For big or risky ones: run the full suites.
- Commit and push to `main` in small steps. Keep `PROJECT_STATUS.md` and `docs/LAUNCH_READINESS.md` current.
- When I send a screenshot, treat it as the truth. When I say "keep it as it was", revert exactly. When I ask for design options, **show mockups first** (static HTML rendered to an image, 3–4 variants) before building.
- Ask only when blocked on something that is mine (money, legal, brand name). Otherwise choose a sensible default, record it in `docs/DECISIONS.md`, and make it a setting in the admin console.

## 2. The product
**EAZYstores** is a multi-seller marketplace for **small businesses and makers who sell non-food goods**: toys, artwork and prints, 3D-printed items, perfumes and fragrance, hair extensions and wigs, handmade pottery and ceramics, jewellery, candles, clothing and accessories, home décor, stationery, plants and planters, and any other physical commodity that is legal to sell. It is the sister product to EAZyfoods (African groceries) and shares its architecture and standards.
- **Buyers** discover distinctive products from independent sellers, buy from several sellers in one basket, and get items shipped, delivered locally, or picked up.
- **Sellers** are people with no technical skill. **Anyone selling any type of commodity must be able to onboard themselves**, set up a branded shop and list a first product in **under 10 minutes on a phone**, with no help from us.
- **Staff** (admin, support, finance, catalogue/trust & safety, marketing) run the platform safely.
- Launch market **[ASSUMPTION]**: Calgary and Alberta first, shipping across Canada, CAD, English with a French-ready i18n layer. Domain and brand name are placeholders (`eazystores.ca`).
- Business model (all settings, never constants) **[ASSUMPTION]**: commission 10% of item value (per-seller override), no listing fees, no monthly fee, optional paid promotion (cost per click, budget-capped), optional "Plus" seller subscription later. Payment-processing fees paid by the platform at first. GST 5% on taxable items and shipping (per-product tax class); provincial tax handling configurable.
- Money is **integer cents (CAD)**, always.

### The feel (this is the most important section)
The brand promise is **premium, calm, classy and effortless**. Think a gallery, not a flea market; closer to a boutique shop than a classifieds site.
- **Simple.** One primary action per screen. Plain language, no jargon ("Ships in 2–3 days", not "fulfilment SLA"). Few menu items. Progressive disclosure: advanced options hide behind "More options".
- **Classy.** Generous white space, large high-quality imagery, restrained warm-neutral palette with one refined accent, a serif display face for headings (for example Fraunces or Cormorant) paired with a clean sans (Inter or similar), subtle shadows, 12–16 px radii, hairline borders, smooth 150–250 ms transitions, no emoji as icons (use a consistent line-icon set), no clutter, no pop-ups on first visit.
- **Fast.** Skeletons not spinners, images optimised (resize, WebP/AVIF, blur-up placeholders, lazy loading), a performance budget (LCP under 2.5 s on 4G for home and product pages), no layout shift.
- **Trustworthy.** Clear returns, buyer protection, verified-seller badges, honest reviews, visible seller identity.
- **Accessible.** WCAG AA contrast enforced by tests, visible focus, keyboard-usable, reduced-motion respected, tap targets at least 44 px.

## 3. Relationship to EAZyfoods
**Reuse the architecture and infrastructure** (rewrite where needed, do not copy food logic): monorepo layout, sessions/auth with six independent sign-in windows, roles and permissions, per-resource authorisation, double-entry ledger, integer-cent money, payment provider interface (mock + Stripe), webhook idempotency, outbox email with editable templates, SSE live updates, first-party analytics and error log, feature flags and settings tables, audit log, uploads validated by bytes and mirrored in the database, video upload with ffmpeg conversion, web push per device and per app, per-portal PWA manifests and service worker, themes engine, ads system with expiry and click counting, test harness (API integration, browser crawl of every page of every area on desktop and phone, responsive audit, axe).
**Remove or replace** (food-specific): regions-by-African-origin, allergens/dietary/nutrition, recipes, home chefs/kitchens and pre-order slots, perishables/expiry, substitutions, store open hours, FSA-only delivery zones, group grocery orders. Their replacements are in sections 5 to 8.

## 4. Stack and layout
TypeScript end to end, modular monolith, npm workspaces, Node 22:
```
apps/api      Fastify + pg (parameterised SQL, no ORM) + zod + vitest integration tests on real Postgres
apps/web      React 18 + Vite: index.html (buyer storefront) and portal.html (all staff and seller apps, Tailwind)
apps/e2e      vitest + playwright-core against the real API and DB; axe; responsive audits
docs/         PRD, ARCHITECTURE (ADRs), DECISIONS, PAYMENTS, SECURITY, DEPLOYMENT, BACKUP_RECOVERY, OPERATIONS, TRUST_AND_SAFETY, SELLER_GUIDE, LAUNCH_READINESS, DESIGN, API (generated)
```
Postgres 14+ (`pg_trgm`, `citext`), forward-only SQL migrations, hosting blueprint for Render, custom domain plan documented (prefer a Render custom domain over a proxy).

## 5. Engineering rules (non-negotiable, learned the hard way)
1. Money = integer cents; largest-remainder allocation; no floats. Double-entry append-only ledger with a deferred balance-check trigger. Orders are paid only from a verified idempotent webhook; provider calls happen after commit.
2. **Orders → seller orders → lines**: one customer order splits into one *seller order* per seller (own shipping, fee, commission, status). Order status and payment status are separate.
3. **Stock**: variants hold `stock_on_hand`/`stock_reserved` with `CHECK (stock_reserved <= stock_on_hand)`; checkout reserves for 15 minutes with `FOR UPDATE` in stable order; payment commits; failure or expiry releases. **One-of-a-kind** items (quantity 1, typical for pottery and original art) must be impossible to oversell; **made-to-order** items reserve nothing but carry capacity limits and lead time.
4. Sessions, not JWTs; HttpOnly SameSite=Lax cookie; hashed tokens; scrypt; Origin check on mutations; rate limits. Independent sign-ins per area (shop, seller studio, admin, support/finance, marketing) chosen by an `x-area` header or API path.
5. Authorisation per resource; seller roles scoped to a seller; staff permissions explicit. If the role table is mirrored in the front end, change both together and test it.
6. **Postgres views freeze `s.*`**: any migration adding a column behind a view must recreate the view.
7. Uploads are validated by magic bytes, stored on disk **and** in the database, served with HTTP Range support. Images get an optimisation pipeline (several sizes, WebP, EXIF stripped for privacy, orientation fixed).
8. Search = Postgres trigram + a curated, *verified* synonym list (for example "wig" ↔ "hair piece"). Typo tolerant. Facets are driven by category attributes. **A product must appear under every category and filter it legitimately belongs to; never rely on one optional tag** (EAZyfoods lost all regional results because products had no country tag).
9. Derive instead of storing what goes stale (an ad or a sale past its end date is *shown* as expired by SQL).
10. Settings in `app_settings` with zod schemas; feature flags table (missing = on); everything admin-editable and audited.
11. Never `SELECT *` across a join in a public API (a joined table's `id` once overwrote the real id).
12. One shared product-card query for every listing; the search route keeps its own copy: keep them in step.
13. Test-time traps: avoid `networkidle` (SSE), strict-mode duplicate locators, Postgres vs Node time-zone data differing by an hour around DST, equal-specificity CSS that loses in the production build (separate CSS chunks), and never `pkill -f` in the sandbox.

## 6. Data model (migrations, in order of concern)
Identity → sellers and shops → catalogue → commerce → operations → growth:
- **Identity**: users, sessions, user_roles, audit_log, app_settings, feature_flags.
- **Sellers/shops**: sellers (legal name, business type, status, verification tier), shops (slug, name, tagline, story, logo, banner, location, policies, vacation mode, processing time, theme choice), seller_documents (optional ID or business number), payout accounts, seller staff accounts.
- **Catalogue**: categories (tree, ~12 launch categories below) with **attribute definitions** per category (typed: text, number with unit, single/multi select, colour, boolean) driving forms and filters; products (title, description, condition, handmade flag, made-in, tax class, status `draft/published/hidden`, one-of-a-kind flag, made-to-order flag and lead time, personalisation fields, shipping profile, dangerous-goods flag), **option sets and variants** (up to 3 options such as Size, Colour, Length, Scent; each variant has its own SKU, price, stock, optional image), product_images and video, product_attributes values, collections (curated by staff or by sellers), tags, **verified synonyms**.
- **Commerce**: carts (per buyer, grouped by seller), orders, seller_orders, order_lines (snapshot title, variant, price, tax, personalisation text/file), reservations, payments, refunds, returns, disputes, ledger_entries, payouts and settlements, shipping_profiles and rates, coupons and sale prices, gift options (message, wrap).
- **Operations**: shipments (carrier, tracking number, status events), local deliveries and pickup, messages (buyer to seller, per product and per order), reviews (with photos, verified purchase only, seller replies), reports (abuse, counterfeit, IP complaints), support tickets, notifications outbox, push subscriptions, ads, analytics events, error log.
- **Growth**: wishlists and favourite shops, recently viewed, seller follow, themes and banners, homepage layout, gift guides (replaces recipes), email campaigns, audiences, rewards credit (optional).

### Launch categories and their attributes **[ASSUMPTION: editable in the admin console]**
Toys and games (age range, material, safety standard declared, battery), Art and prints (medium, original or print, edition size, framed, dimensions), 3D-printed items (material, colour, print-to-order, dimensions, finish), Perfume and fragrance (volume ml, concentration, fragrance family, notes, flammable-shipping flag), Hair extensions and wigs (length, texture, colour, hair type, origin, weight, sold as a set), Pottery and ceramics (technique, glaze, dishwasher/microwave safe, dimensions, one-of-a-kind), Jewellery, Candles and home fragrance, Home décor, Clothing and accessories (size chart), Stationery and paper goods, Plants and planters, plus **Other** with free-form attributes so any commodity seller fits. Every category has an editable *seller tips* panel and a *photo guide*.

## 7. Seller onboarding (the heart of the product)
Goal: **sign-up to first live listing in under 10 minutes, on a phone, with no documentation read.** Self-serve, no approval wait for the first listing (publish immediately; staff review asynchronously; low-risk categories auto-approved, restricted categories queued).
1. **Start**: email or phone sign-up, one screen. "What do you sell?" shows large friendly tiles (Toys, Art, 3D printing, Perfume, Hair, Pottery, Jewellery, Candles, Home, Clothing, Other). The answer pre-fills categories, attribute fields, shipping profile suggestions, policy templates and tips. Selling several kinds is fine.
2. **Shop identity**: name, one-line tagline, logo and banner (camera or gallery, with simple crop), pick one of **five curated shop looks** (cannot be made ugly: constrained colours and layouts), city. Live preview beside the form on desktop, above it on phone.
3. **First product, photo-first**: take or choose photos (reorder by drag, first is the cover); pick category (suggested); title; price; quantity; *only the attributes that matter for that category*; shipping profile. Variants are optional and added with a friendly "Add sizes or colours" flow that builds the combinations table for you. **Autosave drafts**, undo, and "Add another like this" (duplicate). Optional AI-assisted description suggestions are **off by default**, clearly labelled as drafts that the seller edits.
4. **How you'll get paid**: a short Stripe Connect Express onboarding (hosted by Stripe; we never touch bank or identity data). Selling can start before payout setup; payouts wait until it is done, and the dashboard says so kindly.
5. **Policies in plain language**: returns (choose from three templates plus custom, within platform minimums), processing time, shipping destinations, local pickup address if any.
6. **Done screen**: share link and QR code to their shop, a checklist of three optional next steps (add more products, bulk import by CSV, set a free-shipping threshold).
- A persistent **setup checklist** card on the dashboard until complete. Contextual help in every field (an "i" that explains in one sentence). A seller guide in the app and `docs/SELLER_GUIDE.md`.
- Bulk tools for sellers with many items: CSV import (check-only preview first, errors by row in plain words) and bulk edit of price and stock.
- **Restricted and prohibited items** are enforced at listing time with a clear explanation (see section 10).

## 8. Buyer storefront (index.html), mobile-first and installable
- **Header**: quiet logo, search (as-you-type suggestions with products, shops, categories), category menu, wishlist, basket with a mini-cart dropdown, account. Sticky, slim, translucent.
- **Home** (editorial, not a catalogue dump): a calm hero carousel (seasonal themes, staff banners, sponsored slides labelled "Sponsored" with muted looping video that starts when visible, play/pause control, retry on first touch where autoplay is blocked); category tiles with refined illustrated icons; "New from makers"; seller spotlights with a short story; gift guides (by occasion, budget, recipient); "Handmade in Alberta"; collections; recently viewed. Section order editable by staff. The page asks one `/home/shape` endpoint so nothing flashes in and out.
- **Category and search pages**: attribute-driven filters (price, material, colour, size, handmade, ships from, free shipping, rating), sort, clean grid, saved searches optional. Friendly empty states that suggest alternatives.
- **Product cards**: all the same size, always: large image, favourite heart and quick-view on the image, title, seller name, price (with sale price and "was"), rating, "Handmade" or "One of a kind" chip. No buttons on the image beyond heart and quick-view.
- **Product page**: image gallery with zoom and video, variant selectors with live price/stock, personalisation fields with preview (text, optional image upload), shipping estimate by postal code, made-to-order lead time, seller card (logo, story, rating, response time, "Message the seller"), returns summary, reviews with photos, "More from this seller", similar items, sticky buy bar. One-of-a-kind items show "Only 1 available".
- **Cart and checkout**: grouped by seller with each seller's shipping, estimated delivery date range, gift message and gift wrap options, discount codes, store credit, tax shown, guest-friendly where safe, address validation (Canadian postal codes), one clear payment step. Honest multi-seller disclosure ("shipped separately").
- **Orders**: tracking timeline, tracking numbers with carrier links, message the seller (order chat), request return, report a problem, leave a photo review. Wishlists and followed shops. Account with addresses and a **Notifications** toggle (push and email).
- **Seller shop pages** at `/shop/:slug`: banner, logo, story, products, collections, reviews, policies, follow button, in the seller's chosen curated look. Share links with good previews.
- **Mobile**: a floating glass bottom bar (Shop, Categories, Wishlist, Basket, Account) positioned so it never drifts in the iOS home-screen app; date inputs that never spill out; tables that become cards. Light and dark themes.

## 9. Staff and seller apps (portal.html; each its own installable PWA with its own manifest, name, start page and notifications)
- **Seller Studio** (`/studio`): a calm home with *today's tasks* (orders to ship, messages to answer, low stock, setup steps), then **Orders** (accept, print packing slip, add tracking number, mark shipped, handle returns), **Products** (grid and list, bulk edit, variants, drafts), **Inventory**, **Messages**, **Promotions** (discount codes, sales, free-shipping threshold, bundle prices), **Shop page** (simple designer limited to curated looks), **Insights** (views, orders, revenue, top products, simple and honest), **Payouts**, **Settings** (profile, policies, shipping profiles, vacation mode, staff accounts, notification preferences, time zone). Plain language throughout; large touch targets; every table becomes cards on phones; forms never overflow.
- **Admin console** (`/admin`): sellers and verification, shops, catalogue moderation (reports, restricted categories, take-downs), categories and attributes editor, collections and gift guides, homepage and themes, orders, refunds and disputes, users and roles (tidy person-card grid), advertising approvals, platform settings (fees, holds, thresholds, feature flags), system health, KPIs, audit log.
- **Support**, **Finance** (versioned fee rules with approvals, settlements, payouts with hold and approval, reconciliation) and **Marketing** (campaigns, audiences, coupons, content library, ad approvals with the same screen as admin, studio) as separate sign-in windows like EAZyfoods.
- **Local delivery** is an optional seller feature (own delivery or pickup); a driver app is a later phase, not v1.
- Staff areas are plain and dense; the buyer storefront and Seller Studio are the "designed" surfaces.

## 10. Trust and safety (build it, do not defer it)
- **Prohibited items** list enforced in the listing flow and reviewed by staff (counterfeits and fakes, weapons, regulated or age-restricted goods, hazardous goods without proper handling, stolen goods, items infringing intellectual property including unlicensed characters and brands on 3D prints and artwork, and anything illegal). **Restricted** items (for example perfume with flammable shipping rules, child-targeted toys needing safety declarations, human-hair products with sourcing statements) require extra attributes and acknowledgements.
- **Report** buttons on products, shops and reviews; a take-down workflow for IP complaints; repeat-offender handling; audit trail.
- **Seller verification tiers**: email/phone, then payout identity through Stripe, then optional "Verified maker" badge after staff review. Badges: Handmade, Made in Canada, Small batch, Verified maker (each defined and auditable, never decorative).
- **Buyer protection**: item not received or not as described is covered; clear dispute flow with evidence upload; refunds booked to the ledger; hold days (default 5 after delivery) before payout **[ASSUMPTION]**.
- Hair-extension and perfume returns policies reflect hygiene and safety (sellers may mark "final sale if opened" within platform rules, shown clearly before purchase).
- Reviews: verified purchases only, photo support, seller replies, abuse reporting; no review gating.
- Legal drafts (terms, privacy, seller agreement, prohibited items policy) are marked as drafts needing professional review. No legal or tax compliance is claimed.

## 11. Fulfilment and shipping
- Shipping profiles per seller: flat rate, per-item, weight-based, free over a threshold, local delivery, pickup, and "contact me for custom quote". Handling time and estimated delivery windows shown to buyers.
- Carrier integration behind an interface (label purchase and tracking via a Canadian carrier aggregator) as a later phase; v1 supports manual tracking numbers with carrier link formatting and shipment status events.
- Dangerous-goods flag for products such as perfume that restricts shipping methods and shows the right notice.
- Packaging guidance for fragile items (pottery) in seller tips.

## 12. Notifications
Email outbox with editable templates; **web push** per device and per app with an in-app "Turn on notifications / Send a test / Turn off" control that reports real delivery results; valid VAPID subject; each portal is its own PWA. Events: order placed and shipped, message received, return requested, review posted, low stock, payout paid, ad decision (seller); order confirmed, shipped, delivered, seller reply, price drop on wishlist (buyer); reports, disputes, verification requests, refunds, ads waiting (staff). Never push sign-in or reset links.

## 13. Design system
- Tokens on `:root` with dark-mode counterparts; one refined accent (default a deep warm tone, for example a muted terracotta or deep green) plus warm neutrals; shop pages offer five curated looks.
- Two typefaces (serif display, sans body), a type scale, an 8-pt spacing scale, a consistent line-icon set, illustrated empty states, tasteful motion with reduced-motion fallbacks.
- Components are built once and reused: cards, buttons, inputs (≥16 px text, safe date inputs), sheets and dialogs that never overflow, toasts, skeletons, badges, tables-to-cards.
- Mock up the key screens first (home, product page, shop page, seller onboarding step, seller dashboard) as static HTML images and get my approval before building them.

## 14. Testing and quality bar
- API: vitest on a real Postgres test database (rebuilt each run; refuses a name without "test"): auth and authorisation, variants and stock integrity (including one-of-a-kind oversell attempts), checkout and ledger, refunds and disputes, payouts and holds, shipping rates, search and attribute filters, category fallback, ads, push routing, onboarding invariants.
- E2E (real Chromium): cross-role journeys (seller onboards on a phone and lists a product in under the time budget; buyer finds, buys from two sellers, seller ships, buyer reviews), a **crawl of every page of every area on desktop and phone with no console errors**, responsive audit over every route (no horizontal scroll, tap size, contrast), axe scans, performance checks on home and product pages.
- Before each push: type-check, relevant tests, a phone-sized screenshot for any UI change, occasional production build.

## 15. Hosting, launch readiness and honesty
- Render blueprint (Node service + Postgres), documented production settings (`NODE_ENV=production`, Stripe keys, email provider, `WEB_ORIGIN`, `VAPID_*`, `SENTRY_DSN`, `ADMIN_EMAILS`), refuse mock payments in production, no seeding in production, restore drill documented.
- Write `docs/LAUNCH_READINESS.md` in the same style as EAZyfoods: verified vs unverified vs person-only, setup, daily and weekly operations, Stripe go-live checks, real-device checklist, known gaps.
- State plainly at the end of each phase what was verified, what was not, and what I must do next.

## 16. Build order (one phase per message; test and commit at the end of each)
1. **Foundation**: repo, migrations, auth and sessions, roles, settings, flags, categories with attributes, seed, API tests.
2. **Catalogue and sellers**: shops, products, variants, one-of-a-kind and made-to-order, images and video pipeline, search and filters.
3. **Commerce core**: cart per seller, checkout, reservations, seller orders, payments (mock + webhook), ledger, refunds, notifications outbox, jobs.
4. **Design mockups** (approval gate), then the **buyer storefront**: home, category, search, product, shop pages, cart, checkout, orders, account, PWA, dark mode, accessibility.
5. **Seller onboarding and Seller Studio**: the under-10-minute flow, products, orders, inventory, messages, promotions, insights, payouts (Stripe Connect Express).
6. **Admin, Support, Finance, Marketing**: moderation, trust and safety, disputes, settlements, campaigns, themes and homepage.
7. **Engagement**: wishlists, follows, reviews with photos, gift guides, gift options, order chat, recently viewed, wishlist price-drop alerts.
8. **Ads and promotion**: seller ads with image or video, approvals (admin and marketing), carousel slides, expiry, click counting.
9. **Notifications**: web push, per-portal manifests and service worker, event wiring.
10. **Hardening and mobile polish**: responsive audit to zero critical/high, crawl all areas, device quirks, performance, full test runs.
11. **Hosting and launch**: blueprint, custom domain, launch-readiness report.

## 17. Definition of done
Type-checks clean; API suite green; full browser suite green; crawl of every area on desktop and phone with no console errors; responsive audit with 0 critical and 0 high; a recorded timing showing a new seller going from sign-up to a live listing in under 10 minutes on a phone; `docs/LAUNCH_READINESS.md` accurate; everything pushed to `main`; and a final message that lists plainly what was verified, what was not, and what I must do next.
