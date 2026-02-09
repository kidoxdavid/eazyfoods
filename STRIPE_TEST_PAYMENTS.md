# See test transactions in Stripe

Your `.env` uses **test keys** (`sk_test_...` and `pk_test_...`). All payments from this app go to your Stripe account in **Test mode**.

## 1. Where to look

1. Open **https://dashboard.stripe.com**
2. Turn **Test mode ON** (toggle in the top-right or left sidebar – it should say "Test mode" or show an orange state).
3. Go to **Payments**: https://dashboard.stripe.com/test/payments  
   Or use the left menu: **Payments** (while Test mode is ON).

You will only see test payments when Test mode is **ON**. If the toggle is off, you're in Live mode and test payments won't appear there.

## 2. When do payments appear?

- **As soon as you open the Stripe form on checkout**  
  The backend creates a PaymentIntent. It appears in Dashboard with status **Incomplete**.
- **After you complete payment (card + Pay & Place Order)**  
  The same payment moves to status **Succeeded**.

So: load checkout → choose Stripe → wait for the card form. That alone should create one payment (Incomplete). After you pay, it becomes Succeeded.

## 3. Check that the backend is creating payments

When you load checkout and the Stripe form appears, the **backend terminal** (where you run `python3 run.py`) should log something like:

```
[Stripe] PaymentIntent created: pi_xxxxx amount=... cents | key=sk_test_51... | View: https://dashboard.stripe.com/test/payments
```

- If you **see** this line: the backend is creating PaymentIntents. Open the link in the log (with Test mode ON) and you should see that `pi_xxxxx` in the list.
- If you **don’t** see this line: the frontend isn’t calling the backend (e.g. not logged in, or wrong URL). Log in as a customer, add something to the cart, go to checkout, select **Stripe**, and wait for the form to load.

## 4. Same Stripe account as your keys

Test payments only show in the Stripe account that owns the keys in `.env`. If you have more than one Stripe account, make sure you’re logged into the one where you copied `sk_test_...` and `pk_test_...` from (Developers → API keys, Test mode).

## 5. Quick checklist

- [ ] `.env` has `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_PUBLISHABLE_KEY=pk_test_...`
- [ ] Backend restarted after changing `.env` (so it loads the test keys)
- [ ] Stripe Dashboard → **Test mode** is **ON**
- [ ] You’re on **Payments** (or the URL contains `/test/payments`)
- [ ] You’re logged in as a customer, have items in the cart, and the Stripe form has loaded on checkout at least once (to create a PaymentIntent)
