# Project status

_Last updated: 2026-10-23 · Branch `build/eazyfoods-full`_

## Verified today (run, not assumed)
| Check | Result |
|---|---|
| API integration tests (real Postgres) | **70 passed** |
| Browser end-to-end + quality suite (real Chromium, real API/DB) | **23 passed**: 12 cross-role journeys, no horizontal overflow at 360/390/768/1280 px on every public, signed-in and portal page, axe WCAG 2 A/AA: no serious/critical violations (light, dark, portals) |
| `tsc` (api + web), production web build | clean |
| `npm audit --omit=dev` | 0 vulnerabilities |

Journeys covered end to end in the browser: find a store by region; search by alternative name; basket; validated checkout; **declined payment leaves no paid order**; successful signed payment; vendor accepts/ready; dispatcher assigns; driver delivers with the handover code (wrong code refused); customer review; support requests + finance approves a refund with the ledger netting to zero; vendor price edit shows on storefront; stale basket cannot buy sold-out stock; role/ownership access control; admin verifies and approves a vendor.

## Storefront redesign
Retail-style layout (see docs/DESIGN.md): department header, hero carousel, quad tiles, shelves, facets, buy box, illustrated pack shots. Verified with the same browser suite (journeys, overflow at 4 widths, axe in light and dark).

## Built
Customer: regional discovery, search (typo + verified aliases), catalogue, stores, basket (guest merge), checkout (delivery/pickup, zones, fees, GST, coupons, multi-store disclosure), payment step, order tracking and timeline, substitutions, cancellation, issue reports, reviews, reorder, favourites, recipes-to-basket, account (addresses, consent, export, deletion), password reset, email verification, policy pages.
Vendor portal: onboarding checklist and documents, store profile/hours, orders workflow, inventory with audit history, CSV import (check-only first), product suggestions, promotions, ads, dashboard, settlement report/CSV, support.
Admin: vendors/documents/approval, stores, catalogue moderation + aliases, taxonomy, collections, delivery zones, orders, refunds (request vs approve split), dispatch, drivers, support, coupons, ads review, content/templates/recipes, CRM, finance (payouts, ledger), KPIs, settings (validated, audited), roles, audit log, system health.
Driver portal: application, availability, jobs, pickup, code-confirmed delivery, issue/failure reporting, history, earnings.
Platform: double-entry ledger enforced by the database, stock reservations, idempotent verified webhooks, background jobs (hold expiry, silent-store auto-reject, email outbox), first-party analytics and error log, CI workflow.

## Not done / known gaps (honest list)
- **Stripe is unverified.** The adapter and Stripe Payment Element code are written but have never been run against Stripe (no credentials). Only the dev mock provider has been exercised. Follow `docs/PAYMENTS.md` before any live money. Vendor Connect onboarding is manual (an admin enters the `acct_` id).
- **No real photography.** Real product/store photos must come from stores; UI shows initial tiles until then. Upload pipeline works and is validated.
- **All stores, prices, stock, aliases and recipes in the seed are invented** (labelled "Demo store"; recipes are labelled unreviewed AI-assisted drafts). Aliases need review by someone with domain knowledge. The seeded Calgary FSA list and fees are development defaults.
- **Legal pages are drafts** (privacy, terms, vendor agreement) marked as needing legal review. No legal, tax or privacy compliance is claimed. Product tax classes must be verified by an accountant.
- Payment-processing fees are not imported, so "net marketplace revenue" overstates margin (stated in the KPI definition).
- Email is log-only unless `RESEND_API_KEY` is set (the Resend call is unverified). No SMS.
- Local-disk uploads (single API instance only); no malware scanning; no 2FA for staff; no automated data-retention enforcement.
- The live site https://eazyfoods.ca and the old repository were not reviewed (not reachable / out of scope).
- Axe covers automated WCAG checks only; no manual screen-reader pass. Not tested on real iOS/Android devices.
- Not built (by design, see PRD): live GPS, referrals/loyalty, marketing automation, guest checkout, scheduled orders, weight-based final billing.
- Browser tests run against the dev server with the mock payment provider; there is no staging environment yet.

## Configuration required
`DATABASE_URL`, `WEB_ORIGIN`. For launch: `PAYMENT_PROVIDER=stripe` + Stripe keys, `EMAIL_TRANSPORT=resend` + key, object storage, `SENTRY_DSN` (optional). See `docs/DEPLOYMENT.md`.

## Decisions awaiting you
See `docs/DECISIONS.md`: commission 12%, delivery $5.99/store, driver pay $4.50, GST handling, payout hold, payment provider, driver status, legal review, pilot stores.

## Exact next steps
1. Approve/adjust commercial defaults (DECISIONS.md).
2. Open Stripe test account; run the PAYMENTS.md checklist; fix whatever the first real run reveals.
3. Recruit the 3-5 pilot stores (LAUNCH_PLAN.md); load real catalogues and photos; verify aliases and tax classes.
4. Legal and accountant review; complete LAUNCH_CHECKLIST.md.
5. Stand up staging with managed Postgres, run the e2e suite there, rehearse backup restore.

## Storefront studio (added)
- **Themes** (admin → Storefront studio): 22 presets (festivals, holidays, seasons). Auto by date, force On, or Off. Re-colours the shop, leads the homepage carousel, shows a top strip, optional falling decoration. Staff can preview any theme with `/?preview_theme=<slug>`. Moving festivals (Easter, Ramadan, Eid, Diwali, Lunar New Year, Thanksgiving, Black Friday, Mother's Day) hold only their NEXT dates: update yearly. Seasons are Off by default.
- **Banners**: custom carousel slides (colours or picture, link, schedule, order).
- **Homepage layout**: reorder or hide the nine homepage sections.
- **Vendor → Storefront**: brand colour (8 contrast-checked options), tagline, announcement, story, links, featured products.
- **Portals** have their own colours: admin indigo, vendor teal, driver terracotta.
- Colour safety is enforced by tests for every preset and store accent (light and dark); browser accessibility scans cover a sample of themes.
- Not yet built: more admin analytics/CRM depth from the old site (activity logs, chat, barcode tools), per-vendor page builder beyond the above.

## Messaging and barcode scan (added)
- **Vendor messages**: vendors and staff (vendors.manage) hold threaded conversations; unread badges in both menus; staff replies email the vendor owners; vendors only see their own threads; a vendor reply reopens a closed thread.
- **Barcode scan**: on phones/browsers that support it, vendors can scan a pack's barcode when adding from the shared catalogue; typing always works.

## Insights dashboards (added)
- Admin → Insights and Vendor → Insights: 7/30/90-day KPIs with change vs the previous period, daily sales and orders charts (hover/keyboard read-out and table alternative), orders by hour and weekday, outcome and delivery/pickup mix, top products (and top stores for admin), accept/prepare speed. Vendors only see their own stores.

## Home chefs (added)
- **Model**: a chef is a vendor of kind `chef`; their store is a `kitchen`; dishes are products with status `dish_live` owned by that kitchen, so no grocery query can ever show a dish. Orders, GST (dishes are standard-rated, 5%), commission, payments, refunds, delivery, handover codes, messaging and insights are the shared machinery.
- **Customers**: `/kitchens` (filter by cuisine), `/k/:slug` kitchen page with per-dish allergens, spice, serves, prep time, declared dietary labels, a saved-on-device "allergens I avoid" filter that blocks adding matching dishes, "Home chefs" on the homepage (reorderable in the studio) and in the menus. Cooks' street addresses are never published (area only).
- **Cooks** (`/vendor`, choose "Cook and sell meals" or `/vendor?kind=chef`): plum-coloured Chef portal with Menu (dishes, daily portions, mandatory allergen confirmation), Kitchen profile with cuisines, plus the shared Orders, Promotions, Ads, Insights, Reports, Storefront, Messages.
- **Admin**: vendor list shows Home chef; approval requires a verified food premises permit AND food-handler certificate; "Home-chef dishes" screen can hide/restore a dish (the cook is told in Messages); `kitchens.enabled` setting is a kill switch.
- **LEGAL / SAFETY, must be reviewed before real cooks sell**: Alberta food-premises permit rules for selling home-prepared food, liability and insurance, allergen duties, GST treatment of prepared meals (accountant), and the draft page "Rules for home kitchens". Allergen and dietary labels are declared by cooks and are not verified by EAZyfoods; the UI says so.
- Not built yet: cook payouts via Stripe Connect (shared payout flow is manual), scheduled/pre-order time slots, per-dish reviews.

## Pre-orders and payouts (added)
- **Pre-order slots**: any store can accept bookings for later slots (kitchens on by default). Slots come from opening hours in the store's time zone, honour notice period, booking horizon, days off and a per-slot capacity (race-safe with advisory locks). Checkout lets the customer pick "as soon as possible" or a time per store; a closed kitchen can still take an order for later. The slot becomes the promised time; vendors, customers and drivers see it. Limitation: portions are a single shared pool (no per-day portions yet).
- **Payouts**: Stripe Connect Express onboarding from Vendor portal → Payouts (UNVERIFIED against real Stripe; see docs/PAYMENTS.md), account status, balance split (payable now / in hold / in progress), history, shorter hold for kitchens, retry of failed transfers, optional hourly automatic payouts, email when paid. All tested against the mock provider.

## Marketing area and back-office look (added)
- **Staff areas look like back-office software** on purpose (plain system font, flat, dense, small controls); only the shop is "designed". Each area keeps its colour: admin indigo, vendor teal, chef plum, driver terracotta, marketing gold.
- **Marketing** (`/marketing`, role `marketing` or owner; login `marketing@example.test`): dashboard, email campaigns (editor, preview, test-to-me, A/B subject, schedule, send, click and unsubscribe stats), reusable templates, audiences (rule-based, live count, masked sample), campaigns (budget, coupon, theme, measured results), automations (welcome, win-back, first-order follow-up; all OFF), festival calendar with "plan a campaign", social planner (manual posting), budget and expenses, asset library, analytics, sender settings. Coupons and the Storefront studio are linked from its menu.
- **Consent (CASL) safeguards built in, not legal advice**: only customers who opted in, verified their email and want email can ever be in an audience (segment rules only narrow it); every email carries the sender name, postal address and a one-click unsubscribe; unsubscribing withdraws consent and cancels queued mail; consent is re-checked when each email is actually sent; every opt-in/out is logged with date and source; sending is blocked until a postal address is set; per-campaign recipient cap; tracked links are same-site paths only (no open redirect); opens are deliberately not tracked.
- **Needs a professional before real sends**: CASL obligations (proof of consent, any imported list is not supported), sender identity/domain setup (SPF/DKIM via your email provider), unsubscribe handling timelines.
- Not built: push notifications, direct posting to social platforms, importing external lists.

## First paint, quick view and banner video (added)
- **First paint**: the server (and the dev server) embeds the theme, announcement, homepage banners and menus in the page, so the first slide is real content immediately; later slides are only ever appended. No green placeholder.
- **Quick view**: eye icon on phones, compact bottom sheet; text pill on desktop hover.
- **Menu**: fades in and out.
- **Banner video**: staff (content.manage) upload MP4 (H.264) or WebM up to 25 MB for a homepage banner (Studio → Banners). It plays muted and looped behind the text with a dark overlay, only while its slide is showing, never for reduced-motion or data-saver visitors (the picture shows instead), with a pause button. Files are verified by their bytes; range requests work for Safari. Not done: transcoding or resizing (upload web-ready clips), video on festival theme slides, and object storage/CDN (files live on the app server's disk; use a CDN before large videos or heavy traffic).

## Customer batch 1 (added)
Buy it again and Recently viewed shelves; unit prices (per 100 g / 100 ml, weight and volume packs only) with a unit-price sort; dietary filters (vegan, vegetarian, gluten-free, dairy-free) from labels set by the catalogue team in the product editor; per-store free-delivery progress in the basket; shopping lists (save from a product or quick view, share read-only by link, stop sharing, copy a shared list, add all to basket); back-in-stock and price-drop alerts (email once, then off; manage at /alerts). Demo dietary flags are invented.

## Customer batch 2 (added)
- **Driver tip** (delivery only, never pre-selected, $0 to $100): added to the total at checkout, split across delivery stores, held in a new `tips_payable` ledger account, paid to the driver (their earnings show "incl. tip") only when the delivery is completed, and refunded with the rest if the store rejects or the order is cancelled before delivery. The ledger stays zero-sum (tested).
- **If an item is unavailable** (per item, in the basket): ask me first (default), swap for the closest match (the store's pick is applied at once, no extra charge), or just refund it (the store cannot propose a swap). Shown to the store on the order.
- **Multi-buy prices**: stores set up to 3 price breaks per product (Inventory → Multi-buy); basket, order and product page apply the best break for the quantity; cards say "Buy 3+: $x each". Order lines keep unit price x quantity = line total so refunds stay exact.
- **Weekly flyer** (`/flyer`, print-friendly): all live sales and multi-buys by store.
- **Frequently bought together** on product pages, only when at least 3 different paid orders back the pairing.
- **Gift note** on an order, shown to the store (and on the packing slip).
- **Product questions**: signed-in customers ask; a store that sells the product (or catalogue staff) answers in Vendor → Questions; only answered questions are public.
- **Review photos**: customers with a delivered order can attach one photo to a product review (staff can hide any review).
- **Order tracking**: progress stepper, driver's first name and estimated arrival while out for delivery.
- Not built (needs outside accounts): live driver map location, Apple/Google Pay and saved cards (Stripe), address autocomplete.

## Customer batch 3 (added)
- **Store credit wallet** (`/credit`): append-only credit ledger per customer; "Use my store credit" at checkout (never covers the last $0.50, which must go on a card); credit is reserved while an order awaits payment and returned if payment fails or expires; refunds go back to the card first and any part that was paid with credit returns as credit. Double-entry accounts `store_credit_liability` and `credit_expense` keep the books balanced (tested). Credit has no cash value and cannot be withdrawn.
- **Marketing → Rewards & credit**: cashback % on delivered orders (net of refunds), invite-a-friend reward (both people, after the friend's verified email and a qualifying first order, capped per person), gift codes (`EAZY-XXXX-XXXX`, single use, rate-limited redemption), goodwill credit for one customer (audited, not to yourself). **Every programme starts OFF (0).** The page shows what is owed to customers.
- **Gift cards customers can BUY are not built** (needs a non-order payment flow; do with Stripe). Codes are made by staff.
- **Restock reminders** on shopping lists (weekly to every 2 months, email with a one-tap link; nothing is ordered or charged automatically — true subscribe-and-save auto-charging needs saved cards).
- **Abandoned-basket email**: a new automation (OFF), only to opted-in, verified customers, at most once a week each.
- **Help centre** (`/help`, editable page + contact form that opens a support ticket) and **store comparison** by postal area on `/stores` (fee, speed, minimum, rating, items in stock).
- Needs outside accounts, not built: SMS (Twilio), web push, Apple/Google Pay and saved cards.
- Before real launch ask an accountant: store-credit liability and expiry rules, gift-code treatment, GST on cashback.

## Menu and customer batch 4 (added)
- **Phone menu**: now 75% of the screen width; quick links on top, "By region" opens to each region's countries one tap at a time, "By department" and "Partner with us" are collapsed sections, Help centre at the bottom. Desktop menu keeps everything visible.
- **SEO**: the server writes each page's own title, description, canonical link, social-share tags and structured data (Product with price range and rating only when 3+ reviews, store, home kitchen with NO street address, recipe, site search) into the page; `sitemap.xml` and `robots.txt`; private pages (basket, checkout, orders, account, staff areas) are marked noindex. **Search engines are told to ignore the site unless `NODE_ENV=production` or `SEO_INDEX=true`**, so the demo is never indexed. Set `WEB_ORIGIN` to the real public address.
- **Installable app (PWA)**: service worker caches app files for speed and shows an offline page; it never caches prices, stock, baskets or orders. "Install the EAZyfoods app" in the footer (Add to Home Screen steps on iPhone). Works only on the real (https) site, not the dev server.
- **Speed**: gzip/brotli for pages, scripts and API JSON; app files cached for a year (hashed names); service worker never stale.
- **French** (EN/FR switch in the top bar; remembered; defaults to French for French browsers): menu, header, footer, product buy box, basket, checkout. Product/store names and staff-written pages stay as written. **The French is a working translation: have a native Canadian-French speaker review it.** Other languages need a speaker and the same dictionary file (`apps/web/src/i18n.tsx`).
- **Trust**: "Our shopping promises" page (footer) listing only things the product does; ratings stay hidden until 3 verified reviews. Marked as needing legal review.
- Not built: push notifications (needs VAPID keys and a push service), a CDN/image resizing (needs hosting choice), translating the vendor/admin/driver areas.
