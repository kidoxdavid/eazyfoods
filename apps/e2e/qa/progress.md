**Stage 1 - Discovery and audit: done.** `qa/inventory.mjs` reads the routers of all 8 apps: 186 routes (customer 34, vendor 35, chef 26, driver 18, marketing 19, finance 14, admin 39, hub 1; 26 of them open a record). First audit (before any fix): 30 critical and 834 high findings.

**Stage 2 - Global foundation: done.** `apps/web/src/responsive.css` (loaded by the shop and every portal): 16px inputs, selects and textareas on phones (iOS no longer zooms in; pinch zoom untouched), date/time/month fields that never squeeze out of their box, 24px checkboxes and radios, long words wrap, 28px minimum hit area for icon-only buttons and link-style buttons, taller text links, landscape rule for the header and tab bar. Standards: `docs/MOBILE_STANDARDS.md`.

**Stage 3 - Portal-by-portal: done.** Real defects found by the audit and fixed at the cause:
- Phone number-card rule in `portal/index.css` also caught form grids and cards with headings (it squeezed the ad form to half width and made the automation cards overflow): now only grids of number cards.
- Fixed `minWidth: 300px` on every analytics chart made the page scroll sideways at 320px.
- Date fields squeezed to about 100px (orders, deliveries, financial overview, chef analytics): now stacked below 400/420px.
- Product form "Suggest text" button pushed past the edge at 320px.
- Customer detail page (admin): long values widened the page.
- Footer, top-strip, store-tag, flyer, "see all" and comparison-table links under 24px; the Add-to-basket result link; hub footer links; password show/hide buttons; hero dots (touch area enlarged, banner unchanged).
- Short landscape phones: the shop header and tab bar took more than half of the screen; the header now scrolls away and the tab bar is a slim row.
- Windows that did not announce themselves as dialogs (barcode, inventory, store form) now do.

**Stage 4 - Automated testing: done.** Full audit (`tests/exhaustive/responsive-audit.test.ts`): every route at 320, 360, 390, 430, 768, 1024, 1280, 1440 and two landscape sizes. Result after the fixes: 0 critical findings, 0 high findings.

**Stage 5 - Regression testing: done.** New tests in the normal suite: `responsive.test.ts` (every plain route, 5 widths, strict), `mobile_workflows.test.ts` (customer register-to-payment, vendor product and stock, driver availability, admin menu and pricing, at 320 and 360), `responsive_overlays.test.ts` (12 windows, menus and drawers at 5 phone sizes including landscape). The whole suite was re-run after the shared changes.

**Decisions**
- Controls between 24 and 44px are reported as information, not failures. The brief asks for about 44px on primary controls; dense secondary controls (the Add button on a product card, table icons) stay smaller on purpose because compact cards were an explicit request, and none is under the WCAG 2.2 minimum of 24px. Form fields and menu items remain 40-46px.
- The shop and the portals keep their own breakpoints (700/900 and Tailwind 640/768/1024); the shared rules are written against 767px.
- The apps use the browsers' own date pickers. There is no calendar library to fix; the field and its layout are what the rules and tests cover.
