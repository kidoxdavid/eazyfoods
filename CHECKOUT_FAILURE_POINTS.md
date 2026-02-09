# What Exactly Can Make Checkout Fail

Use this to find the **exact** failure point. Open DevTools (F12) → **Network** tab, then try checkout. After you click "Pay & Place Order", look at the requests below.

---

## 1. **Create payment intent** (`POST .../customer/payments/create-payment-intent`)

**When:** As soon as the checkout page loads (with items in cart).

| If you see | Cause |
|------------|--------|
| **401** + body `"Could not validate credentials"` | Customer auth failed: token missing, wrong, or expired. **Fix:** Log out and log in again on the customer app. |
| **503** + `"Helcim is not configured"` | Backend has no `HELCIM_API_TOKEN`. **Fix:** Add `HELCIM_API_TOKEN=...` to `.env` and restart backend. |
| **400** + `"Helcim is not the configured payment gateway"` | `PAYMENT_GATEWAY` in config is not `"helcim"`. **Fix:** In `.env` set `PAYMENT_GATEWAY=helcim` or leave unset (default is helcim). |
| **400** + `"Invalid order amount"` | Frontend sent `total_amount` ≤ 0. **Fix:** Ensure cart total is > 0. |
| **No request at all** | Token was missing so component showed "Please log in...". **Fix:** Log in as customer. |
| **CORS or network error** | Backend not running or wrong URL. **Fix:** Run backend (`python3 run.py`), ensure Vite proxy targets `http://localhost:8000`. |

---

## 2. **Process payment** (`POST .../customer/payments/process-payment`)

**When:** After you click "Pay & Place Order" and card details are filled.

| If you see | Cause |
|------------|--------|
| **401** + `"Could not validate credentials"` | Same as above — token invalid/expired. **Fix:** Log in again. |
| **400** + `"Invalid card number"` / `"Invalid expiry"` / `"Invalid CVV"` | Backend validation of card format. **Fix:** Use test card e.g. 4000 0000 0000 0028, expiry 01/28, CVV 100. |
| **400** + `"Helcim payment failed: ..."` | Helcim API declined or returned an error. **Fix:** Check backend terminal for Helcim response; ensure test mode and test card. |
| **500** + `"Error connecting to Helcim"` | Backend cannot reach Helcim (network/firewall). **Fix:** Check backend can reach `https://api.helcim.com`. |
| **503** + `"Helcim is not configured"` | Same as create-payment-intent — no `HELCIM_API_TOKEN`. |

---

## 3. **Checkout** (`POST .../customer/cart/checkout`)

**When:** After payment succeeds (or if payment was already done).

| If you see | Cause |
|------------|--------|
| **401** + `"Could not validate credentials"` | Token invalid. **Fix:** Log in again. |
| **400** + `"Cart is empty"` | Cart was cleared before request or items not sent. **Fix:** Ensure cart has items and request body has `items: [{ product_id, quantity }]`. |
| **404** + `"Product ... not found"` | Cart has invalid or deleted product id. **Fix:** Refresh, re-add items. |
| **400** + `"Insufficient stock"` | Product stock too low for quantity. **Fix:** Reduce quantity or fix stock in DB. |

---

## 4. **Frontend-only (no failing API call)**

| What you see | Cause |
|--------------|--------|
| **"Payment failed: undefined"** | Parent got no result from payment (wrapper bug). **Fix:** Applied in code — wrapper now always returns `{ success, error }`. |
| **"Please fill in all card details correctly"** (but form is full) | Stale payment handler. **Fix:** Applied — ref-based wrapper uses latest card data. |
| **"Payment system is not ready"** | `processHelcimPayment` was never set (create-payment-intent never succeeded or component not ready). **Fix:** Wait for "Initializing payment..." to finish; if it stays, check create-payment-intent request above. |
| **Place Order button stays disabled** | `cardReady` is false. **Fix:** Fill all four card fields; ensure create-payment-intent returned 200 so `paymentToken` is set. |

---

## Quick check

1. **Backend:** `curl -s http://localhost:8000/api/v1/customer/payments/config` → should return `{"gateway":"helcim", "helcim_enabled": true/false, ...}`. If `helcim_enabled: false`, set `HELCIM_API_TOKEN` in `.env`.
2. **Auth:** In DevTools → Application → Local Storage, key `token` should exist and be a long JWT string. If missing, log in again.
3. **Network:** In Network tab, any request to `/customer/payments/` or `/customer/cart/checkout` should have **Request Headers** → `Authorization: Bearer <token>`. If not, auth is not being sent.
