# What causes "Cannot access 'Tt' before initialization" on checkout

## Cause

The error comes from **Stripe** being loaded too early, in a way that triggers a **Temporal Dead Zone (TDZ)** in the bundled code. The minified name `Tt` is a variable or export inside Stripe’s (or a related) bundle.

Two things were pulling Stripe into the initial load:

1. **`optimizeDeps.include`**  
   Having `@stripe/stripe-js` and `@stripe/react-stripe-js` in `include` made Vite **pre-bundle** Stripe and wire it into the app’s dependency graph. That pre-bundle is loaded with the app and can run before other code is ready → TDZ.

2. **`optimizeDeps` discovery (no exclude)**  
   Even after removing Stripe from `include`, Vite still **discovers** dependencies by crawling the source. It sees `import('@stripe/stripe-js')` in `CheckoutPaymentSection.jsx` and can still pre-bundle Stripe. So Stripe had to be **explicitly excluded** so it is never pre-bundled and only loads when the dynamic `import()` runs on the checkout page.

## Fixes applied

- **`vite.config.js`**
  - Stripe removed from `optimizeDeps.include`.
  - Stripe added to `optimizeDeps.exclude`: `['@stripe/stripe-js', '@stripe/react-stripe-js']`.
- **Checkout flow**
  - New checkout page: `CheckoutPage.jsx` (no Stripe imports).
  - New payment block: `CheckoutPaymentSection.jsx` (Stripe only via `import('@stripe/...')` inside `useEffect`).
  - Route uses `CheckoutPage`; Stripe runs only after the payment section mounts and runs its effect.

## After changing config

1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Restart dev server or run a fresh build
3. Hard refresh the app in the browser (e.g. Cmd+Shift+R)

If the error persists, ensure no other file in the app does a **top-level** or **eager** import of `@stripe/*` or of a component that imports Stripe (e.g. the old `Checkout.jsx` / `StripePayment.jsx` are not used by the route anymore).
