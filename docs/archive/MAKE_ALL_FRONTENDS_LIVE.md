# Make All Frontends Live — Step-by-Step

Do these in order. Replace `YOUR_BACKEND_URL` with your real backend (e.g. `https://eazyfoods-api.onrender.com`).

---

## Step 1: Create 6 new Vercel projects (Customer may already exist)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → Import **kidoxdavid/eazyfoods** (or your repo).
2. For **each** row below, create a project:

   | Project name       | Root Directory     | Then click **Deploy** (env vars in Step 2) |
   |--------------------|--------------------|--------------------------------------------|
   | eazyfoods-portals  | `frontend-portals` | Deploy first so you get its URL             |
   | eazyfoods-vendor   | `frontend-vendor`   |                                            |
   | eazyfoods-chef     | `frontend-chef`     |                                            |
   | eazyfoods-admin    | `frontend-admin`    |                                            |
   | eazyfoods-delivery | `frontend-delivery` |                                            |
   | eazyfoods-marketing| `frontend-marketing`|                                            |

   **Root Directory:** click "Edit" next to the repo, set **Root Directory** to the value in the table (e.g. `frontend-portals`), then Deploy.

3. If **eazyfoods-customer** is not created yet, add it with Root Directory `frontend-customer`.

---

## Step 2: Add environment variables in Vercel

For each project, go to **Project → Settings → Environment Variables** and add:

### eazyfoods-portals

Add these **after** the other 5 app projects are deployed so you have their URLs. Use your real `*.vercel.app` URLs (or custom domains):

```
VITE_PORTAL_CUSTOMER_URL=https://eazyfoods.ca
VITE_PORTAL_VENDOR_URL=https://eazyfoods-vendor.vercel.app
VITE_PORTAL_CHEF_URL=https://eazyfoods-chef.vercel.app
VITE_PORTAL_ADMIN_URL=https://eazyfoods-admin.vercel.app
VITE_PORTAL_DELIVERY_URL=https://eazyfoods-delivery.vercel.app
VITE_PORTAL_MARKETING_URL=https://eazyfoods-marketing.vercel.app
```

(If you use custom domains like `vendor.eazyfoods.ca`, use those instead.)

### eazyfoods-customer

```
VITE_API_BASE_URL=YOUR_BACKEND_URL
VITE_PORTALS_URL=https://eazyfoods-portals.vercel.app
```

Plus **VITE_GOOGLE_MAPS_API_KEY** if you use maps.

### eazyfoods-vendor, eazyfoods-chef, eazyfoods-admin, eazyfoods-delivery, eazyfoods-marketing

For each, add only:

```
VITE_API_BASE_URL=YOUR_BACKEND_URL
```

(Add **VITE_GOOGLE_MAPS_API_KEY** for **eazyfoods-delivery** if needed.)

After adding or changing env vars, trigger a **Redeploy** for that project (Deployments → ⋮ → Redeploy).

---

## Step 3: Update CORS on Render

1. Render → your **backend service** → **Environment**.
2. Set **CORS_ORIGINS** to this (one line, comma-separated, **no spaces**). Use your real URLs:

```
https://eazyfoods.ca,https://www.eazyfoods.ca,https://eazyfoods-portals.vercel.app,https://eazyfoods-customer.vercel.app,https://eazyfoods-vendor.vercel.app,https://eazyfoods-chef.vercel.app,https://eazyfoods-admin.vercel.app,https://eazyfoods-delivery.vercel.app,https://eazyfoods-marketing.vercel.app
```

3. Save. Render will redeploy the backend.

---

## Step 4: Redeploy so env vars apply

- **Portals:** Add the 6 `VITE_PORTAL_*_URL` vars (Step 2), then **Redeploy**.
- **Customer:** Add **VITE_PORTALS_URL** (Step 2), then **Redeploy**.

---

## Step 5: Test

1. Open **Portals** (e.g. `https://eazyfoods-portals.vercel.app`) → each card should open the right app.
2. Open **Customer** (eazyfoods.ca) → footer link **“For vendors & partners – Portals”** should open Portals.
3. If any app shows CORS errors, add that app’s **exact** URL to **CORS_ORIGINS** on Render and redeploy the backend.

Done. All 7 frontends are live.
