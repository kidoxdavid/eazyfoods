# The prompt to build EAZyfoods from scratch, to where it is now

_How to use: paste everything below the line into a new Claude Code session in an empty folder (with Postgres available). It is written as one master brief. For best results give it to the model in the phases listed in section 15, one phase per message, and ask it to run the tests and commit at the end of each. This reproduces the system as described here; it will not be byte-identical, because much of the detail came from reacting to screenshots and feedback along the way. Items that were deliberate user preferences are marked **[USER DECISION]**._

---

# BRIEF: Build EAZyfoods

## 1. Your role and how we work
You are the sole engineer building a production-quality marketplace, end to end, in one monorepo. I am a data analyst / data engineer / CRM architect, not a front-end developer. Work as follows:
- **Be honest.** Never claim something works unless you ran it. Keep a list of what is verified vs written-but-unrun (Stripe, email, push on real devices, real phones). Never claim real-device iOS verification.
- **Small change = quick change.** For small requests, make the change, run only the relevant tests, push. For big or risky changes, run the full suites.
- **Commit and push to `main` in small steps** with clear messages. Keep a `PROJECT_STATUS.md` and a `docs/LAUNCH_READINESS.md` current.
- When I send a screenshot, treat the layout in it as the truth. When I say "keep it as it was", revert exactly.
- Prefer showing a **mockup first** when I ask for design options (render static HTML to an image and show 3–4 variants).
- Ask only when blocked by a decision that is mine (money, legal, brand). Otherwise choose sensible defaults, write them down in `docs/DECISIONS.md`, and make them configurable in the admin console.

## 2. The product
**EAZyfoods** is a multi-vendor marketplace for **African groceries and home-cooked meals**, launching with independent African grocers and home chefs in **Calgary, Alberta**. Domain: `eazyfoods.ca`.
- **Shoppers** find the exact brand/size/regional ingredient, compare each store's own price and stock, and get it delivered or pick it up.
- **Stores** (grocers) and **kitchens** (home chefs and restaurants) manage orders, stock, promotions, ads, payouts in one portal, with no developer.
- **Drivers** do local deliveries; **staff** (admin, support, finance, dispatcher, catalogue, marketing) run the platform safely.
- Revenue: commission on merchandise (default 12%), per-store delivery fee ($5.99, free over $75), sponsored ads (cost per click, budget-capped), optional EAZY+ membership. All rates are settings, not constants. Money is **integer cents (CAD)**; GST 5% on standard-rated items and delivery, zero-rated groceries supported per product.
- Everything seeded is **invented test data**, clearly labelled "Demo store". Real photos come from stores; until then, show illustrated product art.

## 3. Stack and repo layout
TypeScript end to end, **modular monolith**, npm workspaces:
```
apps/api      Fastify 5 + pg (parameterised SQL, no ORM) + zod validation + vitest integration tests (real Postgres)
apps/web      React 18 + Vite 5 SPA. TWO entry points: index.html (customer shop) and portal.html (all staff apps, Tailwind)
apps/e2e      vitest + playwright-core (real Chromium against the real API and database), axe accessibility, responsive audits
docs/         PRD, ARCHITECTURE (ADRs), DECISIONS, PAYMENTS, SECURITY, DEPLOYMENT, BACKUP_RECOVERY, OPERATIONS, LAUNCH_CHECKLIST, LAUNCH_READINESS, KPIs, DESIGN, MOBILE_STANDARDS, MOBILE_QA_REGISTER, API (generated)
vercel-proxy/ a tiny vercel.json that fronts the Render app on the custom domain (stopgap)
render.yaml   one-click hosting blueprint (demo settings)
```
- Postgres 14+ with `pg_trgm` and `citext`. Forward-only SQL migrations (`apps/api/migrations/NNN_name.sql`), transactional per file.
- Scripts: `dev`, `migrate`, `seed` (refuses in production), `test`, `typecheck`, `build`, `e2e`, `docs:api`, `lint:audit`.
- Node 22. The API serves the built web app in production (static + SPA fallback; the staff areas fall back to `portal.html`).

## 4. Non-negotiable engineering rules
1. **Money is integer cents.** Largest-remainder allocation so parts sum to the whole. No floats.
2. **Double-entry ledger** (append-only) with a deferred constraint trigger that rejects unbalanced transactions. Every sale, refund, commission, payout books to it.
3. **Stock**: checkout locks offers (`FOR UPDATE`, stable order) and reserves; payment confirmation commits; failure/expiry releases; `CHECK (stock_reserved <= stock_on_hand)`. Hold = 15 min.
4. **Orders → suborders → lines**: one suborder per store (separate fulfilment, fees, ETA, commission). Order status and payment status are separate. Orders are paid **only** from a verified, idempotent webhook.
5. **Provider calls after commit** (`tx(fn, after)`), never while holding row locks.
6. **Sessions, not JWTs**: opaque token in HttpOnly SameSite=Lax cookie; store only its SHA-256; scrypt passwords; reject mismatched `Origin` on mutations; rate-limit auth and sensitive routes (`rl(max, window)` helper; raised in tests).
7. **Six independent sign-ins in one browser** (shop, admin, finance, marketing, vendor, driver), each with its own cookie, chosen by an `x-area` header or by API path. The admin account opens only the admin window.
8. **Authorization is per resource** (own order, own store, own deliveries). Roles in `user_roles`, vendor roles scoped to a vendor. Staff have explicit permissions (`orders.manage`, `refunds.approve`, `ads.manage`, `vendors.manage`, …). The role→permission table exists in the API **and** mirrored in the portal front end: change both.
9. **"Orderable"** = store published AND vendor approved AND not paused, encoded once in a `storefronts` view that also computes open-now in the store's timezone. **Postgres views freeze `s.*`: any migration that adds a column to a table behind a view must recreate the view.**
10. **Uploads** are validated by their bytes (magic numbers), never by name or declared type; stored on disk **and** in the database so a wiped disk loses nothing; served with HTTP Range support (iPhone video needs it).
11. **Search**: Postgres trigram + only *verified* aliases (never imply an unreviewed ingredient equivalence: allergen risk). Typo tolerant. Region/country filters use `product_countries(kind='culinary')`. **A product with no country tag must still show under the regions its store serves** (fallback), and the vendor product form must ask "Where is this food from?".
12. **Derived, not stored, where it can go stale**: e.g. an ad past its end date is *shown* as `expired` by SQL, never relying on a job.
13. **First-party analytics and error log** only (no third-party trackers). Sentry optional via `SENTRY_DSN`.
14. Every list API that feeds a product card uses one shared `CARD_SELECT/CARD_FROM`; the search route has its own copy: keep them in step.
15. Settings live in `app_settings` with zod schemas; **feature flags** in a table (missing row = ON). Both editable in the admin console and audited.
16. Live updates: SSE via `pg_notify('live', topic)` and an `ez-live` window event so pages refresh quietly without spinners or scroll jumps.

## 5. Data model (build as migrations, in this order of concern)
Identity (users, sessions, user_roles, app_settings, audit_log) → taxonomy and catalogue (regions, countries, region_countries, categories, brands, products, product_countries, product_aliases, product_images) → vendors, stores, store_offers (+ offer_tiers multi-buy, offer_promotions, offers_live view), store_hours, store_regions, delivery zones by postal-code FSA → commerce (carts, orders, suborders, order_lines, inventory_reservations, payments, refunds, ledger_entries, coupons) → operations (drivers, deliveries, delivery_events, support_tickets, reviews, ad_campaigns, ad_events, recipes, notifications outbox + editable templates) → plus, over time: studio (themes, banners, homepage layout), vendor messages, kitchens/dishes and pre-order slots, payouts (Stripe Connect Express) and settlements, marketing (audiences, emails, social posts, calendar, budget), gift cards, SMS, rewards credit and EAZY+ points/membership, finance rules and pricing rules (versioned, with approvals), low-stock alerts, remembered substitutions, group orders, order chat, nutrition, push subscriptions, uploaded_files, ad video.

## 6. Customer app (index.html), mobile-first, installable PWA
- **Header**: logo, hamburger, location, basket with count, search bar (search-as-you-type suggestions), a **slim region bar** (West/East/Central/North/Southern Africa, Deals, New, Recipes, Stores, Home chefs). Season/festival strip on top.
- **Home**: big hero **carousel** (theme slide, admin banners, welcome, weekly deals, East Africa, recipes, **sponsored ad slides** labelled "Sponsored", max 2, with video playing muted on a loop when the slide is active, play/pause button, retry autoplay on first touch because iPhone Low Power Mode blocks it); first slide never moves; late slides append; arrows on desktop only; thin minimalist dot pills. **[USER DECISION]** "Your EAZY faves": exactly **4 illustrated tiles on one line** (Weekly deals, Buy again, Weekly flyer or New arrivals, Recipes), small. "Shop by department" with **illustrated colourful icons on gradient tiles** (not flat badges). Regions quads, shelves (deals, new arrivals, collections), stores, kitchens, recipes, trust strip. Section order/visibility editable by admin. The home asks `/home/shape` so nothing appears then vanishes.
- **Product cards [USER DECISION]**: keep the **same size** across designs. Big image area; wishlist heart and quick-view eye on the image; the **Add button is not on the image**; star rating and rating count under the image; unit price line; chips row for delivery/pickup/stock/diet; a "Save $x" tag at the bottom-left of the image. Never let a change alter card dimensions.
- **Store tiles [USER DECISION]**: the divided card layout (cover on top, logo smaller, details below), with star rating.
- **Search page**: facets (category, region, country, store, price, dietary), sort, "Nothing found" with region suggestions.
- **Product page**: gallery, per-store prices side by side, buy box, **sticky buy bar**, nutrition and ingredients panel, dietary/allergen labels, reviews (verified purchasers), Q&A, similar items.
- **Basket/checkout**: per-store grouping with fees disclosed, **time-slot pickers as dropdown selects** (saves space), "You're saving" total, coupons, gift cards, store credit and rewards, tip, substitution preferences (remembered), delivery vs pickup, address with service-area check, tax shown, multi-store disclosure, payment step.
- **Orders**: tracking with live status, **order chat** with store, substitution approval, reorder, "Buy again", report a problem.
- **Account**: rewards points card, EAZY+ trial, buy-again/saved/group-orders/messages shortcuts, addresses, **Notifications toggle**, saved items page with real images.
- **Group orders** (share link, friends add items, deadline), **Shoppable recipes** (add all in-stock ingredients), **Weekly flyer**, **Deals**, gift cards, help centre, policy pages.
- **Bottom tab bar on phones [USER DECISION]**: six tabs (Shop, Products, Kitchens, Basket, Orders, Account), a **floating liquid-glass pill** (translucent, blurred, rounded, positioned with `!important` pins so it never drifts in the iOS standalone app), active tab in a solid bubble; "Products" not "Search". Basket icon opens a **dropdown mini-cart preview** first.
- Light and dark mode; reduced-motion respected; WCAG contrast enforced by tests; no horizontal scroll at 320/360/390/430/768/1280.

## 7. Staff apps (portal.html, Tailwind; each is its own installable app)
Areas by path: `/vendor` (stores; kitchens get the **Chef** variant in the same window, plum colour), `/kitchen` (chef sign-in/sign-up site that hands off to /vendor), `/driver`, `/admin`, `/marketing`, `/finance`, `/portals` (hub). **[USER DECISION]** chef and vendor portals must look distinct (colour, wording), and chefs have their own sign-in/sign-up address `/kitchen` (the footer "Cook with us" must work).
- **Vendor/Chef**: onboarding checklist and documents, store profile, **opening hours** (time-pair rows, as designed), **store time zone selector** (saved; includes "Alberta Time (UTC−6 all year)"), pre-order time slots, products (form with category, **country-of-origin chips**, images, barcode scan with lookup, nutrition), inventory with audit history and CSV import (check-only first), orders workflow (accept/reject/substitute/ready), promotions and multi-buy, reviews with responses, messages, insights, payouts (Stripe Connect Express), staff accounts, **Ads**: Ad Designer (image or video upload, budget, CPC, dates), list showing pending/approved/rejected/paused/**expired**.
- **Driver**: application, availability switch, available deliveries, claim, pickup, code-confirmed delivery, issue reporting, history, earnings, messages.
- **Admin**: vendors and documents, approval, stores, catalogue moderation + aliases, taxonomy, collections, zones, orders, refunds (request vs approve split), dispatch (assign), drivers and driver messages, support, coupons, **Advertising approvals**, studio (themes, banners, layout), content/pages, users and roles (tidy person-card grid, no sideways scroll), platform settings (rewards/membership numbers screen), feature flags, system health, insights, KPIs, audit log, settlements.
- **Marketing**: dashboard, analytics, campaigns, email campaigns/templates, audiences, automation, social, budget, cultural occasions, content library, coupons, studio, rewards, **Ad Approvals** (same screen as admin, own nav badge), settings.
- **Finance**: control centre (versioned pricing/finance rules with approvals), settlements, payouts with hold/approval, reconciliation, notifications.
- Shared kit: `StaffShell`, tables that turn into **cards on phones** (`phoneTables.js`), forms that never overflow: **all date inputs** share one safe style (≥16px text, `contain:inline-size`, side-by-side pairs, no spilling on iOS standalone).
- Staff UI is deliberately back-office plain (flat, dense); only the shop is "designed", each area keeps its own accent.

## 8. Platform services
- **Payments**: provider interface with a clearly-labelled mock (never allowed in production: API refuses to boot) and a Stripe adapter + Payment Element + Connect Express payouts. State loudly that Stripe is unverified until run. Hold days configurable; automatic payouts job.
- **Notifications**: email outbox with editable templates (Resend adapter, log mode default), SMS (Twilio adapter, off). **Web push**: VAPID keys from env or generated once and stored; `push_subscriptions` per device and **per app/area**; service worker `push` + `notificationclick`; "Turn on notifications / Send a test / Turn off" control in the account page and every portal sidebar; the test reports real delivery results and errors. Events: order confirmed/status/message/refund/substitution (customer), new order/message/low stock/ad decision/payout (store), delivery available/assigned/driver message (driver), ad waiting/vendor application/refund requested/payout alerts (admin, marketing, finance). Never push sign-in or reset links or gift codes. Valid VAPID subject (Apple rejects invented ones).
- **Each portal is its own PWA** (`manifest-<area>.webmanifest`, `start_url` and `scope` = `/<area>/`), service worker registered in portals too; `site.webmanifest` for the shop.
- **Video**: upload up to 100 MB of any phone video (MOV/HEVC/3GP/MKV/MP4/WebM); detect by bytes; **convert with ffmpeg** (bundled `ffmpeg-static` optional dependency, or system ffmpeg) to ≤720p H.264/AAC MP4, ≤90 s, ≤25 MB, faststart; fall back gracefully if ffmpeg is missing.
- **Ads**: placements `home_banner`, `region_banner`, `search_sponsored`, `sponsored_store`; live = approved, within dates, budget left (spend = clicks × CPC); impressions on view, clicks on tap (rate-limited); never advertise something unorderable; **public ads query must not `SELECT *` across a join** (the joined table's `id` overwrote the campaign id and zeroed counting).
- **Themes/festivals**: ~22 presets (Diwali, Christmas, Ramadan, Eid, Black History Month…), auto by date or forced; colour-safe in light and dark.
- Jobs in-process every 30 s (expire holds, auto-reject silent stores, outbox, hourly payouts, low-stock alerts, list reminders), safe with several instances.
- Admin "clean start" and data-erasure tools; audit log on every sensitive change.

## 9. Design system
- Shop: warm cream background, deep brown header, gold/yellow accent, forest green for success, display font Unbounded + body font Onest, generous rounded corners, illustrated pack shots (generated SVG product art by category), illustrated icon sets (faves, departments), no emoji as icons in the main UI.
- Staff areas: system font, flat, dense; accent per area (admin indigo, vendor teal, chef plum, driver terracotta, marketing purple, finance green).
- Spacing and sizes that were explicitly adjusted by the user and must hold: slim region bar (~27px on phones), ~10px gap above the hero carousel on phones, thin carousel dots, small faves tiles.

## 10. Hosting and domain
- Render: Node web service + Postgres (`render.yaml`: `npm ci && npm run build`, start `migrate && seed && start`). Demo settings (`NODE_ENV=development`, mock payments, `DEMO_ALWAYS_OPEN=1`) are **not** a launch setup; document the production variables (`NODE_ENV=production`, `PAYMENT_PROVIDER=stripe`, Stripe keys, Resend, `WEB_ORIGIN=https://eazyfoods.ca`, `ADMIN_EMAILS`, `VAPID_*`, `SENTRY_DSN`).
- Custom domain `eazyfoods.ca` (bought at GoDaddy): preferred = Render custom domain. Stopgap used = a Vercel project (`vercel-proxy`, root directory) that rewrites everything to the Render URL, redirects `www` to the apex, and redirects `.mp4/.webm` upload requests straight to Render (the proxy cannot deliver large video), with the app's CSP `media-src` allowing that host. Warn that Vercel's free plan is non-commercial.
- CSP via helmet (scripts `'self'` only); same-origin CSRF check allows the configured origin or same host.

## 11. Testing and quality bar
- API: vitest against a real Postgres test database (dropped and rebuilt every run; refuses a name without "test"), ~250 tests: search, auth, authorization, checkout, ledger, refunds, payouts, inventory integrity, pre-orders, finance rules, ads (video, expiry), push routing, time zone saving, region fallback, CSP.
- E2E: real Chromium: cross-role journeys; **a crawl of every page of all 8 areas on desktop and phone with no console errors**; responsive audit over every route (no horizontal scroll, tap size, contrast) writing `docs/MOBILE_QA_REGISTER.md`; axe scans including themes; workflows at 320/360/390/430/768. Global setup starts the API and Vite on a fresh DB, opens all stores 24 h, and avoids `networkidle` (SSE keeps connections open).
- Gotchas to design around: Postgres and Node time-zone data can differ by an hour around DST; strict-mode duplicate locators from hidden live copies; `getByLabel` substring matches; never `pkill -f` in the sandbox.
- Quality gates before every push: type-check both apps, relevant tests, a production build occasionally (**CSS from `responsive.css` loads as a separate chunk, so equal-specificity rules can silently lose: raise specificity**), and a look at a phone-sized screenshot for any UI change.

## 12. Documents to write and keep current
PRD, ARCHITECTURE (ADRs), DECISIONS (commission 12%, delivery $5.99, driver $4.50, GST handling, payout hold 2 days, store response escalate 15 min/auto-reject 45 min), PAYMENTS (+ Stripe go-live checklist), SECURITY, DEPLOYMENT, BACKUP_RECOVERY, OPERATIONS, LAUNCH_CHECKLIST, **LAUNCH_READINESS** (verified vs unverified vs person-only, setup, operating routine, Stripe checks, real-device checklist), PROJECT_STATUS, MOBILE_STANDARDS, DESIGN, KPIs, generated API.md.

## 13. Honest gaps to state (do not hide them)
Stripe and Connect never run against Stripe; email/Twilio unverified; push not confirmed on a real phone; legal pages are drafts; tax classes need an accountant; food-safety rules for home chefs need legal review; no staff 2FA; local-disk uploads (mirrored in DB); no staging environment; seed data invented; processing fees not imported (net margin overstated); Alberta time-zone data may differ between Node and Postgres.

## 14. Seed data (dev only, refuses in production)
Demo stores and kitchens in Calgary with invented catalogues (West African staples: garri, jollof rice, plantain, etc.), logins at `example.test` addresses with password `dev-password-123` (`customer@`, `owner1@`–`owner3@`, `admin@`, `owner@`, `support@`, `finance@`, `dispatcher@`, `marketing@`, `driver@`), FSA delivery zones, recipes labelled unreviewed drafts.

## 15. Build order (give one phase per message; test and commit at the end of each)
1. **Foundation**: repo, migrations 001–007, auth/sessions, taxonomy, catalogue, stores/offers, storefront view, search, seed, API tests.
2. **Commerce core**: cart, checkout, reservations, orders/suborders, payments (mock + webhook), ledger, refunds, notifications outbox, jobs.
3. **Customer web app**: shell, home, search, product, store, basket, checkout, orders, account; themes; PWA; dark mode; accessibility.
4. **Vendor portal**: onboarding, profile, hours, products/inventory, orders, promotions, insights, messages, payouts; Chef variant and kitchens, dishes, pre-order slots.
5. **Driver and Admin portals**, dispatch, support, catalogue moderation, system and settings.
6. **Portal rebuild as separate Tailwind apps** with per-area sign-ins, phone-friendly tables/cards, shared date-input rules, staff roles and permissions screens.
7. **Marketing and Finance areas**, rewards/credit, gift cards, coupons, studio, pricing rules, settlements, hold/approval flows.
8. **Engagement features**: remembered substitutions, group orders, store time slots, order chat, shoppable recipes, dietary labels and nutrition, search-as-you-type, saved items, rewards and EAZY+, sticky buy bar, card chips, basket time pickers, illustrated faves and department icons.
9. **Ads end to end**: designer with video, approvals (admin and marketing), carousel slides, expiry, click counting.
10. **Notifications**: web push, per-portal manifests and service worker, events wiring.
11. **Hardening and mobile polish**: responsive audit to zero critical/high, crawl all areas, device quirks (iOS date inputs, standalone tab bar, Low Power Mode video), full test runs.
12. **Hosting**: Render blueprint, custom domain via Vercel front door, launch-readiness report.

## 16. Definition of done for the whole build
All of: type-checks clean; API suite green (except any documented environment-only test); full browser suite green; crawl of all 8 areas on desktop and phone with no console errors; responsive audit with 0 critical/0 high; `docs/LAUNCH_READINESS.md` accurate; everything pushed to `main`; and a final message listing, plainly, what was verified, what was not, and what I (the owner) must do next.
