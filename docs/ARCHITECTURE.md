# Architecture

## Overview

```
 customer web ─┐
 mobile app ───┤                        ┌─ Postgres (SQLAlchemy, Alembic)
 vendor portal ┤                        ├─ Stripe / Stripe Connect / Helcim
 chef portal ──┼──►  FastAPI  /api/v1 ──┼─ Cloudinary / S3 uploads
 driver portal ┤                        ├─ SMTP email
 admin portal ─┤                        └─ Anthropic API (EazyBot)
 marketing ────┘
```

One backend serves every client. Endpoint modules are named by audience: `customer_*`, `vendor_*` /
unprefixed vendor routes, `chef_*`, `driver_*`, `admin_*`, `marketing_*`.

Core domain: **vendors** own **stores** and **products**; **chefs** sell **cuisines** (prepared dishes);
**customers** place **orders** containing either; **drivers** fulfil **deliveries**; **payouts** settle with
vendors, chefs and drivers through Stripe Connect; **promotions, coupons, ads and banners** are run by
marketing/admin. **Recipes and meal plans** link meals to groceries so a plan can be added to the cart in one step.

## Login-free mode

Authentication has been removed on purpose, for now. How it works:

- `app/api/v1/dependencies.py` keeps the old `get_current_customer / vendor / chef / driver / admin`
  functions (so ~345 endpoints are unchanged) but they resolve an identity instead of verifying a token:
  1. an optional `X-Customer-Id`, `X-Vendor-Id`, `X-Chef-Id`, `X-Driver-Id` or `X-Admin-Id` header selects the acting row;
  2. otherwise the oldest active row of that role is used.
- **Customers:** each browser/device generates a UUID and sends it as `X-Customer-Id`. The API creates a private guest
  customer for it on first use, so every device has its own cart, orders and addresses. Orders therefore live with the
  device; clearing browser storage loses access to them.
- **Contact details:** checkout always asks for first name, last name, email and phone. The API saves them onto
  the device's customer, so the store, chef and driver can see who the order is for. They are remembered on the device.
  The device cart, favourites and saved-for-later live in browser storage (one set per device).
- **Admin:** a `system@eazyfoods.local` super-admin is created on first use. Its password hash is unusable.
- **Portals choose who they act as:** vendor, chef and driver portals show an "Acting as" selector (fed by
  `GET /api/v1/identities/{vendor|chef|driver}`) when more than one account exists. The choice is stored in the
  browser (`acting_as`) and sent as `X-Vendor-Id` / `X-Chef-Id` / `X-Driver-Id`. Pending drivers (inactive until
  an admin approves them) cannot be acted as.
- **Partners:** vendor/chef/driver *signup* endpoints still exist as onboarding. Without any vendor/chef/driver
  row, their portals return a 404 explaining that none exists yet.
- Removed: all login, Google sign-in, forgot/reset-password, email verification, customer and admin signup routes.

### Security implications

Anyone who can reach the API can read or change anything (orders, payouts, customer data, admin settings), and can
act as any role by sending the matching header. Do not expose this build to the internet. When auth returns,
reimplement the resolvers in `dependencies.py` to verify a token and nothing else needs to change.

## Frontend structure

- `contexts/AuthContext.jsx` in each app is now a no-login provider with the old `useAuth()` shape (`token` is the constant
  `'no-auth'`), so legacy checks keep working.
- Customer web design tokens live in `frontend-customer/tailwind.config.js` (`primary` green, `nude` orange accent,
  `ink` neutrals, `cream` backgrounds, Fraunces display + Inter) with shared classes in `src/index.css`
  (`btn-primary`, `btn-secondary`, `btn-accent`, `card`, `input`, `chip`, `section-title`, `skeleton`).

## Payments

Card payments use Stripe (or Helcim). When an admin sets `payments_suspended` in the payment settings, checkout
places the order as cash / pay-on-delivery, which is also the easiest way to test the whole flow locally.
Known gap: the checkout endpoint trusts a client-supplied payment id (it does not verify it with Stripe/Helcim yet).

## Database

Schema changes go through Alembic (`alembic revision --autogenerate -m "..."`, then review). The `customer_carts` table
that used to be created by raw SQL at request time is now a model, and is also created at startup if missing
(databases adopted with `alembic stamp head` may never have had it).
