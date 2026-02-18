# Email verification on signup

Customer signup now supports email verification. The backend and customer frontend are wired; sending the actual email requires an email provider.

## Current behavior

- **Customer signup**: After signup, the API returns a message asking the user to check their email. The customer app shows a “Check your email” screen with the address they used.
- **Verify endpoint**: `GET /api/v1/customer/auth/verify-email?token=...` verifies the JWT token and sets `is_email_verified=True` for that customer.
- **Verify page**: The customer app has a `/verify-email` page that reads `?token=...` from the URL, calls the verify endpoint, and shows success or error.

## Enabling real verification emails

1. **Generate the link**  
   The backend already creates a verification token in `customer_auth.customer_signup` (see `create_email_verification_token`). You need to send an email that contains a link like:
   ```text
   https://your-customer-app.com/verify-email?token=<token>
   ```
   Use your real customer app base URL (e.g. `https://eazyfoods.ca` or Vercel URL).

2. **Send the email**  
   In `app/api/v1/endpoints/customer_auth.py`, after creating the customer and the token, call your email sender, for example:
   - **Resend / SendGrid / Mailgun**: use their Python SDK or `httpx` to call their API.
   - **SMTP**: use `aiosmtplib` or the standard library with your SMTP server.

   Example (pseudo-code):
   ```python
   from app.core.email import send_verification_email  # you implement this
   verification_url = f"{settings.FRONTEND_CUSTOMER_URL}/verify-email?token={token}"
   await send_verification_email(customer.email, verification_url)
   ```

3. **Config**  
   Add to `.env` and Render:
   - `FRONTEND_CUSTOMER_URL` – base URL of the customer app (for the link).
   - Your email provider keys (e.g. `RESEND_API_KEY`, `SMTP_HOST`, etc.) if you add a small `app.core.email` module.

4. **Vendor / Chef / Driver**  
   To add verification for other portals:
   - Add `is_email_verified` (or equivalent) to their models if missing.
   - Add a verify endpoint and token generation for each (reuse the same JWT pattern with a different `purpose`).
   - After their signup, send an email with a link to the corresponding verify page (e.g. vendor app `/verify-email?token=...`).
   - Add a VerifyEmail page and route in each frontend.

## Optional: require verification to log in

To block login until the email is verified, in the customer login endpoint (and similarly for others), after finding the customer, check:

```python
if not customer.is_email_verified:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Please verify your email first. Check your inbox for the verification link."
    )
```

Then the frontend can show that message and optionally offer “Resend verification email” (you’d add a dedicated endpoint that sends the same email again).
