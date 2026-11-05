# EAZYstores: the complete, self-contained build prompt

_Paste this whole document into a fresh Claude Code session in an empty folder with Postgres available. It needs nothing else: **Step Zero** recreates the approved mockups from the source code in Appendix A, **Part 1** says exactly how the product must look and how to prove it with screenshot tests, **Part 2** says what the product does, and **Appendix A** is the mockup source. Honest limit: a text prompt cannot by itself guarantee pixel-identical output; what makes "exactly" achievable is the reference screenshots plus the automated comparison in Part 1 section 7, and the rule that every deviation is reported to me. Give the model one phase at a time (Part 2 section 16); it should run the tests and commit at the end of each phase._

---

## STEP ZERO (do this before anything else): recreate the approved mockups
1. Create the folder `design/eazystores/source/` and write the five files from **Appendix A** into it exactly as given: `art.py`, `lib.py`, `build.py`, `render.py`, `make_reference.js`.
2. Make sure `python3` (standard library only) and **Playwright for Node with Chromium** are available (`npm i -D playwright && npx playwright install chromium` if needed). The mockups load the Fraunces and Inter fonts from Google Fonts once; if the machine is offline, install those two fonts locally first.
3. Run `node design/eazystores/source/make_reference.js`. It writes `design/eazystores/sheets/*.html` and **17 reference PNGs** into `design/eazystores/reference/`: `buyer-home`, `buyer-home-desktop`, `buyer-category`, `buyer-product`, `buyer-basket`, `seller-onboarding-1-what-do-you-sell`, `seller-onboarding-2-shop-identity`, `seller-onboarding-3-first-product`, `seller-onboarding-4-live`, `shop-look-atelier`, `shop-look-noir`, `shop-look-sage`, `home-direction-atelier`, `home-direction-noir`, `home-direction-sage`, `studio-desktop`, `studio-phone`. Phone references are 390 x 798 CSS px at 2x; the desktop home is 1280 wide.
4. Open each PNG and look at it. These are what the finished app must match. Commit the folder. (If the machine cannot run a browser, say so, and use the HTML and CSS produced by `render.py` as the written spec instead; report that the pixel tests could not be run.)

---

# PART 1 · THE DESIGN: build it exactly like the approved mockups

## 0. What "exactly" means
1. The **source of truth** is the mockup source code in **Appendix A** of this prompt. Do **Step Zero** (below) first: it recreates the mockup pages (`design/eazystores/sheets/*.html`) and the 17 reference screenshots (`design/eazystores/reference/*.png`, 2x, one per screen). Study them. Do **not** redesign, restyle, "improve" or substitute fonts, colours, spacing, copy or icons. If something looks wrong to you, build it as shown and tell me.
2. Every screen listed in section 6 must **pass a visual-regression test** against its reference PNG (section 7) before you move on. A failing visual test is a failing build.
3. The device frame, notch, bezel and the fake "9:41 / 5G" status bar in the mockups are **mockup dressing, not part of the app**. Build only what is inside the phone screen (390 px wide). The tab bar floats inside the screen and is part of the app.
4. Product images in the mockups are drawn SVG placeholders (`design/eazystores/source/art.py`). Port them as a `ProductArt` component with the same shapes and tones: they are used when a product has no photo, in empty states and in the demo seed, so the visual tests can match. Real seller photos replace them in production, shown in the same frames.
5. I like **three looks: Atelier, Noir and Sage**. Build all three as complete themes (section 2). Atelier is the default platform look. Noir and Sage are available as the platform look (admin setting) and as seller shop looks, alongside two more shop looks, Blush and Sky (section 2.4).

## 1. Workflow (do in this order)
1. Do Step Zero. Then read this whole prompt and every file in Appendix A (`lib.py` is the design system, `art.py` the illustrations, `build.py` the phone and studio screens, `render.py` the desktop home).
2. **Phase D0, design system first**: self-host the fonts, create design tokens (CSS custom properties per theme), the icon set, `ProductArt`, and the shared components (section 3). Add a hidden route `/_design` that renders every component in all three themes so I can review it.
3. Build the real screens (section 6) as React components wired to real data (the functional brief), one at a time, each with its visual test (section 7) passing before the next.
4. Then continue with the phases in Part 2 section 16 for everything the mockups do not show, **using only the tokens and components defined here**, so new screens feel identical in style.
5. At the end of each phase report: which screens pass the visual tests, the measured pixel difference per screen, and any deviation with its reason.

## 2. Design tokens

### 2.1 Typography (self-host, do not load from Google at runtime)
- **Fraunces** (variable, optical size 9..144), weights 400, 500, 600: headings, wordmark, prices in dashboard stats. CSS class `.serif`: weight 500, letter-spacing `-0.01em`.
- **Inter**, weights 400, 500, 600: everything else. Body text 14 px unless stated. Smoothing: `-webkit-font-smoothing: antialiased`.
- Wordmark: Fraunces 600, 22 px (28 px on desktop), letter-spacing `-0.02em`, written `eazy` + `stores` where **`stores` is in the accent colour**. The seller app wordmark is `eazy` + `studio` the same way.

### 2.2 Themes (CSS variables `--bg --surf --ink --mut --line --acc --accsoft --onacc`)
| Token | Atelier (default) | Noir | Sage |
|---|---|---|---|
| bg | `#FAF7F2` | `#15120F` | `#F3F4ED` |
| surf (cards) | `#FFFFFF` | `#1E1A16` | `#FFFFFF` |
| ink (text) | `#1F1B16` | `#F4EEE6` | `#1E2A24` |
| mut (secondary text) | `#6F675C` | `#A39A8D` | `#66726A` |
| line (hairlines) | `#E9E2D6` | `#2D2822` | `#E1E5DA` |
| acc (accent) | `#A9532D` | `#C9A66B` | `#46644F` |
| accsoft (soft accent fill) | `#F3E4D9` | `#2C261D` | `#E3EBDD` |
| onacc (text on accent) | `#FFFFFF` | `#15120F` | `#FFFFFF` |
Success text `#3E6B54`, success fill `#E3EBDD`. Dark mode is the Noir theme: it applies automatically when the buyer's system is dark **and** the platform look is Atelier or Sage (map to Noir tokens), unless the buyer chose otherwise.

### 2.3 Shape, space and effects
- Radii: cards 16; product image 14; hero cards 22 (phone) and 28 (desktop); buttons, chips, search fields, filter pills **999 (pill)**; phone-screen-level sheets as shown.
- Card: `background: var(--surf); border: 1px solid var(--line); border-radius: 16px`.
- Buttons: pill, `padding 14px 24px`, font Inter 15/600, accent background with `--onacc` text; `.sm`: `10px 18px`, 13 px; `.ghost`: transparent, `1px solid var(--line)`, ink text. Icon gap 8.
- Chip: Inter 11/600, uppercase, letter-spacing `.04em`, `padding 5px 10px`, radius 999, text `--acc` on `--accsoft`.
- Page side padding on phone: **18 px**. Product grid: 2 columns, gap **14 px** on phone (desktop product row: 4 cards, 268 px wide, gap 26 px).
- Shadows are used sparingly: hero tiles `0 14px 30px rgba(0,0,0,.18)`; floating tab bar `0 10px 30px rgba(0,0,0,.14)`.
- Icons: one consistent line set (24 px viewBox, rendered 20 px, stroke 1.6, round caps and joins, `currentColor`). The exact paths are the `I` dictionary in `design/eazystores/source/lib.py` (search, heart, bag, user, home, grid, cam, plus, check, chev, truck, shield, msg, box, tag, chart, wallet, store). Use these, add new ones only in the same style.
- Motion: 150 to 250 ms ease transitions; respect reduced motion. No spinners: use skeletons in the same neutral tones.

### 2.4 Shop looks (a seller picks one for their shop page)
Atelier, Noir and Sage use the tokens above. **Blush** (`bg #F7E9E5`, `acc #B4574A`) and **Sky** (`bg #E6EEF4`, `acc #3F6F96`) appear as swatches in the mockup (onboarding step 2). Define their full token sets by derivation (surf `#FFFFFF`, ink `#2A211E` / `#1E2933`, mut and line in the same hue family, accsoft at about 12 percent accent on the bg) and mark them "defined, not mocked" in the design page. The curated looks change only colours and imagery tones, never layout, so a shop can never look bad.

## 3. Shared components (build once; match `lib.py` and `build.py`)
- **Product card** (`.pcard`): square image area (aspect 1:1, radius 14) with a 32 px circular favourite button top-right at 10 px offsets (`rgba(255,255,255,.9)` background, heart icon, ink colour) and an optional chip bottom-left at 10 px; below it: title 14/500 (margin-top 10, line-height 1.3), seller name 12 px muted (margin-top 2), price 14/600 (margin-top 4) with an optional struck-through previous price 12 px muted, left margin 6. **Every card is the same size; nothing but the heart and the chip ever sits on the image.**
- **Search field**: card, pill, `padding 12px 16px` (13px 20px on desktop), search icon + placeholder 14 px muted: "Search pottery, art, perfume…" on phone, "Search for pottery, art, perfume, hair, toys…" on desktop.
- **Filter/category pills**: Inter 13, `padding 8px 14px`, radius 999; selected pill = ink background with bg-coloured text and weight 600; unselected = 1 px line border (filters also show a "⌄" and use the surf background).
- **Floating glass tab bar** (buyer, five items Shop, Browse, Saved, Basket, Account): absolute, `left 14 right 14 bottom 16`, height 64, radius 32, background `rgba(255,255,255,.72)` (Noir: `rgba(30,26,22,.72)`), `backdrop-filter: blur(18px)`, 1 px border (`rgba(0,0,0,.06)`; Noir `rgba(255,255,255,.08)`), shadow as above; items are icon over a 10 px label in muted colour; the **active item sits in a solid soft bubble** (`--accsoft`, `padding 8px 14px`, radius 22, ink colour). Position must be pinned so it never drifts in an iOS home-screen app.
- **Progress bars** (onboarding): five 4 px pills, filled = accent, empty = line; caption row "Step n of 5" left, time left right, 12 px muted.
- **Sticky bottom bar** (product page, basket, onboarding): `padding 12px 18px 26px` (basket 14px 18px 30px), surf background, 1 px top line; onboarding uses a transparent-to-bg gradient behind the buttons.
- **Setup/task cards, stat blocks, checklist rows, order rows** exactly as in the studio mockups (section 6.8).
- **Seller shop header**: 150 px banner with a bottom gradient to rgba(0,0,0,.25), a 72 px circular logo with a 4 px ring in the page background overlapping the banner by 34 px, and a pill Follow button at the right.

## 4. Copy and tone
Use the mockups' words verbatim, including: "Made by hand. Chosen with care.", "New from makers", "Maker spotlight", "What do you sell?", "Pick everything that fits. We will set up the right fields for you.", "Make it yours", "Add your first product", "Start with photos. Good light, plain background.", "Your shop is live", "Three quick things to do next", "Good morning, Amara", "Finish setting up", "Ships in 2–3 days". Plain language only. British/Canadian spelling (colour, jewellery).

## 5. Demo data that makes the screens reproducible
The visual tests run against a **fixed demo seed** (dev only, refuses production). Seed these exactly (titles, sellers, prices, chips, art kind and tone; `art` is `kind/tone` from `art.py` and is used when there is no photo):
- **Shops**: Clay & Ember (Calgary, AB; "Wheel-thrown stoneware"; verified maker; 4.9, 128 reviews; owner Amara), Harper & Pine, Ember Lane, Layer Lab, Crown Hair Co., Maison Nuit, Kiln & Co., Studio Marlow.
- **Home (phone)**: Dusk over the hills, A4 print / Harper & Pine / $38 / chip Limited / print, warm. Cedar & fig soy candle / Ember Lane / $26 / Handmade / candle, sand. Geometric desk planter / Layer Lab / $24 / print3d, sky. Body wave bundle, 18 in / Crown Hair Co. / $118, was $140 / hair, stone. **Home (desktop 4th card)**: Amber & oud eau de parfum, 50 ml / Maison Nuit / $96, was $110 / perfume, butter.
- **Category "Pottery & ceramics"** (412 pieces from 38 makers): Speckled stoneware mug / Clay & Ember / $34 / One of a kind / pottery, blush. Tall bud vase, matte glaze / Kiln & Co. / $48 / pottery, sand. Hand-built planter / Clay & Ember / $42 / Handmade / planter, sage. Serving bowl, ash glaze / Studio Marlow / $64 / pottery, warm. Trinket dish set of 3 / Kiln & Co. / $29, was $36 / pottery, stone. Espresso cup pair / Studio Marlow / $44 / pottery, butter.
- **Product page**: Tall bud vase in terracotta glaze / Clay & Ember / $48.00 CAD / chip "Handmade · Made in Alberta" / sizes Small, Medium (default), Large / glazes `#b8704a` (default), `#e8dccb`, `#3d5a4b`, `#2c2620` / ships in 2–3 days, arrives Nov 12–16, $9.00 to T2N / 3 gallery images (pottery, blush).
- **Basket**: Clay & Ember: Tall bud vase (Medium · Terracotta) $48.00, Cedar & fig candle (200 g) $26.00, shipping $9.00, Nov 12–16. Harper & Pine: Dusk over the hills (A4 print · Unframed) $38.00, shipping Free, Nov 11–14. Gift toggle "This is a gift / Add a message". Subtotal 3 items $112.00, shipping $9.00, button "Checkout · $121.00".
- **Studio (Amara, Clay & Ember)**: 3 orders to ship, 2 messages to answer (average reply 2 hours), 1 running low (Tall bud vase, 1 left); this week $642, 14 orders, 1.2k visits, +18 percent vs last week; setup checklist 3 of 5 (create shop, first product, shop look done; set up payouts, free shipping open); recent orders: Tall bud vase, Medium, Maya R., Edmonton, 10 min ago, $57.00, Ship today; Cedar & fig candle ×2, Jordan K., Calgary, 1 hr ago, $61.00, Ship today; Speckled mug, Sofia L., Toronto, Yesterday, $43.00, Shipped.
- Freeze the clock in tests (Thursday, 5 November, 9:41) so relative dates match.

## 6. Screens that must match (route, reference image, viewport)
Phone screens are the content area at **390 × 798 CSS px, device scale factor 2**; compare against the PNG of the same name in `design/eazystores/reference/`.
1. `/` on phone, **buyer-home.png**: header (wordmark left; heart and bag icons right; 6 px top padding), search field 12 px below, category pill row (All, Art, Pottery, Perfume, Hair, Toys, 3D printed, Candles; clipped at the screen edge), hero card (height 300, radius 22, `--accsoft` fill, padding 22/20/0; chip "New season" on surf; headline Fraunces 31/1.08 max-width 230; small button "Shop new arrivals"; two rotated product tiles bottom-right: 170 px tile rotated 6°, 120 px tile rotated −7°, both radius 18 to 20 with the hero shadow), "New from makers" (Fraunces 22) with "See all", 2-column grid of the four phone cards, then the maker-spotlight card (64 px round photo, small caps label "MAKER SPOTLIGHT", "Clay & Ember" Fraunces 18, "Wheel-thrown stoneware, Calgary", chevron). Tab bar on "Shop".
2. `/` on desktop, **buyer-home-desktop.png** (1280 wide): ink announcement bar "Free shipping on orders over $75 from Canadian makers"; header with wordmark 28, pill search (max 560), "Sell on eazystores" and icons; category text nav; hero grid (left card 470 high, radius 28, headline 62/1.02, body 18, two buttons "Shop new arrivals" and ghost "Meet the makers"; right three image tiles in a 2 × 2 grid, tall tile spanning two rows, radius 24); "Shop by category" with eight 96 px circles; "New from makers" four 268 px cards; spotlight band (420 px image left, quote, "Visit the shop"); three trust blocks (Buyer protection, Real makers, Shipped with care).
3. `/c/pottery-ceramics`, **buyer-category.png**: breadcrumb "Home › Pottery & ceramics" 12 px muted, H1 Fraunces 30, "412 pieces from 38 makers", filter pills (Price, Material, Size, Handmade, Free shipping), 2-column grid of six cards. Tab bar on "Browse".
4. `/p/tall-bud-vase-in-terracotta-glaze`, **buyer-product.png**: 360 px full-bleed gallery with dots (current dot 18 × 6 pill); chip; title Fraunces 27/1.1; seller line (22 px round logo, bold name, stars, "4.9 (128)"); price 24/600 with "CAD · taxes included at checkout" 13 px muted; Size options (selected = ink fill), Glaze swatches 30 px circles (selected has a 2 px ink ring with 2 px offset); shipping card; **sticky buy bar** (Total label, price 18/600, "Add to basket" button flexing, 52 px ghost heart button). No tab bar on this screen.
5. `/basket`, **buyer-basket.png**: H1 "Your basket", subtitle, one card per maker (28 px round logo, name, delivery window right), line items with 64 px thumbnails, shipping row with truck icon, gift card row, **sticky summary** and "Checkout · $121.00".
6. Seller sign-up: `/studio/start`, **seller-onboarding-1-what-do-you-sell.png** (progress, headline Fraunces 31, helper text 14 muted, 2-column tiles with 1.25:1 images; selected tile has a 2 px accent border and a check; "Something else? Tell us"; sticky Continue), `/studio/start/shop` **seller-onboarding-2-shop-identity.png** (live preview card with banner, 56 px logo, name, tagline; Shop name and tagline fields; "Choose a look" with five swatches Atelier, Noir, Sage, Blush, Sky; Back and Continue), `/studio/start/product` **seller-onboarding-3-first-product.png** (cover photo 2/3 width spanning two rows, four dashed camera slots, Title, Price and Quantity, suggested-category chip "✓ Pottery & ceramics · suggested", Handmade and One of a kind chips, "Add sizes or colours" row, "✓ Draft saved just now", Back and Publish product), `/studio/start/done` **seller-onboarding-4-live.png** (check badge, "Your shop is live", shop-link card with QR code and Copy link, three next-step rows with icon discs, Go to my studio). The mockup shows steps 1, 2, 3 and 5; build the payouts and policies step (step 4) from the same components in the same style.
7. Shop pages `/shop/clay-ember` in each look: **shop-look-atelier.png**, **shop-look-noir.png**, **shop-look-sage.png** (banner, logo ring, Follow, name Fraunces 28, tagline, chips "Verified maker" and "★ 4.9 · 128 reviews", bio, tabs Shop/About/Reviews/Policies with accent underline on the active tab, product grid). In Noir the product image tones are the dark tone.
8. Seller Studio: `/studio` desktop (1180 px window, 240 px sidebar with the `eazystudio` wordmark and nav Home, Orders (badge 3), Products, Messages, Promotions, Shop page, Insights, Payouts, shop card at the bottom; main area: date line, greeting Fraunces 34, "View my shop" and "Add product" buttons, three task cards, a "This week" card with three stats and area sparkline, a "Finish setting up" checklist card, a "Recent orders" card) against **studio-desktop.png**; `/studio` on phone against **studio-phone.png** (task cards, sales card, setup progress, five-item glass tab bar Home, Orders, Products, Messages, Insights).
9. Platform home in each look against **home-direction-atelier.png, home-direction-noir.png, home-direction-sage.png** (the phone home screen with the theme applied).

## 7. Visual-regression acceptance (automated, in `apps/e2e`)
- Use Playwright with the self-hosted fonts, `reducedMotion: 'reduce'`, animations disabled, a frozen clock and the fixed demo seed. Wait for fonts and images (`document.fonts.ready`, all SVG art rendered).
- For each screen in section 6 take a screenshot at the stated viewport (phones: 390 × 798, DSF 2; desktop home 1280 wide full page; studio desktop as the 1180 px window) and compare with the reference PNG using `pixelmatch` (threshold 0.1, anti-aliasing ignored). **Pass = at most 1.5 percent of pixels differ.** Mask only the bottom-left and bottom-right 24 px corners of phone references (the mockup's rounded device corners) and nothing else.
- On failure write the diff image to `apps/e2e/visual-diffs/` and fix the cause; never raise the tolerance and never regenerate a reference to make a test pass.
- Also run the visual tests for the three looks (Atelier, Noir, Sage) and for dark-mode auto switching.
- Add a `/_design` page screenshot test so the component library cannot drift.

## 8. Quality bars that apply on top
Everything in Part 2 (the functional brief) still applies: honest verification reporting, small commits to `main`, API and browser tests, the crawl of every page of every area on desktop and phone with no console errors, responsive audit (no sideways scroll, 44 px tap targets, WCAG AA contrast, including all three themes), performance budget (LCP under 2.5 s on 4G), accessibility, and `docs/LAUNCH_READINESS.md`.
- Screens or states the mockups do not show (hover, focus rings, loading skeletons, empty states, errors, dialogs, tables on phones, admin and finance consoles) must be built from the same tokens and components, with the same spacing rhythm, and listed in a "not mocked" section of `/_design` for my review.
- Where a real-data screen cannot match a mockup exactly (long titles wrapping, missing photos), keep the mockup's structure and sizes and document the difference.

## 9. Definition of done for the design
All 17 reference screens pass section 7 in their stated look; `/_design` shows every component in Atelier, Noir and Sage; no hard-coded colours outside the token files (a lint rule fails the build on a raw hex outside `tokens`); fonts are self-hosted; and a final report lists, per screen, the measured pixel-difference percentage and any deviation with its reason.

---

# PART 2 · THE PRODUCT: what EAZYstores does

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
_If the EAZyfoods repository is not available in this session, do not look for it: implement each listed piece fresh from the descriptions in this brief._
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

---

# APPENDIX A · Mockup source (write these files exactly as given in Step Zero)

The mockups are generated by plain Python and rendered by Playwright. `lib.py` holds the design tokens, base CSS, icon paths and components; `art.py` the illustrated product placeholders; `build.py` the phone and studio screens; `render.py` the desktop home and the sheet assembly; `make_reference.js` produces the reference screenshots.

### `art.py`

```python
# Small illustrated product "photos" as SVG (placeholders for real seller photos).
def _bg(tone, id_):
    a,b = tone
    return f'<defs><linearGradient id="g{id_}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g{id_})"/>'
_n=[0]
def art(kind, tone=("#efe6da","#e2d3c0")):
    _n[0]+=1; i=_n[0]
    body = {
 'pottery': '<ellipse cx="100" cy="168" rx="52" ry="8" fill="#000" opacity=".12"/><path d="M78 58 C70 58 66 66 70 74 C48 92 46 140 66 164 L134 164 C154 140 152 92 130 74 C134 66 130 58 122 58 Z" fill="#b8704a"/><path d="M78 58 C70 58 66 66 70 74 L130 74 C134 66 130 58 122 58 Z" fill="#9b5a38"/><path d="M62 118 C90 128 120 128 140 114" stroke="#f1e2cf" stroke-width="5" fill="none" opacity=".7"/><ellipse cx="100" cy="58" rx="22" ry="5" fill="#6d3a21"/>',
 'perfume': '<ellipse cx="100" cy="170" rx="46" ry="7" fill="#000" opacity=".12"/><rect x="62" y="86" width="76" height="82" rx="14" fill="#e9c98b" opacity=".95"/><rect x="62" y="86" width="76" height="82" rx="14" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/><rect x="88" y="62" width="24" height="26" rx="4" fill="#3b2f26"/><rect x="82" y="46" width="36" height="20" rx="6" fill="#c9a66b"/><rect x="76" y="108" width="48" height="34" rx="4" fill="#fff" opacity=".85"/><rect x="82" y="118" width="36" height="3" fill="#8a7a66"/><rect x="86" y="126" width="28" height="3" fill="#b9ab97"/>',
 'print': '<rect x="38" y="30" width="124" height="140" fill="#2c2620"/><rect x="48" y="40" width="104" height="120" fill="#f6f0e6"/><circle cx="100" cy="92" r="30" fill="#c9693a"/><circle cx="112" cy="104" r="22" fill="#e7b25c" opacity=".9"/><path d="M48 150 C80 120 118 150 152 126 L152 160 L48 160Z" fill="#3d5a4b"/>',
 'toy': '<ellipse cx="100" cy="172" rx="62" ry="8" fill="#000" opacity=".12"/><rect x="42" y="118" width="48" height="48" rx="6" fill="#d9563b"/><rect x="92" y="118" width="48" height="48" rx="6" fill="#3f7fb8"/><rect x="66" y="72" width="48" height="48" rx="6" fill="#e9b73c"/><text x="66" y="154" font-size="30" font-weight="700" fill="#fff" font-family="Inter">A</text><text x="116" y="154" font-size="30" font-weight="700" fill="#fff" font-family="Inter">B</text><text x="90" y="108" font-size="30" font-weight="700" fill="#fff" font-family="Inter">C</text><circle cx="146" cy="146" r="18" fill="#6aa86f"/>',
 'print3d': '<ellipse cx="100" cy="172" rx="54" ry="7" fill="#000" opacity=".12"/><polygon points="100,38 150,70 150,126 100,158 50,126 50,70" fill="#7aa0b8"/><polygon points="100,38 150,70 100,98 50,70" fill="#a6c3d6"/><polygon points="100,98 150,70 150,126 100,158" fill="#5a82a0"/><polygon points="100,98 50,70 50,126 100,158" fill="#6a92b0"/><path d="M60 80 L100 104 L140 80" stroke="#fff" stroke-opacity=".35" fill="none"/><path d="M56 112 L100 136 L144 112" stroke="#fff" stroke-opacity=".25" fill="none"/>',
 'hair': '<g fill="none" stroke-linecap="round"><path d="M70 30 C40 70 100 90 68 130 C52 150 76 168 70 176" stroke="#4a2c1d" stroke-width="12"/><path d="M92 28 C62 70 122 92 90 132 C74 152 98 170 92 178" stroke="#5b3623" stroke-width="12"/><path d="M114 28 C84 70 144 94 112 134 C96 154 120 172 114 180" stroke="#6b4129" stroke-width="12"/><path d="M136 30 C106 70 166 94 134 132 C118 152 142 168 136 176" stroke="#7a4a2f" stroke-width="12"/></g><rect x="56" y="22" width="96" height="14" rx="7" fill="#2b2420"/>',
 'candle': '<ellipse cx="100" cy="172" rx="46" ry="7" fill="#000" opacity=".12"/><rect x="58" y="92" width="84" height="76" rx="12" fill="#e8dccb"/><rect x="58" y="92" width="84" height="22" rx="10" fill="#d7c7ae"/><rect x="96" y="66" width="8" height="28" rx="3" fill="#f3ead9"/><path d="M100 36 C112 52 112 62 100 66 C88 62 88 52 100 36Z" fill="#f2a64a"/><path d="M100 48 C106 56 106 62 100 64 C94 62 94 56 100 48Z" fill="#ffe29a"/><rect x="74" y="122" width="52" height="3" fill="#a8977b"/><rect x="82" y="130" width="36" height="3" fill="#c0b199"/>',
 'jewel': '<ellipse cx="100" cy="170" rx="44" ry="6" fill="#000" opacity=".12"/><ellipse cx="100" cy="116" rx="40" ry="42" fill="none" stroke="#c9a66b" stroke-width="12"/><polygon points="100,52 118,66 100,86 82,66" fill="#dff1f2"/><polygon points="100,52 118,66 100,66" fill="#fff"/><polygon points="82,66 100,66 100,86" fill="#bcdde0"/>',
 'planter': '<ellipse cx="100" cy="172" rx="48" ry="7" fill="#000" opacity=".12"/><path d="M58 112 L142 112 L132 168 L68 168Z" fill="#d9c3a4"/><rect x="54" y="104" width="92" height="14" rx="5" fill="#c5ab86"/><path d="M100 104 C96 70 80 56 60 54 C62 76 78 98 100 104Z" fill="#4f7a56"/><path d="M100 104 C104 62 124 44 146 44 C144 72 126 96 100 104Z" fill="#5f8f67"/><path d="M100 104 C100 76 100 54 100 36 C112 58 112 86 100 104Z" fill="#3f6b4a"/>',
 'scarf': '<path d="M40 60 C80 40 120 80 160 56 L168 96 C124 124 84 84 44 112Z" fill="#b8574a"/><path d="M44 112 C84 84 124 124 168 96 L172 132 C126 160 86 124 48 150Z" fill="#d98b6a"/><path d="M56 100 L60 150 M72 102 L76 150 M88 98 L92 144" stroke="#fff" stroke-opacity=".35"/>',
    }[kind]
    return f'<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">{_bg(tone,i)}{body}</svg>'
TONES = {
 'warm': ("#f1e7da","#e3d2bd"), 'sand': ("#f3ecdf","#e6dac4"), 'blush': ("#f4e4df","#e8cdc4"), 'sage': ("#e5ece1","#cfdcc8"),
 'sky': ("#e3ecf2","#cbdbe7"), 'butter': ("#f7efd2","#ecdcaa"), 'stone': ("#ebe7e1","#d9d3c9"), 'ink': ("#2a2521","#1a1613"),
}
```

### `lib.py`

```python
from art import art, TONES
THEMES = {
 'A': dict(name='Atelier', bg='#FAF7F2', surf='#FFFFFF', ink='#1F1B16', mut='#6F675C', line='#E9E2D6', acc='#A9532D', accsoft='#F3E4D9', onacc='#FFFFFF', dark=False),
 'B': dict(name='Noir',    bg='#15120F', surf='#1E1A16', ink='#F4EEE6', mut='#A39A8D', line='#2D2822', acc='#C9A66B', accsoft='#2C261D', onacc='#15120F', dark=True),
 'C': dict(name='Sage',    bg='#F3F4ED', surf='#FFFFFF', ink='#1E2A24', mut='#66726A', line='#E1E5DA', acc='#46644F', accsoft='#E3EBDD', onacc='#FFFFFF', dark=False),
}
def css(t):
    return f"""
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
*{{box-sizing:border-box;margin:0;padding:0}} body{{font-family:Inter,system-ui,sans-serif;color:{t['ink']};background:{t['bg']};-webkit-font-smoothing:antialiased}}
.serif{{font-family:Fraunces,Georgia,serif;font-weight:500;letter-spacing:-.01em}} a{{color:inherit;text-decoration:none}}
.logo{{font-family:Fraunces,serif;font-weight:600;font-size:22px;letter-spacing:-.02em}} .logo b{{color:{t['acc']};font-weight:600}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:{t['acc']};color:{t['onacc']};border-radius:999px;padding:14px 24px;font-weight:600;font-size:15px}}
.btn.ghost{{background:transparent;color:{t['ink']};border:1px solid {t['line']}}} .btn.sm{{padding:10px 18px;font-size:13px}}
.muted{{color:{t['mut']}}} .chip{{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:{t['acc']};background:{t['accsoft']};padding:5px 10px;border-radius:999px}}
.card{{background:{t['surf']};border:1px solid {t['line']};border-radius:16px}}
.pcard .im{{aspect-ratio:1/1;border-radius:14px;overflow:hidden;position:relative}} .pcard .im svg{{width:100%;height:100%;display:block}}
.pcard .heart{{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.9);display:grid;place-items:center;color:#1F1B16}}
.pcard .tag{{position:absolute;left:10px;bottom:10px}} .pcard h4{{font-size:14px;font-weight:500;margin-top:10px;line-height:1.3}} .pcard .by{{font-size:12px;color:{t['mut']};margin-top:2px}}
.pcard .pr{{font-size:14px;font-weight:600;margin-top:4px}} .pcard .pr s{{font-weight:400;color:{t['mut']};margin-left:6px;font-size:12px}}
.stars{{color:{t['acc']};font-size:12px;letter-spacing:1px}}
.ico{{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}}
.phone{{width:390px;height:844px;border-radius:46px;background:{t['bg']};overflow:hidden;position:relative;box-shadow:0 30px 60px rgba(40,30,20,.22),0 0 0 9px #17130f;display:flex;flex-direction:column}}
.sb{{height:46px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 30px 6px;font-size:14px;font-weight:600;flex:none}}
.scroll{{flex:1;overflow:hidden;position:relative}}
.tabbar{{position:absolute;left:14px;right:14px;bottom:16px;height:64px;border-radius:32px;background:{'rgba(30,26,22,.72)' if t['dark'] else 'rgba(255,255,255,.72)'};backdrop-filter:blur(18px);border:1px solid {'rgba(255,255,255,.08)' if t['dark'] else 'rgba(0,0,0,.06)'};box-shadow:0 10px 30px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:space-around;font-size:10px;color:{t['mut']}}}
.tabbar div{{display:flex;flex-direction:column;align-items:center;gap:3px}} .tabbar .on{{color:{t['ink']};background:{t['accsoft']};padding:8px 14px;border-radius:22px}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:14px}} .pad{{padding:0 18px}}
div>svg[viewBox="0 0 200 200"]{{width:100%;height:100%;display:block}}
.cap{{position:absolute;top:-34px;left:0;right:0;text-align:center;font:600 13px Inter;letter-spacing:.08em;text-transform:uppercase;color:#6b6358}}
"""
I = {
 'search':'<svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
 'heart':'<svg class="ico" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/></svg>',
 'bag':'<svg class="ico" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
 'user':'<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
 'home':'<svg class="ico" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z"/></svg>',
 'grid':'<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
 'cam':'<svg class="ico" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
 'plus':'<svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 'check':'<svg class="ico" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
 'chev':'<svg class="ico" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
 'truck':'<svg class="ico" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
 'shield':'<svg class="ico" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
 'msg':'<svg class="ico" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
 'box':'<svg class="ico" viewBox="0 0 24 24"><path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/></svg>',
 'tag':'<svg class="ico" viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>',
 'chart':'<svg class="ico" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
 'wallet':'<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h5"/></svg>',
 'store':'<svg class="ico" viewBox="0 0 24 24"><path d="M4 9l2-5h12l2 5M4 9h16v11H4zM9 20v-6h6v6"/></svg>',
}
def stars(n=5): return '<span class="stars">'+'★'*n+'</span>'
def card(kind,tone,title,by,price,chip=None,was=None,rating='4.9 (128)'):
    tag = f'<span class="chip tag">{chip}</span>' if chip else ''
    w = f'<s>{was}</s>' if was else ''
    return f'<div class="pcard"><div class="im">{art(kind,TONES[tone])}<span class="heart">{I["heart"]}</span>{tag}</div><h4>{title}</h4><div class="by">{by}</div><div class="pr">{price}{w}</div></div>'
def phone(inner, label='', tab=None, time='9:41'):
    tabs=''
    if tab is not None:
        names=[('home','Shop'),('grid','Browse'),('heart','Saved'),('bag','Basket'),('user','Account')]
        tabs='<div class="tabbar">'+''.join(f'<div class="{"on" if i==tab else ""}">{I[k]}<span>{n}</span></div>' for i,(k,n) in enumerate(names))+'</div>'
    return f'<div style="position:relative;margin-top:44px"><div class="cap">{label}</div><div class="phone"><div class="sb"><span>{time}</span><span>5G ▮▮▮</span></div><div class="scroll">{inner}</div>{tabs}</div></div>'
def sheet(title, body, theme='A', width=None, bg='#E9E5DE'):
    t=THEMES[theme]
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{css(t)} html,body{{background:{bg}}} .sheet{{padding:30px 40px 50px;display:flex;gap:46px;justify-content:center;align-items:flex-start;{"width:%dpx;"%width if width else ""}}}</style></head><body><div class="sheet">{body}</div></body></html>'
```

### `build.py`

```python
from lib import *
def hdr(t):
    return f'<div class="pad" style="display:flex;align-items:center;gap:12px;padding-top:6px"><span class="logo">eazy<b>stores</b></span><span style="flex:1"></span>{I["heart"]}{I["bag"]}</div><div class="pad" style="margin-top:12px"><div class="card" style="display:flex;gap:10px;align-items:center;padding:12px 16px;border-radius:999px"><span class="muted">{I["search"]}</span><span class="muted" style="font-size:14px">Search pottery, art, perfume…</span></div></div>'
def home(theme='A', label=''):
    t=THEMES[theme]
    cats=['All','Art','Pottery','Perfume','Hair','Toys','3D printed','Candles']
    chips=''.join(f'<span style="flex:none;font-size:13px;padding:8px 14px;border-radius:999px;{"background:%s;color:%s;font-weight:600"%(t["ink"],t["bg"]) if i==0 else "border:1px solid %s"%t["line"]}">{c}</span>' for i,c in enumerate(cats))
    hero=f'''<div class="pad" style="margin-top:16px"><div style="border-radius:22px;background:{t['accsoft']};padding:22px 20px 0;overflow:hidden;position:relative;height:300px">
      <span class="chip" style="background:{t['surf']}">New season</span>
      <div class="serif" style="font-size:31px;line-height:1.08;margin-top:12px;max-width:230px">Made by hand.<br>Chosen with care.</div>
      <div class="btn sm" style="margin-top:16px">Shop new arrivals</div>
      <div style="position:absolute;right:-18px;bottom:-14px;width:170px;height:170px;border-radius:20px;overflow:hidden;transform:rotate(6deg);box-shadow:0 14px 30px rgba(0,0,0,.18)">{art('pottery',TONES['blush'])}</div>
      <div style="position:absolute;right:112px;bottom:-30px;width:120px;height:120px;border-radius:18px;overflow:hidden;transform:rotate(-7deg);box-shadow:0 14px 30px rgba(0,0,0,.18)">{art('perfume',TONES['butter'])}</div></div></div>'''
    grid=f'<div class="grid2">{card("print","warm","Dusk over the hills, A4 print","Harper & Pine","$38","Limited")}{card("candle","sand","Cedar &amp; fig soy candle","Ember Lane","$26","Handmade")}{card("print3d","sky","Geometric desk planter","Layer Lab","$24")}{card("hair","stone","Body wave bundle, 18 in","Crown Hair Co.","$118",None,"$140")}</div>'
    spot=f'<div class="card" style="padding:16px;display:flex;gap:14px;align-items:center"><div style="width:64px;height:64px;border-radius:50%;overflow:hidden;flex:none">{art("pottery",TONES["warm"])}</div><div style="flex:1"><div class="muted" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase">Maker spotlight</div><div class="serif" style="font-size:18px;margin-top:2px">Clay &amp; Ember</div><div class="muted" style="font-size:12px;margin-top:2px">Wheel-thrown stoneware, Calgary</div></div>{I["chev"]}</div>'
    inner=f'{hdr(t)}<div class="pad" style="margin-top:14px;display:flex;gap:8px;overflow:hidden">{chips}</div>{hero}<div class="pad" style="margin-top:22px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><div class="serif" style="font-size:22px">New from makers</div><span class="muted" style="font-size:13px">See all</span></div>{grid}<div style="margin-top:20px">{spot}</div></div>'
    return phone(inner,label or f'Home · {t["name"]}',tab=0)
def category():
    t=THEMES['A']
    fl=''.join(f'<span style="flex:none;font-size:13px;padding:8px 14px;border-radius:999px;border:1px solid {t["line"]};background:{t["surf"]}">{c} ⌄</span>' for c in ['Price','Material','Size','Handmade','Free shipping'])
    g=''.join([card('pottery','blush','Speckled stoneware mug','Clay &amp; Ember','$34','One of a kind'),card('pottery','sand','Tall bud vase, matte glaze','Kiln &amp; Co.','$48'),card('planter','sage','Hand-built planter','Clay &amp; Ember','$42','Handmade'),card('pottery','warm','Serving bowl, ash glaze','Studio Marlow','$64'),card('pottery','stone','Trinket dish set of 3','Kiln &amp; Co.','$29',None,'$36'),card('pottery','butter','Espresso cup pair','Studio Marlow','$44')])
    inner=f'<div class="pad" style="padding-top:4px"><div class="muted" style="font-size:12px">Home › Pottery &amp; ceramics</div><div class="serif" style="font-size:30px;margin-top:6px">Pottery &amp; ceramics</div><div class="muted" style="font-size:13px;margin-top:4px">412 pieces from 38 makers</div></div><div class="pad" style="margin-top:14px;display:flex;gap:8px;overflow:hidden">{fl}</div><div class="pad" style="margin-top:16px"><div class="grid2">{g}</div></div>'
    return phone(inner,'Category',tab=1)
def product():
    t=THEMES['A']
    sw=''.join(f'<span style="width:30px;height:30px;border-radius:50%;background:{c};{"outline:2px solid %s;outline-offset:2px"%t["ink"] if i==0 else "border:1px solid %s"%t["line"]}"></span>' for i,c in enumerate(['#b8704a','#e8dccb','#3d5a4b','#2c2620']))
    sz=''.join(f'<span style="padding:10px 16px;border-radius:12px;font-size:14px;{"background:%s;color:%s"%(t["ink"],t["bg"]) if i==1 else "border:1px solid %s"%t["line"]}">{s}</span>' for i,s in enumerate(['Small','Medium','Large']))
    inner=f'''<div style="height:360px;position:relative">{art('pottery',TONES['blush'])}<div style="position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:6px"><i style="width:18px;height:6px;border-radius:3px;background:#1F1B16"></i><i style="width:6px;height:6px;border-radius:3px;background:#1F1B16;opacity:.3"></i><i style="width:6px;height:6px;border-radius:3px;background:#1F1B16;opacity:.3"></i></div></div>
    <div class="pad" style="margin-top:16px"><span class="chip">Handmade · Made in Alberta</span><div class="serif" style="font-size:27px;line-height:1.1;margin-top:10px">Tall bud vase in terracotta glaze</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px"><span style="width:22px;height:22px;border-radius:50%;overflow:hidden;display:inline-block">{art('pottery',TONES['warm'])}</span><b>Clay &amp; Ember</b><span class="muted">· {stars()} 4.9 (128)</span></div>
    <div style="font-size:24px;font-weight:600;margin-top:12px">$48.00 <span class="muted" style="font-size:13px;font-weight:400">CAD · taxes included at checkout</span></div>
    <div style="margin-top:16px;font-size:13px;font-weight:600">Size</div><div style="display:flex;gap:8px;margin-top:8px">{sz}</div>
    <div style="margin-top:14px;font-size:13px;font-weight:600">Glaze</div><div style="display:flex;gap:12px;margin-top:10px">{sw}</div>
    <div class="card" style="margin-top:16px;padding:14px;display:flex;gap:12px;align-items:center"><span class="muted">{I["truck"]}</span><div style="font-size:13px"><b>Ships in 2–3 days</b><div class="muted">Arrives Nov 12–16 · $9.00 to T2N</div></div></div></div>
    <div style="position:absolute;left:0;right:0;bottom:0;padding:12px 18px 26px;background:{t['surf']};border-top:1px solid {t['line']};display:flex;gap:12px;align-items:center"><div style="flex:none"><div style="font-size:12px" class="muted">Total</div><div style="font-weight:600;font-size:18px">$48.00</div></div><div class="btn" style="flex:1">Add to basket</div><div class="btn ghost" style="padding:14px 16px">{I["heart"]}</div></div>'''
    return phone(inner,'Product page')
def cart():
    t=THEMES['A']
    def line(kind,tone,title,opt,price):
        return f'<div style="display:flex;gap:12px;padding:12px 0;border-top:1px solid {t["line"]}"><div style="width:64px;height:64px;border-radius:12px;overflow:hidden;flex:none">{art(kind,TONES[tone])}</div><div style="flex:1;font-size:14px"><b style="font-weight:500">{title}</b><div class="muted" style="font-size:12px">{opt}</div><div class="muted" style="font-size:12px;margin-top:6px">Qty 1</div></div><b style="font-size:14px">{price}</b></div>'
    def grp(name,items,ship,eta):
        return f'<div class="card" style="padding:14px 16px;margin-top:14px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:28px;height:28px;border-radius:50%;overflow:hidden;display:inline-block">{art("pottery",TONES["warm"])}</span><b style="font-size:14px">{name}</b><span class="muted" style="font-size:12px;margin-left:auto">{eta}</span></div>{items}<div style="display:flex;justify-content:space-between;font-size:13px;padding-top:10px;border-top:1px solid {t["line"]}" class="muted"><span>{I["truck"]} Shipping</span><span>{ship}</span></div></div>'
    inner=f'<div class="pad" style="padding-top:4px"><div class="serif" style="font-size:30px">Your basket</div><div class="muted" style="font-size:13px;margin-top:4px">2 makers · ships separately</div>{grp("Clay &amp; Ember",line("pottery","blush","Tall bud vase","Medium · Terracotta","$48.00")+line("candle","sand","Cedar &amp; fig candle","200 g","$26.00"),"$9.00","Nov 12–16")}{grp("Harper &amp; Pine",line("print","warm","Dusk over the hills","A4 print · Unframed","$38.00"),"Free","Nov 11–14")}<div class="card" style="margin-top:14px;padding:14px 16px;display:flex;justify-content:space-between;font-size:14px"><span>🎁 This is a gift</span><span class="muted">Add a message</span></div></div><div style="position:absolute;left:0;right:0;bottom:0;padding:14px 18px 30px;background:{t["surf"]};border-top:1px solid {t["line"]}"><div style="display:flex;justify-content:space-between;font-size:14px"><span class="muted">Subtotal · 3 items</span><b>$112.00</b></div><div style="display:flex;justify-content:space-between;font-size:14px;margin-top:4px"><span class="muted">Shipping</span><b>$9.00</b></div><div class="btn" style="width:100%;margin-top:12px">Checkout · $121.00</div></div>'
    return phone(inner,'Basket')
def tile(kind,tone,name,sel=False):
    t=THEMES['A']
    return f'<div style="border-radius:16px;overflow:hidden;position:relative;background:{t["surf"]};border:{"2px solid %s"%t["acc"] if sel else "1px solid %s"%t["line"]}"><div style="aspect-ratio:1.25/1">{art(kind,TONES[tone])}</div><div style="padding:10px 12px;font-size:14px;font-weight:500;display:flex;justify-content:space-between;align-items:center">{name}{"<span style=\'color:%s\'>%s</span>"%(t["acc"],I["check"]) if sel else ""}</div></div>'
def prog(n,total=5,left=''):
    t=THEMES['A']
    bars=''.join(f'<i style="flex:1;height:4px;border-radius:2px;background:{t["acc"] if i<n else t["line"]}"></i>' for i in range(total))
    return f'<div class="pad" style="padding-top:4px"><div style="display:flex;gap:6px">{bars}</div><div class="muted" style="font-size:12px;margin-top:8px;display:flex;justify-content:space-between"><span>Step {n} of {total}</span><span>{left}</span></div></div>'
def ob1():
    t=THEMES['A']
    tiles=''.join([tile('toy','butter','Toys &amp; games'),tile('print','warm','Art &amp; prints'),tile('print3d','sky','3D printing'),tile('perfume','blush','Perfume'),tile('hair','stone','Hair'),tile('pottery','sand','Pottery',True),tile('jewel','sage','Jewellery'),tile('candle','warm','Candles',True),tile('planter','sage','Home &amp; plants'),tile('scarf','blush','Clothing')])
    inner=f'{prog(1,5,"About 9 min left")}<div class="pad" style="margin-top:18px"><div class="serif" style="font-size:31px;line-height:1.1">What do you sell?</div><div class="muted" style="font-size:14px;margin-top:8px">Pick everything that fits. We will set up the right fields for you.</div><div class="grid2" style="margin-top:18px">{tiles}</div><div class="muted" style="text-align:center;font-size:13px;margin-top:14px">Something else? <b style="color:{t["acc"]}">Tell us</b></div></div><div style="position:absolute;left:0;right:0;bottom:0;padding:14px 18px 30px;background:linear-gradient(transparent,{t["bg"]} 30%)"><div class="btn" style="width:100%">Continue</div></div>'
    return phone(inner,'Seller sign-up · 1. What do you sell')
def ob2():
    t=THEMES['A']
    looks=''.join(f'<div style="flex:1;text-align:center"><div style="height:58px;border-radius:12px;background:{bg};border:{"2px solid %s"%t["acc"] if i==0 else "1px solid %s"%t["line"]};display:flex;align-items:flex-end;padding:6px"><i style="height:6px;width:60%;border-radius:3px;background:{ac}"></i></div><div style="font-size:11px;margin-top:5px" class="muted">{n}</div></div>' for i,(n,bg,ac) in enumerate([('Atelier','#FAF7F2','#A9532D'),('Noir','#1E1A16','#C9A66B'),('Sage','#E9EEE3','#46644F'),('Blush','#F7E9E5','#B4574A'),('Sky','#E6EEF4','#3F6F96')]))
    inner=f'''{prog(2,5,"About 7 min left")}<div class="pad" style="margin-top:18px"><div class="serif" style="font-size:31px;line-height:1.1">Make it yours</div>
    <div class="card" style="margin-top:16px;overflow:hidden"><div style="height:92px;background:{t['accsoft']};position:relative">{art('pottery',TONES['blush'])}<div style="position:absolute;inset:0;background:linear-gradient(transparent,rgba(0,0,0,.18))"></div></div><div style="padding:0 16px 16px;margin-top:-26px;position:relative"><div style="width:56px;height:56px;border-radius:50%;border:3px solid #fff;overflow:hidden">{art('pottery',TONES['warm'])}</div><div class="serif" style="font-size:22px;margin-top:8px">Clay &amp; Ember</div><div class="muted" style="font-size:13px">Wheel-thrown stoneware from Calgary</div></div></div>
    <div style="margin-top:18px;font-size:13px;font-weight:600">Shop name</div><div class="card" style="padding:14px 16px;margin-top:6px;font-size:15px">Clay &amp; Ember</div>
    <div style="margin-top:12px;font-size:13px;font-weight:600">One-line tagline</div><div class="card" style="padding:14px 16px;margin-top:6px;font-size:15px">Wheel-thrown stoneware from Calgary</div>
    <div style="margin-top:16px;font-size:13px;font-weight:600">Choose a look</div><div style="display:flex;gap:8px;margin-top:8px">{looks}</div></div>
    <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 18px 30px;background:linear-gradient(transparent,{t['bg']} 30%);display:flex;gap:10px"><div class="btn ghost" style="flex:none">Back</div><div class="btn" style="flex:1">Continue</div></div>'''
    return phone(inner,'2. Shop identity')
def ob3():
    t=THEMES['A']
    ph=lambda c: f'<div style="aspect-ratio:1;border-radius:14px;border:1.5px dashed {t["line"]};display:grid;place-items:center;color:{t["mut"]};background:{t["surf"]}">{I["cam"]}</div>'
    inner=f'''{prog(3,5,"About 5 min left")}<div class="pad" style="margin-top:16px"><div class="serif" style="font-size:31px;line-height:1.1">Add your first product</div><div class="muted" style="font-size:13px;margin-top:6px">Start with photos. Good light, plain background.</div>
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-top:14px"><div style="grid-row:span 2;border-radius:14px;overflow:hidden;position:relative">{art('pottery',TONES['blush'])}<span class="chip" style="position:absolute;left:8px;top:8px;background:#fff">Cover</span></div>{ph(1)}{ph(2)}{ph(3)}{ph(4)}</div>
    <div style="margin-top:16px;font-size:13px;font-weight:600">Title</div><div class="card" style="padding:13px 16px;margin-top:6px;font-size:15px">Tall bud vase in terracotta glaze</div>
    <div style="display:flex;gap:10px;margin-top:12px"><div style="flex:1"><div style="font-size:13px;font-weight:600">Price</div><div class="card" style="padding:13px 16px;margin-top:6px;font-size:15px">$ 48.00</div></div><div style="flex:1"><div style="font-size:13px;font-weight:600">Quantity</div><div class="card" style="padding:13px 16px;margin-top:6px;font-size:15px">6</div></div></div>
    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><span class="chip">✓ Pottery &amp; ceramics · suggested</span><span class="chip" style="background:{t['surf']};border:1px solid {t['line']};color:{t['ink']}">Handmade ✓</span><span class="chip" style="background:{t['surf']};border:1px solid {t['line']};color:{t['ink']}">One of a kind</span></div>
    <div class="card" style="margin-top:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;font-size:14px"><span>Add sizes or colours</span><span style="color:{t['acc']}">{I["plus"]}</span></div><div class="muted" style="font-size:12px;margin-top:10px">✓ Draft saved just now</div></div>
    <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 18px 30px;background:linear-gradient(transparent,{t['bg']} 30%);display:flex;gap:10px"><div class="btn ghost" style="flex:none">Back</div><div class="btn" style="flex:1">Publish product</div></div>'''
    return phone(inner,'3. First product (photo first)')
def qr():
    import random; random.seed(4); cells=''.join(f'<i style="background:{"#1F1B16" if random.random()>.5 else "transparent"}"></i>' for _ in range(169))
    return f'<div style="width:96px;height:96px;display:grid;grid-template-columns:repeat(13,1fr);padding:6px;background:#fff;border-radius:10px;border:1px solid #E9E2D6">{cells}</div>'
def ob4():
    t=THEMES['A']
    def todo(ic,title,sub,done=False):
        return f'<div class="card" style="padding:14px 16px;display:flex;gap:12px;align-items:center;margin-top:10px"><span style="width:36px;height:36px;border-radius:50%;background:{t["accsoft"]};color:{t["acc"]};display:grid;place-items:center;flex:none">{I[ic]}</span><div style="flex:1;font-size:14px"><b style="font-weight:600">{title}</b><div class="muted" style="font-size:12px">{sub}</div></div>{I["chev"]}</div>'
    inner=f'''{prog(5,5,"All set")}<div class="pad" style="margin-top:22px;text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:{t['accsoft']};color:{t['acc']};display:grid;place-items:center;margin:0 auto">{I["check"]}</div><div class="serif" style="font-size:32px;line-height:1.1;margin-top:14px">Your shop is live</div><div class="muted" style="font-size:14px;margin-top:8px">Clay &amp; Ember is open for business.</div>
    <div class="card" style="margin-top:18px;padding:16px;display:flex;gap:14px;align-items:center;text-align:left">{qr()}<div style="flex:1"><div class="muted" style="font-size:12px">Your shop link</div><div style="font-weight:600;font-size:14px;margin-top:2px">eazystores.ca/shop/clay-ember</div><div class="btn sm" style="margin-top:10px;padding:8px 14px">Copy link</div></div></div></div>
    <div class="pad" style="margin-top:20px"><div style="font-size:13px;font-weight:600">Three quick things to do next</div>{todo("wallet","Set up payouts","2 minutes · so you can get paid")}{todo("plus","Add more products","Or import many at once from a spreadsheet")}{todo("truck","Offer free shipping","Over $75 sells more for most shops")}</div>
    <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 18px 30px"><div class="btn" style="width:100%">Go to my studio</div></div>'''
    return phone(inner,'4. You are live')

def studio_desktop():
    t=THEMES['A']
    nav=[('home','Home',1),('box','Orders',0),('tag','Products',0),('msg','Messages',0),('tag','Promotions',0),('store','Shop page',0),('chart','Insights',0),('wallet','Payouts',0)]
    navh=''.join(f'<div style="display:flex;gap:12px;align-items:center;padding:11px 14px;border-radius:12px;font-size:14px;{"background:%s;font-weight:600"%t["accsoft"] if a else "color:%s"%t["mut"]}">{I[i]}{n}{"<span style=\'margin-left:auto;background:%s;color:#fff;border-radius:999px;font-size:11px;padding:2px 8px\'>3</span>"%t["acc"] if n=="Orders" else ""}</div>' for i,n,a in nav)
    def task(n,title,sub,btn):
        return f'<div class="card" style="padding:20px;flex:1"><div class="serif" style="font-size:38px">{n}</div><div style="font-weight:600;font-size:15px;margin-top:2px">{title}</div><div class="muted" style="font-size:13px;margin-top:2px">{sub}</div><div class="btn sm" style="margin-top:14px">{btn}</div></div>'
    rows=''.join(f'<div style="display:flex;gap:14px;align-items:center;padding:12px 0;border-top:1px solid {t["line"]};font-size:14px"><div style="width:44px;height:44px;border-radius:10px;overflow:hidden;flex:none">{art(k,TONES[tn])}</div><div style="flex:1"><b style="font-weight:500">{ti}</b><div class="muted" style="font-size:12px">{who} · {when}</div></div><b>{pr}</b><span class="chip" style="{st}">{lab}</span></div>' for k,tn,ti,who,when,pr,st,lab in [('pottery','blush','Tall bud vase, Medium','Maya R. · Edmonton','10 min ago','$57.00','','Ship today'),('candle','sand','Cedar &amp; fig candle ×2','Jordan K. · Calgary','1 hr ago','$61.00','','Ship today'),('pottery','warm','Speckled mug','Sofia L. · Toronto','Yesterday','$43.00','background:#E3EBDD;color:#3E6B54','Shipped')])
    spark='<svg viewBox="0 0 300 80" style="width:100%;height:80px"><path d="M0 62 L40 54 L80 58 L120 40 L160 46 L200 26 L240 32 L300 10" fill="none" stroke="#A9532D" stroke-width="3" stroke-linecap="round"/><path d="M0 62 L40 54 L80 58 L120 40 L160 46 L200 26 L240 32 L300 10 L300 80 L0 80Z" fill="#A9532D" opacity=".08"/></svg>'
    chk=''.join(f'<div style="display:flex;gap:10px;align-items:center;padding:8px 0;font-size:14px"><span style="width:20px;height:20px;border-radius:50%;{"background:%s;color:#fff"%t["acc"] if d else "border:1.5px solid %s"%t["line"]};display:grid;place-items:center;font-size:11px">{"✓" if d else ""}</span><span style="{"" if not d else "color:%s;text-decoration:line-through"%t["mut"]}">{x}</span></div>' for x,d in [('Create your shop',1),('Add your first product',1),('Choose your shop look',1),('Set up payouts',0),('Offer free shipping',0)])
    return f'''<div style="width:1180px;height:860px;border-radius:18px;overflow:hidden;background:{t['bg']};display:flex;box-shadow:0 30px 60px rgba(40,30,20,.2)"><div style="width:240px;background:{t['surf']};border-right:1px solid {t['line']};padding:22px 16px;display:flex;flex-direction:column;gap:4px"><div class="logo" style="padding:0 8px 18px">eazy<b>studio</b></div>{navh}<div style="margin-top:auto" class="card"><div style="padding:14px;font-size:13px"><b>Clay &amp; Ember</b><div class="muted" style="font-size:12px;margin-top:2px">eazystores.ca/shop/clay-ember</div></div></div></div>
    <div style="flex:1;padding:30px 36px;overflow:hidden"><div style="display:flex;align-items:center"><div><div class="muted" style="font-size:13px">Thursday, 5 November</div><div class="serif" style="font-size:34px;margin-top:2px">Good morning, Amara</div></div><div style="margin-left:auto;display:flex;gap:10px"><div class="btn ghost sm">View my shop</div><div class="btn sm">{I["plus"]} Add product</div></div></div>
    <div style="display:flex;gap:16px;margin-top:22px">{task('3','Orders to ship','Ship by tomorrow to stay on time','Open orders')}{task('2','Messages to answer','Average reply: 2 hours','Reply')}{task('1','Running low','Tall bud vase · 1 left','Restock')}</div>
    <div style="display:flex;gap:16px;margin-top:16px"><div class="card" style="flex:1.5;padding:20px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>This week</b><span class="muted" style="font-size:13px">vs last week <b style="color:#3E6B54">+18%</b></span></div><div style="display:flex;gap:30px;margin-top:10px"><div><div class="serif" style="font-size:30px">$642</div><div class="muted" style="font-size:12px">Sales</div></div><div><div class="serif" style="font-size:30px">14</div><div class="muted" style="font-size:12px">Orders</div></div><div><div class="serif" style="font-size:30px">1.2k</div><div class="muted" style="font-size:12px">Shop visits</div></div></div>{spark}</div>
    <div class="card" style="flex:1;padding:20px"><b>Finish setting up</b><div class="muted" style="font-size:13px;margin:2px 0 10px">3 of 5 done</div>{chk}</div></div>
    <div class="card" style="margin-top:16px;padding:18px 20px"><div style="display:flex;justify-content:space-between"><b>Recent orders</b><span class="muted" style="font-size:13px">See all</span></div>{rows}</div></div></div>'''
def studio_phone():
    t=THEMES['A']
    def task(n,title,btn): return f'<div class="card" style="padding:16px;flex:1"><div class="serif" style="font-size:30px">{n}</div><div style="font-size:13px;font-weight:600">{title}</div><div class="btn sm" style="margin-top:10px;padding:8px 14px">{btn}</div></div>'
    inner=f'''<div class="pad" style="padding-top:4px;display:flex;align-items:center"><span class="logo">eazy<b>studio</b></span><span style="margin-left:auto;width:34px;height:34px;border-radius:50%;background:{t["accsoft"]};color:{t["acc"]};display:grid;place-items:center;font-weight:600;font-size:13px">AM</span></div>
    <div class="pad" style="margin-top:16px"><div class="muted" style="font-size:13px">Thursday</div><div class="serif" style="font-size:30px">Good morning, Amara</div>
    <div style="display:flex;gap:12px;margin-top:16px">{task('3','Orders to ship','Open')}{task('2','Messages','Reply')}</div>
    <div class="card" style="margin-top:12px;padding:16px"><div class="muted" style="font-size:12px">This week</div><div style="display:flex;align-items:baseline;gap:10px"><div class="serif" style="font-size:34px">$642</div><b style="color:#3E6B54;font-size:13px">+18%</b></div><svg viewBox="0 0 300 70" style="width:100%;height:56px"><path d="M0 54 L40 46 L80 50 L120 34 L160 40 L200 22 L240 28 L300 8" fill="none" stroke="#A9532D" stroke-width="3" stroke-linecap="round"/></svg></div>
    <div class="card" style="margin-top:12px;padding:16px"><b style="font-size:14px">Finish setting up</b><div style="height:6px;border-radius:3px;background:{t["line"]};margin-top:10px"><i style="display:block;height:6px;width:60%;border-radius:3px;background:{t["acc"]}"></i></div><div class="muted" style="font-size:12px;margin-top:8px">3 of 5 done · Next: set up payouts</div></div></div>'''
    # studio tab bar
    tabs='<div class="tabbar">'+''.join(f'<div class="{"on" if i==0 else ""}">{I[k]}<span>{n}</span></div>' for i,(k,n) in enumerate([('home','Home'),('box','Orders'),('tag','Products'),('msg','Messages'),('chart','Insights')]))+'</div>'
    return f'<div style="position:relative;margin-top:44px"><div class="cap">Seller Studio on a phone</div><div class="phone"><div class="sb"><span>9:41</span><span>5G ▮▮▮</span></div><div class="scroll">{inner}</div>{tabs}</div></div>'
def shop(theme,label,kinds):
    t=THEMES[theme]
    banner={'A':'blush','B':'ink','C':'sage'}[theme]
    g=''.join(card(k,tn,ti,'Clay &amp; Ember',pr) for k,tn,ti,pr in kinds)
    inner=f'''<div style="height:150px;position:relative">{art('pottery',TONES[banner])}<div style="position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,.25))"></div></div>
    <div class="pad" style="margin-top:-34px;position:relative"><div style="display:flex;align-items:flex-end;gap:12px"><div style="width:72px;height:72px;border-radius:50%;border:4px solid {t['bg']};overflow:hidden;flex:none">{art('pottery',TONES['warm'])}</div><div class="btn sm" style="margin-left:auto;margin-bottom:6px">Follow</div></div>
    <div class="serif" style="font-size:28px;margin-top:10px">Clay &amp; Ember</div><div class="muted" style="font-size:13px;margin-top:2px">Wheel-thrown stoneware · Calgary, AB</div>
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><span class="chip">Verified maker</span><span class="chip" style="background:{t['surf']};border:1px solid {t['line']};color:{t['ink']}">★ 4.9 · 128 reviews</span></div>
    <div class="muted" style="font-size:14px;line-height:1.5;margin-top:12px">Small-batch pottery, thrown and glazed by hand in my garage studio. Every piece is food-safe and one of a kind.</div>
    <div style="display:flex;gap:18px;margin-top:16px;font-size:14px;border-bottom:1px solid {t['line']}"><b style="padding-bottom:10px;border-bottom:2px solid {t['acc']}">Shop</b><span class="muted">About</span><span class="muted">Reviews</span><span class="muted">Policies</span></div>
    <div class="grid2" style="margin-top:16px">{g}</div></div>'''
    return phone(inner,label,tab=None)
```

### `render.py`

```python
import sys; sys.path.insert(0,'.')
from build import *
T=THEMES['A']
def desk_home():
    t=T
    nav=''.join(f'<span style="font-size:14px">{c}</span>' for c in ['Art &amp; prints','Pottery','Perfume','Hair','Toys','3D printed','Jewellery','Candles','Gift guides'])
    cats=''.join(f'<div style="text-align:center"><div style="width:96px;height:96px;border-radius:50%;overflow:hidden;margin:0 auto;box-shadow:0 0 0 1px {t["line"]}">{art(k,TONES[tn])}</div><div style="font-size:14px;margin-top:10px">{n}</div></div>' for k,tn,n in [('print','warm','Art &amp; prints'),('pottery','blush','Pottery'),('perfume','butter','Perfume'),('hair','stone','Hair'),('toy','butter','Toys'),('print3d','sky','3D printed'),('jewel','sage','Jewellery'),('candle','sand','Candles')])
    prods=''.join(f'<div style="width:268px">{card(k,tn,ti,by,pr,ch,was)}</div>' for k,tn,ti,by,pr,ch,was in [('print','warm','Dusk over the hills, A4 print','Harper &amp; Pine','$38','Limited',None),('candle','sand','Cedar &amp; fig soy candle','Ember Lane','$26','Handmade',None),('print3d','sky','Geometric desk planter','Layer Lab','$24',None,None),('perfume','butter','Amber &amp; oud eau de parfum, 50 ml','Maison Nuit','$96',None,'$110')])
    return f'''<div style="width:1280px;background:{t['bg']}">
    <div style="background:{t['ink']};color:#fff;text-align:center;font-size:13px;padding:9px">Free shipping on orders over $75 from Canadian makers</div>
    <div style="display:flex;align-items:center;gap:36px;padding:20px 64px"><span class="logo" style="font-size:28px">eazy<b>stores</b></span><div class="card" style="flex:1;display:flex;gap:12px;align-items:center;padding:13px 20px;border-radius:999px;max-width:560px"><span class="muted">{I['search']}</span><span class="muted" style="font-size:14px">Search for pottery, art, perfume, hair, toys…</span></div><span style="margin-left:auto;display:flex;gap:22px;align-items:center;font-size:14px">Sell on eazystores {I['heart']}{I['user']}{I['bag']}</span></div>
    <div style="display:flex;gap:30px;padding:0 64px 16px;border-bottom:1px solid {t['line']}">{nav}</div>
    <div style="padding:34px 64px 0;display:flex;gap:28px"><div style="flex:1.1;border-radius:28px;background:{t['accsoft']};padding:64px 56px;position:relative;overflow:hidden;height:470px"><span class="chip" style="background:#fff">New season</span><div class="serif" style="font-size:62px;line-height:1.02;margin-top:20px">Made by hand.<br>Chosen with care.</div><div class="muted" style="font-size:18px;margin-top:18px;max-width:400px;line-height:1.5">Distinctive pieces from independent makers across Canada. Shipped straight from their studios.</div><div style="display:flex;gap:12px;margin-top:30px"><div class="btn">Shop new arrivals</div><div class="btn ghost" style="background:#fff">Meet the makers</div></div></div>
    <div style="flex:.9;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1.2fr 1fr;gap:18px;height:470px"><div style="grid-row:span 2;border-radius:24px;overflow:hidden">{art('pottery',TONES['blush'])}</div><div style="border-radius:24px;overflow:hidden">{art('perfume',TONES['butter'])}</div><div style="border-radius:24px;overflow:hidden">{art('candle',TONES['sand'])}</div></div></div>
    <div style="padding:56px 64px 0"><div class="serif" style="font-size:34px">Shop by category</div><div style="display:flex;justify-content:space-between;margin-top:26px">{cats}</div></div>
    <div style="padding:60px 64px 0"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="serif" style="font-size:34px">New from makers</div><span style="font-size:14px;border-bottom:1px solid {t['ink']}">See all</span></div><div style="display:flex;gap:26px;margin-top:24px">{prods}</div></div>
    <div style="margin:64px 64px 0;border-radius:28px;background:{t['surf']};border:1px solid {t['line']};display:flex;overflow:hidden"><div style="width:420px;position:relative"><div style="position:absolute;inset:0">{art('pottery',TONES['warm'])}</div></div><div style="padding:48px 56px;flex:1"><div class="muted" style="font-size:12px;letter-spacing:.1em;text-transform:uppercase">Maker spotlight</div><div class="serif" style="font-size:42px;margin-top:8px">Clay &amp; Ember</div><div class="muted" style="font-size:17px;line-height:1.55;margin-top:12px;max-width:520px">“I started throwing pots in my garage during winter. Now every mug I make finds a home somewhere in Canada.” Amara, Calgary</div><div class="btn" style="margin-top:22px">Visit the shop</div></div></div>
    <div style="display:flex;gap:40px;padding:56px 64px;justify-content:space-between">{''.join(f'<div style="display:flex;gap:14px;align-items:flex-start;max-width:320px"><span style="color:{t["acc"]}">{I[i]}</span><div><b style="font-size:15px">{h}</b><div class="muted" style="font-size:14px;margin-top:4px;line-height:1.5">{s}</div></div></div>' for i,h,s in [('shield','Buyer protection','If it does not arrive or is not as described, we make it right.'),('store','Real makers','Every shop is run by an independent small business.'),('truck','Shipped with care','Fragile pieces are packed to arrive in one piece.')])}</div></div>'''

OUT='.'
SHEETS={
 '1_home_desktop': sheet('', desk_home(), bg='#E9E5DE').replace('padding:30px 40px 50px','padding:0'),
 '2_buyer_phones': sheet('', ''.join([home('A','Home'),category(),product(),cart()])),
 '3_seller_onboarding': sheet('', ''.join([ob1(),ob2(),ob3(),ob4()])),
 '4_seller_studio': sheet('', studio_desktop()+studio_phone()),
 '5_shop_looks': sheet('', shop('A','Shop look · Atelier',[('pottery','blush','Bud vase','$48'),('pottery','sand','Speckled mug','$34'),('planter','sage','Planter','$42'),('pottery','warm','Serving bowl','$64')])+shop('B','Shop look · Noir',[('pottery','ink','Bud vase','$48'),('pottery','ink','Speckled mug','$34'),('planter','ink','Planter','$42'),('pottery','ink','Serving bowl','$64')])+shop('C','Shop look · Sage',[('pottery','sage','Bud vase','$48'),('pottery','sand','Speckled mug','$34'),('planter','sage','Planter','$42'),('pottery','butter','Serving bowl','$64')])),
 '6_brand_directions': ''.join([]),
}
for name,html in SHEETS.items():
    if name.startswith('6'): continue
    open(f'{name}.html','w').write(html)
for th in 'ABC':
    open(f'dir_{th}.html','w').write(sheet('',home(th,f'Direction {th} · {THEMES[th]["name"]}'),theme=th,bg='#E9E5DE'))
print('html written')

K={'A':[('pottery','blush','Bud vase','$48'),('pottery','sand','Speckled mug','$34'),('planter','sage','Planter','$42'),('pottery','warm','Serving bowl','$64')],
   'B':[('pottery','ink','Bud vase','$48'),('pottery','ink','Speckled mug','$34'),('planter','ink','Planter','$42'),('pottery','ink','Serving bowl','$64')],
   'C':[('pottery','sage','Bud vase','$48'),('pottery','sand','Speckled mug','$34'),('planter','sage','Planter','$42'),('pottery','butter','Serving bowl','$64')]}
for th in 'ABC':
    open(f'shop_{th}.html','w').write(sheet('',shop(th,f'Shop look · {THEMES[th]["name"]}',K[th]),theme=th,bg='#E9E5DE'))
```

### `make_reference.js`

```javascript
// Regenerates the approved mockups: sheets/*.html and reference/*.png (the 17 screens the build must match).
// Needs: python3 (standard library only) and Playwright for Node with Chromium (npm i -D playwright && npx playwright install chromium).
// Needs internet once for Google Fonts (Fraunces, Inter); if offline, install those two fonts on the machine first.
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
const SRC = __dirname, ROOT = path.resolve(SRC, '..'), SHEETS = path.join(ROOT, 'sheets'), REF = path.join(ROOT, 'reference');
fs.mkdirSync(SHEETS, { recursive: true }); fs.mkdirSync(REF, { recursive: true });
execFileSync('python3', [path.join(SRC, 'render.py')], { cwd: SHEETS, env: { ...process.env, PYTHONPATH: SRC }, stdio: 'inherit' });
let chromium; try { chromium = require('playwright').chromium; } catch { chromium = require('playwright-core').chromium; }
const url = (n) => 'file://' + path.join(SHEETS, n + '.html');
const phone = async (p, i, out) => { const bb = await (await p.$$('.phone'))[i].boundingBox(); await p.screenshot({ path: path.join(REF, out + '.png'), clip: { x: bb.x, y: bb.y + 46, width: 390, height: 798 } }); };
const JOBS = [
  ['2_buyer_phones', 1760, ['buyer-home', 'buyer-category', 'buyer-product', 'buyer-basket']],
  ['3_seller_onboarding', 1760, ['seller-onboarding-1-what-do-you-sell', 'seller-onboarding-2-shop-identity', 'seller-onboarding-3-first-product', 'seller-onboarding-4-live']],
  ['shop_A', 520, ['shop-look-atelier']], ['shop_B', 520, ['shop-look-noir']], ['shop_C', 520, ['shop-look-sage']],
  ['dir_A', 520, ['home-direction-atelier']], ['dir_B', 520, ['home-direction-noir']], ['dir_C', 520, ['home-direction-sage']],
];
(async () => {
  const b = await chromium.launch();
  for (const [n, w, names] of JOBS) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    await p.goto(url(n)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
    for (let i = 0; i < names.length; i++) await phone(p, i, names[i]);
    await p.close(); console.log('done', n);
  }
  let p = await b.newPage({ viewport: { width: 1860, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(url('4_seller_studio')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  await (await p.$('div[style*="width:1180px"]')).screenshot({ path: path.join(REF, 'studio-desktop.png') });
  await phone(p, 0, 'studio-phone'); await p.close();
  p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(url('1_home_desktop')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(REF, 'buyer-home-desktop.png'), fullPage: true });
  await b.close(); console.log('reference images written to', REF);
})();
```
