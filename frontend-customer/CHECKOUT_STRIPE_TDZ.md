# What causes "Cannot access 'Tt' before initialization" on checkout

## Cause

The error comes from **Stripe** being loaded too early, in a way that triggers a **Temporal Dead Zone (TDZ)** in the bundled code. The minified name `Tt` is a variable or export inside Stripe’s (or a related) bundle. Any time the Stripe npm packages (`@stripe/stripe-js`, `@stripe/react-stripe-js`) are included in a bundle that loads at app startup, this can happen.

## Fix applied (final)

**CheckoutPaymentSection no longer uses the Stripe npm packages at all.** It loads Stripe only from the CDN:

1. When the payment section mounts, it injects `<script src="https://js.stripe.com/v3/"></script>` (if not already present) and waits for `window.Stripe`.
2. It uses `window.Stripe(publishableKey)` and the raw Stripe.js API (`stripe.elements()`, `elements.create('payment')`, `stripe.confirmPayment()`) to show the Payment Element and confirm payment.
3. No file in the app imports `@stripe/stripe-js` or `@stripe/react-stripe-js` for checkout, so the bundler never includes Stripe in any chunk. The TDZ error cannot occur.

Additional safeguards in `vite.config.js`:

- Stripe removed from `optimizeDeps.include` and added to `optimizeDeps.exclude`.

## After deploy

1. Rebuild: `cd frontend-customer && npm run build`
2. Redeploy the new build to eazyfoods.ca (or your host).
3. Hard refresh the site (Cmd+Shift+R).

The old `Checkout.jsx`, `StripePayment.jsx`, and `TestStripeModal.jsx` still exist but are not used by the route; you can delete them to avoid confusion.
