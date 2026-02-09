# Helcim Test Account – Next Steps

You have a Helcim **developer test account**. Follow these steps to run test payments.

---

## 1. Use the test account API token

Helcim usually gives you a **separate API token** for the test account.

- In your Helcim dashboard, go to **Settings → API Access** (for the **test** account).
- Copy the **API Token** for that test account.
- In your project root, open `.env` and set:

```env
HELCIM_API_TOKEN=your_test_account_api_token_here
HELCIM_TEST_MODE=true
HELCIM_API_URL=https://api.helcim.com/v2
PAYMENT_GATEWAY=helcim
```

- Save `.env` and **restart your backend** so it picks up the new token.

---

## 2. Use Helcim’s official test cards

On a developer test account, use these **Helcim test card numbers** (not generic ones like 4111 1111 1111 1111):

| Card Type   | Card Number        | Expiry | CVV  |
|------------|--------------------|--------|------|
| **Visa**   | 4124939999999990   | 01/28  | 100  |
| **Visa**   | 4000000000000028   | 01/28  | 100  |
| **Mastercard** | 5413330089099130 | 01/28  | 100  |
| **Mastercard** | 5413330089020011 | 01/28  | 100  |
| **Amex**   | 374245001751006    | 01/28  | 1000 |
| **Discover** | 6011973700000005 | 01/28  | 100  |

- **Expiry:** use **01** and **28** (month/year).
- **CVV:** **100** (or **1000** for Amex).
- **Cardholder name:** any name (e.g. `Test User`).

---

## 3. Run a test payment

1. Start (or restart) your backend so it uses the test token and `HELCIM_TEST_MODE=true`.
2. In the app, go to **checkout** and add something to the cart.
3. Enter one of the test cards above (e.g. Visa `4124939999999990`, 01/28, 100).
4. Click **Pay & Place Order**.

---

## 4. Check the result

- **If the payment succeeds:** your test account and token are set up correctly.
- **If you see an error:** check `backend.log` for lines containing `Helcim` (payload, response, errors) and use that to debug or share with support.

Quick way to see recent Helcim-related logs:

```bash
tail -200 backend.log | grep -i helcim
```

---

## 5. When you go to production

- In Helcim, get your **production/live** API token.
- In `.env` switch to the live token and set:

```env
HELCIM_API_TOKEN=your_live_api_token_here
HELCIM_TEST_MODE=false
```

- Restart the backend again.

Keep your **test** and **production** tokens in separate `.env` files or clearly labeled so you don’t mix them.
