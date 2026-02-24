# Stripe Connect setup (vendor payouts)

Vendors can connect Stripe to receive **automatic payouts** when customers pay for orders. Money is transferred to their Stripe Express account shortly after each successful payment.

## 1. Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Connect** → **Settings**.
2. Complete your **platform profile** (business name, support email, etc.) if prompted.
3. Under **Connect settings**, note your **Platform account** — this is the account that receives customer payments and sends transfers to vendors.

## 2. Environment variables

Add to your backend `.env`:

```env
# Existing Stripe keys (used for Connect too)
STRIPE_SECRET_KEY=sk_live_...   # or sk_test_... for testing
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Required for automatic transfers after payment
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: vendor portal URL for Connect return/refresh links (defaults to request Origin)
VENDOR_PORTAL_BASE_URL=https://vendor.yourdomain.com
```

### Getting the webhook secret

1. In Stripe Dashboard go to **Developers** → **Webhooks**.
2. **Add endpoint**: URL = `https://your-api-domain.com/api/v1/webhooks/stripe`.
3. Select event: **payment_intent.succeeded**.
4. Create; copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## 3. Database migration

Run once:

```bash
python migrations/add_stripe_connect.py
```

This adds to `vendors`: `stripe_connect_account_id`, `stripe_connect_details_submitted`; and to `orders`: `stripe_transfer_id`.

## 4. Flow

- **Vendor**: In **Profile** → “Receive payouts” → **Connect with Stripe**. They are redirected to Stripe to complete Express onboarding (identity, bank). When done, they are redirected back to your vendor portal.
- **Customer** pays at checkout (existing Stripe payment) → money lands in **your** Stripe balance.
- **Webhook** `payment_intent.succeeded` fires → backend finds orders for that payment and, for each order whose vendor has a connected Stripe account, creates a **Transfer** to that vendor’s Connect account. Vendors then receive payouts from Stripe to their bank (Stripe’s schedule).

Vendors **without** Stripe Connect still appear in the system; you pay them manually as before (bank details in Profile are the fallback).

## 5. Testing

- Use **Stripe test keys** (`sk_test_...`, `pk_test_...`) and a **test webhook** endpoint (e.g. Stripe CLI: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`).
- Create a test vendor, connect Stripe (test mode), place a test order with Stripe, and confirm a Transfer appears in Dashboard → **Connect** → **Transfers** and that the order has `stripe_transfer_id` set.
