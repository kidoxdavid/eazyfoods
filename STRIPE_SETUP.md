# Stripe Sandbox (Test Mode) Setup

Use Stripe **test** keys so payments never charge real cards. Charges appear in your Stripe Dashboard with **Test mode** turned ON.

## 1. Get test API keys

1. Log in at [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. Turn **Test mode** ON (toggle in the top-right).
3. Go to **Developers → API keys**.
4. Copy:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

## 2. Configure the backend

In your project root `.env`:

```env
PAYMENT_GATEWAY=stripe
# Paste from Stripe Dashboard -> Developers -> API keys (Test mode ON)
STRIPE_SECRET_KEY=<your Stripe secret key>
STRIPE_PUBLISHABLE_KEY=<your Stripe publishable key>
```

Restart the API server after changing `.env`.

## 3. Customer app must use the same API

The customer frontend loads Stripe using the publishable key from your API:

- **GET** `/api/v1/customer/payments/config` → returns `stripe_publishable_key` and `stripe_enabled: true`.

So the customer app’s API base URL must point at the same backend that has these env vars set:

- Local: usually `VITE_API_BASE_URL=http://localhost:8000` (or your backend port) so requests go to the same machine.
- Production: set `VITE_API_BASE_URL` to your deployed API (e.g. `https://eazyfoods-api.onrender.com`).

If the customer app calls a different host (or wrong port), it may get no key or the wrong key and Stripe will not work.

## 4. Test card numbers (Stripe test mode)

Use these only with **test** keys; they never charge real money.

| Card number           | Result        |
|-----------------------|---------------|
| **4242 4242 4242 4242** | Success       |
| 4000 0000 0000 0002    | Declined      |
| 4000 0000 0000 3220    | 3D Secure     |

- **Expiry:** any future date (e.g. 12/34).
- **CVC:** any 3 digits (e.g. 123).
- **ZIP:** any (e.g. 12345).

Full list: [Stripe test cards](https://docs.stripe.com/testing#cards).

## 5. Verify it’s working

1. Open the **customer** app and add something to the cart.
2. Go to Checkout and choose **Stripe**.
3. Optionally click **“Test Stripe — Send $1 to Dashboard”** to create a $1 test payment and confirm it appears in [Stripe Dashboard → Payments](https://dashboard.stripe.com/test/payments) (with Test mode ON).
4. Place an order using card **4242 4242 4242 4242** and confirm the order completes and the payment shows in the Stripe test Dashboard.

If Stripe still doesn’t work:

- Confirm **Test mode** is ON in the Dashboard when you copy keys.
- Confirm `.env` has `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` (no typos, no extra spaces).
- Confirm the customer app’s API base URL targets the backend that has these env vars (see section 3).
- Check the browser console and network tab for failed requests to `/customer/payments/config` or `/customer/payments/create-payment-intent`.
