# EAZYstores: the "build it exactly like the mockups" prompt

_Use this together with `docs/EAZYSTORES_PROMPT.md` (the functional brief). That document says **what the product does**; this one says **exactly what it must look like** and how to prove it. Paste both into a new Claude Code session in a repo that contains the `design/eazystores/` folder (committed alongside this file). Honest limit: a text prompt cannot by itself guarantee pixel-identical output. What makes "exactly" achievable is that the real mockup source is in the repo as the reference, the build must pass an automated screenshot comparison against it, and any deviation must be reported to me._

---

# BRIEF: Build EAZYstores so it looks exactly like the approved mockups

## 0. What "exactly" means
1. The **source of truth** is `design/eazystores/`. Read `design/eazystores/README.md` first. Open `design/eazystores/sheets/*.html` in a browser and study `design/eazystores/reference/*.png` (2x screenshots, one per screen). Do **not** redesign, restyle, "improve" or substitute fonts, colours, spacing, copy or icons. If something looks wrong to you, build it as shown and tell me.
2. Every screen listed in section 6 must **pass a visual-regression test** against its reference PNG (section 7) before you move on. A failing visual test is a failing build.
3. The device frame, notch, bezel and the fake "9:41 / 5G" status bar in the mockups are **mockup dressing, not part of the app**. Build only what is inside the phone screen (390 px wide). The tab bar floats inside the screen and is part of the app.
4. Product images in the mockups are drawn SVG placeholders (`design/eazystores/source/art.py`). Port them as a `ProductArt` component with the same shapes and tones: they are used when a product has no photo, in empty states and in the demo seed, so the visual tests can match. Real seller photos replace them in production, shown in the same frames.
5. I like **three looks: Atelier, Noir and Sage**. Build all three as complete themes (section 2). Atelier is the default platform look. Noir and Sage are available as the platform look (admin setting) and as seller shop looks, alongside two more shop looks, Blush and Sky (section 2.4).

## 1. Workflow (do in this order)
1. Read this file, `docs/EAZYSTORES_PROMPT.md`, `design/eazystores/README.md` and all of `design/eazystores/source/*.py` (`lib.py` is the design system, `art.py` the illustrations, `build.py` the phone/studio screens, `render.py` the desktop home).
2. **Phase D0, design system first**: self-host the fonts, create design tokens (CSS custom properties per theme), the icon set, `ProductArt`, and the shared components (section 3). Add a hidden route `/_design` that renders every component in all three themes so I can review it.
3. Build the real screens (section 6) as React components wired to real data (the functional brief), one at a time, each with its visual test (section 7) passing before the next.
4. Then continue with the phases in `docs/EAZYSTORES_PROMPT.md` section 16 for everything the mockups do not show, **using only the tokens and components defined here**, so new screens feel identical in style.
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
Everything in `docs/EAZYSTORES_PROMPT.md` still applies: honest verification reporting, small commits to `main`, API and browser tests, the crawl of every page of every area on desktop and phone with no console errors, responsive audit (no sideways scroll, 44 px tap targets, WCAG AA contrast, including all three themes), performance budget (LCP under 2.5 s on 4G), accessibility, and `docs/LAUNCH_READINESS.md`.
- Screens or states the mockups do not show (hover, focus rings, loading skeletons, empty states, errors, dialogs, tables on phones, admin and finance consoles) must be built from the same tokens and components, with the same spacing rhythm, and listed in a "not mocked" section of `/_design` for my review.
- Where a real-data screen cannot match a mockup exactly (long titles wrapping, missing photos), keep the mockup's structure and sizes and document the difference.

## 9. Definition of done for the design
All 17 reference screens pass section 7 in their stated look; `/_design` shows every component in Atelier, Noir and Sage; no hard-coded colours outside the token files (a lint rule fails the build on a raw hex outside `tokens`); fonts are self-hosted; and a final report lists, per screen, the measured pixel-difference percentage and any deviation with its reason.
