# Payments, refunds and settlement

## Principles
- The browser never decides an order is paid. Only a **signature-verified provider webhook** moves an order to paid. (Helcim adds one more route: the browser may report the card window's result, but the server checks Helcim's hash and then reads the transaction back from Helcim itself before anything is marked paid.)
- The amount the customer pays is computed on the server from current prices; the payment amount is compared to the provider's reported amount, and a mismatch is **not** treated as paid (it raises a support ticket).
- Webhooks are recorded once per `(provider, event_id)`; replays are ignored. Applying an event runs in one transaction, so a failure makes the provider retry.
- Card numbers never touch our servers or database (Stripe's Payment Element collects them).

## Provider interface
`apps/api/src/payments/provider.ts`: `createPayment`, `cancelPayment`, `parseWebhook`, `refund`, `transfer`.
- `mock` (development/test only): no network, no money. Exercises the same signed-webhook code path. **Refuses to start in production.** The dev-only simulate endpoint does not exist in production and cannot mark anything paid by itself.
- `helcim`: HelcimPay.js (Helcim's own card window), refunds and reversals through Helcim's Payment API. **Written from Helcim's developer documentation and tested only against a fake Helcim server, never against a real Helcim account.** No marketplace payouts: see the Helcim section below.
- `stripe`: PaymentIntents + Payment Element, refunds, transfers for vendor payouts. **Written against Stripe's documented API but not yet run against a Stripe account.**

## Order of events
1. Checkout locks the offers, re-prices, reserves stock (15 min) and creates the order as `pending_payment`.
2. A payment is created for the exact total (idempotency key `pay:<order>`).
3. Webhook `payment succeeded` -> stock committed, order `placed`, suborders `placed`, ledger posted, basket cleared, emails queued.
4. Webhook `payment failed` or expiry -> reservations released; order `payment_failed`/`expired`; no ledger entries.
5. A late success after expiry re-claims stock if still free, otherwise the affected suborder is cancelled and fully refunded.

## Ledger (append-only, double entry)
Debits positive, credits negative; each transaction sums to zero (enforced by a deferred database trigger). Accounts: `cash_provider`, `vendor_payable`, `commission_revenue`, `delivery_revenue`, `tax_payable`, `discount_expense`, `driver_payable`, `delivery_cost`, `refund_loss`.
- **Payment captured:** cash in; vendor payable = merchandise - commission; commission, delivery fee and tax recognised; coupon booked as discount expense.
- **Refund (vendor-funded):** vendor payable and commission reversed pro-rata, tax and delivery reversed, discount expense reversed.
- **Refund (marketplace-funded):** vendor keeps earnings; our loss is booked.
- **Driver earning:** delivery cost / driver payable when delivery completes.
- **Payout:** clears the payable against cash.
Corrections are new reversing entries. Nothing is edited or deleted.

## When money is "earned"
Recorded as payable to the vendor at payment, but **paid out only after the order is delivered and a hold period passes** (default 2 days). Refunds after payout leave a negative balance that nets against later payouts.

## Refund workflow
Customers cannot refund themselves: they report a problem. Support/admin **request** a refund (line items, optional delivery fee, vendor- or marketplace-funded); **finance approves**; the provider is called outside any database transaction using an idempotency key; amounts are recomputed from live state at approval; over-refunding is blocked by an atomic quantity claim. Store rejections, customer cancellations before acceptance, declined substitutions, unavailable items and auto-timeouts refund automatically.

## Stripe setup (PAYMENT_PROVIDER=stripe), test mode first
1. Create a Stripe account for a Canadian business. Stay in **test mode** (the toggle in the Stripe dashboard) until the checklist below passes.
2. Developers, **API keys**: copy the **publishable key** (`pk_test_...`) and the **secret key** (`sk_test_...`). The secret key is a password: it goes only into the server's settings.
3. Developers, **Webhooks**, add an endpoint: URL `https://<your domain>/api/webhooks/payments`, events `payment_intent.succeeded`, `payment_intent.payment_failed` and `charge.dispute.created`. Copy its **signing secret** (`whsec_...`).
4. Connect (vendor payouts): in Stripe, turn on **Connect** and choose Express accounts. Without it, vendor payouts stay manual bank transfers.
5. Server settings: `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. Restart. Admin, System should say "Stripe configured".
6. Stripe test cards: `4242 4242 4242 4242` succeeds, `4000 0025 0000 3155` asks for 3-D Secure, `4000 0000 0000 9995` is declined (any future expiry, any CVC).
The card form is Stripe's Payment Element. The site's content security policy lets `js.stripe.com`, `hooks.stripe.com` and `api.stripe.com` through only when Stripe is the provider (`apps/api/src/lib/csp.ts`; before this was added, the card form would have been blocked).

## Stripe go-live checklist (do before any live payment)
1. Confirm Stripe Connect is available for your business and the exact fund-flow/terms in Canada (separate charges and transfers vs destination charges; who is merchant of record; who is liable for disputes).
2. Create **test-mode** keys and a webhook endpoint (`POST /api/webhooks/payments`) subscribed to `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`. Set `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`.
3. Run these in test mode: successful 3-D Secure card, declined card, expired hold then late success, refund full and partial, dispute event, duplicate webhook delivery, vendor payout transfer to a test connected account.
4. Reconcile the Stripe balance report with the ledger `cash_provider` account for the test period.
5. Implement/verify vendor Connect onboarding (accounts are currently attached by an admin entering the `acct_...` id) and import processing fees into the ledger.
6. Only then switch to live keys. Never fabricate events to "prove" it works.

## Payout accounts (Stripe Connect Express) and automatic payouts
Vendors and home cooks connect a payout account from Vendor portal → Payouts. Onboarding is hosted by Stripe (account links), so EAZyfoods never handles bank details or identity documents. The account state (`none`, `pending`, `restricted`, `enabled`) is read from Stripe when the vendor opens the Payouts page; a transfer is only attempted for `enabled` accounts. Everything else stays a manual bank transfer that finance marks paid.

**NOT VERIFIED against a live or test Stripe account.** The Stripe calls (`accounts.create` type express/CA, `accountLinks.create`, `accounts.retrieve`, `transfers.create`) were written from the API docs and exercised only against the mock provider. Before go-live, in Stripe test mode:
1. Enable Connect for the platform and confirm Express accounts and the `transfers` capability are available for Canadian platforms and Canadian payees; read Stripe's Connect terms and any cross-border rules.
2. Connect a test vendor end to end (start → hosted form with test data → return); confirm `payout_status` becomes `enabled`.
3. Pay a test order, mark it delivered, age it past the hold, create a payout, and confirm the Transfer appears in the Stripe dashboard for the right amount and account, and that the ledger booking matches.
4. Make a transfer fail (e.g. insufficient available balance) and confirm the payout shows `failed`, then retry succeeds exactly once (idempotency key `payout:<id>`).
5. Consider linking transfers to the original charge (`source_transaction`) so funds are available at transfer time; with separate charges and transfers, the platform balance must hold the funds first.
6. Decide who bears Stripe fees, refunds and disputes after a transfer (currently the platform absorbs refunds' commission return per the ledger rules).

Settings (Admin → Settings): `payout.hold_days` (stores), `payout.hold_days_kitchen` (home kitchens), `payout.auto_enabled`, `payout.auto_min_cents`. Automatic payouts run hourly in the API process and are safe to run from several instances (orders are locked and payouts are idempotent); finance can also run the pass on demand from Finance. Do not turn automatic payouts on until the checklist above is done.

## Helcim (PAYMENT_PROVIDER=helcim)

### How it works
1. Checkout asks Helcim for a HelcimPay.js session (`POST /v2/helcim-pay/initialize`, `api-token` header) for the exact server total, with **our own invoice number**. Helcim returns a public `checkoutToken` (stored in `payments.client_secret`, sent to the browser) and a private `secretToken` (stored in `payments.provider_secret`, never sent to any client). Both expire after 60 minutes.
2. The shop loads `https://secure.helcim.app/helcim-pay/services/start.js` and calls `appendHelcimPayIframe(checkoutToken)`. The card is typed into Helcim's window, so card numbers never reach our site or server. The content security policy allows `secure.helcim.app` only when Helcim is the provider.
3. The result reaches us two ways, and **both end in the same idempotent code** (`applyEvent`, recorded once per `txn:<Helcim transaction id>`):
   - **Browser confirmation** `POST /api/payments/helcim/confirm`: we check Helcim's SHA-256 hash with the secret token, then **read the transaction back from Helcim** with our API token.
   - **Webhook** `POST /api/webhooks/payments` with Helcim's `{id, type: "cardTransaction"}`: we check the HMAC signature (`webhook-id`, `webhook-timestamp`, `webhook-signature`, verifier token), then read the transaction back from Helcim.
4. Whichever arrives first marks the order paid, **only** if Helcim itself reports an approved purchase whose invoice number and amount match our payment. A decline inside the card window does not cancel the order (the customer can try another card); the order expires with its normal 15-minute stock hold.
5. Refunds call `POST /v2/payment/refund` (original transaction id, amount, a customer IP address, idempotency key). If Helcim refuses a **full** refund (an unsettled charge), we try `POST /v2/payment/reverse` instead.

### Setup (do in a Helcim developer test account first)
1. Ask Helcim for a **developer test account** (see their Developer testing page). Test cards only work there; on a live account they are declined and may incur charges.
2. Helcim account: All Tools, Integrations, **API Access Configurations**, New API Access. Tick the **checkout integration** box and enter your shop address (for example `https://eazyfoods.ca`; this check is skipped on developer test accounts). Set **Transaction Processing: Admin** (refunds and reversals need Admin; "Positive Transaction" is enough only for taking payments). Copy the token. It is a secret: server side only.
3. Helcim account: Integrations, **Webhooks**: turn on, set the Deliver URL to `https://<your domain>/api/webhooks/payments` (must be https and must not contain the word "Helcim"), tick **Card Transaction**, save, and copy the **verifier token**.
4. Set on the server: `PAYMENT_PROVIDER=helcim`, `HELCIM_API_TOKEN`, `HELCIM_WEBHOOK_VERIFIER` (the verifier token exactly as shown), and `HELCIM_REFUND_IP` (a public IP address of your server or office; Helcim requires one on every refund). Optional: `HELCIM_PARTNER_TOKEN` if you are a Helcim integration partner. In production the server refuses to start without the first two.
5. Restart. Admin, System should say "Helcim configured".

### Test checklist (developer test account, in this order)
Helcim test cards: Mastercard 5413 3300 8909 9130 and Visa 4000 0000 0000 0028 (expiry 01/28, CVV 100). A CVV of 200 or higher simulates declines in Helcim's Payment API tests.
1. Successful card: order becomes paid, ledger `cash_provider` equals the order total, `payments.provider_transaction_id` is filled.
2. Declined card: order stays `pending_payment`, the customer can try again, no paid order exists.
3. Close the card window without paying, then reopen it from the order page.
4. Close the browser right after paying: the **webhook alone** must still place the order.
5. Duplicate webhook delivery (re-send from Helcim's dashboard): nothing changes.
6. Full refund after a same-day payment (probably a reversal), and a partial refund on a settled one. Confirm each in the Helcim dashboard.
7. Reconcile Helcim's transaction report with the ledger `cash_provider` account.
8. Gift card purchase and redemption.

### What Helcim does not do (read before choosing it)
- **No marketplace payouts.** Helcim has no equivalent of Stripe Connect: every dollar lands in **your** Helcim merchant account, and vendor and driver payouts are **manual bank transfers** (the platform's existing manual payout flow; Finance marks each paid with a reference). Vendors do not get an online payout setup page. Get legal and accounting advice on holding customer funds on behalf of vendors before launching a multi-vendor marketplace this way.
- **No dispute webhook.** Chargebacks appear only in the Helcim dashboard; watch it.
- Helcim's checkout window requires a public https address that you whitelist, so local development needs a tunnel (see Helcim's "Testing HelcimPay in localhost environments").

### Not verified
Every call above follows Helcim's published documentation but has **not** been run against a real Helcim account: field names in the card-transaction response (`status`, `type`, `amount`, `invoiceNumber`, `transactionId`), the exact refund and reverse behaviour for unsettled charges, the browser result format, and whether Helcim accepts a custom invoice number on a checkout session. The test checklist above is how each is confirmed. Do not go live until it passes.
