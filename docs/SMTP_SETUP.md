# SMTP setup (backend email)

The backend uses SMTP to send **password reset** and **email verification** emails. If SMTP is not configured, those links are only **logged** to the server console (useful for local dev).

## 1. Where to set it

Set these in your **backend** environment (e.g. in the project root `.env` or in your host’s env vars, e.g. Render):

```bash
# Required for sending emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# Optional: "From" address (defaults to SMTP_USER if not set)
SMTP_FROM_EMAIL=noreply@yourdomain.com

# Required for correct links in emails (customer app URL)
CUSTOMER_RESET_PASSWORD_BASE_URL=https://eazyfoods.ca
```

- **Local:** use your project root `.env` (same folder as `app/`).
- **Render / other host:** set the same variables in the service’s **Environment** / **Environment variables**.

## 2. What each variable does

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`, `smtp.sendgrid.net`). |
| `SMTP_PORT` | Usually `587` (TLS). |
| `SMTP_USER` | SMTP login (often your email or API username). |
| `SMTP_PASSWORD` | SMTP password or app password. |
| `SMTP_FROM_EMAIL` | Optional. “From” address; if unset, `SMTP_USER` is used. |
| `CUSTOMER_RESET_PASSWORD_BASE_URL` | Base URL of the **customer** app. Reset and verification links will be `{this}/login?token=...` or `{this}/verify-email?token=...`. |

## 3. Example: Gmail

1. Turn on 2FA for the Gmail account.
2. Create an **App password**: Google Account → Security → 2-Step Verification → App passwords.
3. In `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM_EMAIL=yourname@gmail.com
CUSTOMER_RESET_PASSWORD_BASE_URL=https://eazyfoods.ca
```

## 4. Example: SendGrid

1. Create an API key in SendGrid (Dashboard → Settings → API Keys).
2. In `.env`:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@eazyfoods.ca
CUSTOMER_RESET_PASSWORD_BASE_URL=https://eazyfoods.ca
```

## 5. Checking that it works

- **Without SMTP:** trigger “Forgot password” or sign up; the reset or verification link will appear in the **backend logs** (e.g. “SMTP not configured. Password reset link (log only): …”).
- **With SMTP:** the same link is sent by email to the user. Ensure `CUSTOMER_RESET_PASSWORD_BASE_URL` matches the URL where your customer app is actually hosted.

## 6. Config source

Settings are read in `app/core/config.py` and used in `app/core/email.py` for `send_password_reset_email` and `send_verification_email`.
