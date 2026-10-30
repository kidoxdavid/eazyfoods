# Mobile responsiveness standards

The rules every screen follows, and where they live. If a new page breaks one, `apps/e2e/tests/responsive.test.ts` fails.

## Breakpoints

| Name | Width | Used for |
|---|---|---|
| Small phone | 320-359 px | must work: no sideways scroll, nothing overlapping |
| Phone | 360-479 px | the main design target |
| Large phone | 480-767 px | same layout as phone, more room |
| Tablet | 768-1023 px | two columns where it helps |
| Desktop | 1024 px and up | full layouts |

Tailwind (portals): `sm` 640, `md` 768, `lg` 1024. Shop stylesheet: phone rules sit under `max-width: 699px` and desktop under `min-width: 700px`.
Decision: the two stylesheets keep their own existing breakpoints (the shop has used 700/900 from the start, and changing it would move every desktop layout). The shared rules below are written against **767px** (phone and small tablet) so both apps agree on when a screen counts as a phone.

## The shared rules

They live in one file, `apps/web/src/responsive.css`, loaded by both apps (shop and portals).

1. **16px inputs on phones** (up to 767px): every text input, select and textarea is at least 16px, which stops iOS Safari zooming in when a field is tapped. Pinch zoom stays enabled: the viewport tag has no `maximum-scale` or `user-scalable=no`, and this must never be added.
2. **Date, time and month fields**: `min-width: 0`, full width in their row, and two fields in one row stack on narrow phones (under 480px). The apps use the browser's own pickers; there is no calendar library. A native picker opens inside the screen by itself, so the rules cover the field, not the pop-up.
3. **Touch targets**: primary controls (buttons, form fields, menu items, tabs) are at least 44px high on touch screens. Dense secondary controls (the Add button on a product card, table row icons) may be smaller but never under 24px (WCAG 2.2 AA minimum), and are kept 8px apart.
4. **No sideways scroll**: nothing sets a fixed width wider than the screen. Wide content (tables, chip rows) scrolls inside its own box.
5. **Modals** stay inside the screen: `max-height` of the screen minus a margin, scrolling inside.
6. **Fixed bars** (header, bottom tabs) do not hide content: the page keeps matching padding.

## Components that carry the rules

- `portal/shared/ui.jsx`: `Card`, `Stat`, `DataTable` (a table on desktop, cards on phones), `Modal`, `Field`, `Input`, `Select`, `Textarea`, `Tabs`.
- `ui.tsx` and `store.css` for the shop.
- `portal/index.css` and `responsive.css`: portal-wide phone rules.

Fix a problem in the shared component, not in the page.

## How it is checked

- `apps/e2e/tests/support/responsive.ts`: the measurements (sideways scroll, elements past the edge, controls overlapping, date fields, inputs under 16px, clipped text, tiny targets).
- `apps/e2e/tests/exhaustive/responsive-audit.test.ts`: every route at every width; writes `docs/MOBILE_QA_REGISTER.md`.
- `apps/e2e/tests/responsive.test.ts`: the strict regression test in the normal suite.
- `apps/e2e/qa/inventory.mjs`: lists every route from the routers, so the list cannot go stale.

Re-run: `cd apps/e2e && node qa/inventory.mjs && QA_AUDIT=1 npx vitest run tests/exhaustive/responsive-audit.test.ts && node qa/build-register.mjs`
