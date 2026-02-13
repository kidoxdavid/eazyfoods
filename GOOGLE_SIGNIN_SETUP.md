# Sign in with Google (Gmail) – Setup

All four apps (Customer, Vendor, Chef, Delivery) now support **Sign in with Google** on their login and signup pages. To enable it, configure the following.

---

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
3. If prompted, configure the **OAuth consent screen** (External, add your app name and support email).
4. Application type: **Web application**.
5. Add **Authorized JavaScript origins**:
   - Local: `http://localhost:3003`, `http://localhost:3000`, `http://localhost:3006`, `http://localhost:3004` (customer, vendor, chef, delivery ports).
   - Production: `https://eazyfoods.ca`, `https://vendor.eazyfoods.ca`, `https://chef.eazyfoods.ca`, `https://portals.eazyfoods.ca`, etc. (all domains where the apps run).
6. Add **Authorized redirect URIs** if required (for web, often the same as origins or leave as suggested).
7. Create and copy the **Client ID**.

---

## 2. Backend (.env and Render)

Add to your backend `.env` (and to **Render** → Environment):

```bash
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The backend uses this to verify the Google ID token when users sign in with Google.

---

## 3. Database migration

Run once (local and production) to add Google OAuth columns and allow nullable passwords. **If you see "column X.google_id does not exist" on Render, the production DB has not had this migration run.**

**From your machine (using Render’s external DB URL):**

1. In **Render Dashboard** → your **PostgreSQL** service → **Info** → copy **External Database URL** (starts with `postgres://`).
2. From your project root, with that URL set:
   ```bash
   export DATABASE_URL="postgres://user:password@host/dbname?sslmode=require"
   psql "$DATABASE_URL" -f migrations/add_google_oauth_columns.sql
   ```
   (Use the actual URL; `?sslmode=require` is often needed for Render.)

**Or run the SQL manually:** Render → Postgres → **Connect** (or use a client like psql, TablePlus, etc.), then paste and run the contents of `migrations/add_google_oauth_columns.sql`.

---

## 4. Frontend env (each app)

For **Customer**, **Vendor**, **Chef**, and **Delivery** (local `.env` and Vercel env vars):

```bash
VITE_GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Use the **same** Client ID as the backend. Each app will only show the “Continue with Google” / “Sign in with Google” button when this variable is set.

---

## 5. Behavior

All four portals support **sign in or sign up** with Google:

- **Customer:** If the email is new, a customer account is created automatically.
- **Vendor:** If the email is new, a vendor account is created (Vendor + Store Owner + primary Store) with status `onboarding`; they can complete profile and store details later.
- **Chef:** If the email is new, a chef account is created with `verification_status=pending` and `is_active=false`; they can complete profile and wait for admin verification.
- **Driver:** If the email is new, a driver account is created with `verification_status=pending` and `is_active=false`; they can complete profile and wait for admin approval.

After setup, the login and signup pages will show an “Or continue with” / “Or sign in with Google” section and the Google button when `VITE_GOOGLE_OAUTH_CLIENT_ID` is set.
