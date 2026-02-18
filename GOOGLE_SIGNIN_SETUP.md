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

---

## Troubleshooting: "Sign up with Google" returns 500 or fails

1. **Run the database migration on production (Render)**  
   If the API returns 500 when using Google sign-in, the production database may still have `password_hash` as NOT NULL. Run the migration once:
   - Render Dashboard → PostgreSQL → **Connect** (External Database URL).
   - Run: `psql "$DATABASE_URL" -f migrations/add_google_oauth_columns.sql`  
   Or paste and run the contents of `migrations/add_google_oauth_columns.sql` in the Render shell or any Postgres client connected to the Render DB.

2. **Set `GOOGLE_OAUTH_CLIENT_ID` on Render**  
   In Render → your **Web Service** (API) → **Environment**, add:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
   Use the **same** Client ID as in your frontend `VITE_GOOGLE_OAUTH_CLIENT_ID`. Redeploy the API after adding the variable.

3. **Check Render logs**  
   After the changes above, if it still fails, open Render → your API service → **Logs**. The backend now logs the real error (e.g. "Google token audience mismatch", "DB error (run migration?)"). Fix the cause indicated there.

4. **Cross-Origin-Opener-Policy (COOP) warnings**  
   If you see "Cross-Origin-Opener-Policy policy would block the window.postMessage call" in the browser console, the Google popup may be blocked by your host's COOP header. Ensure your frontend origin is in Google Cloud Console **Authorized JavaScript origins**. If the host sends `Cross-Origin-Opener-Policy: same-origin`, consider using a redirect-based Google sign-in flow or setting `Cross-Origin-Opener-Policy: same-origin-allow-popups` for the login/signup pages if your host allows it.
