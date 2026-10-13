# Option B: All Portals Live (Vercel)

This guide gets **all 7 frontends** live so the Portals page links to production URLs and the customer site footer links to the live Portals page.

**Prerequisites:** Backend and DB are already live (e.g. Render). Customer site may already be on Vercel (eazyfoods.ca).

---

## 1. Deploy each frontend to Vercel

Create **7 Vercel projects** from the same repo `kidoxdavid/eazyfoods`, each with a different **Root Directory** and env vars.

| Project name (suggestion) | Root Directory    | Purpose        |
|---------------------------|-------------------|----------------|
| eazyfoods-customer        | `frontend-customer` | Main store (eazyfoods.ca) |
| eazyfoods-portals         | `frontend-portals`  | Portal picker page |
| eazyfoods-vendor          | `frontend-vendor`   | Vendor dashboard |
| eazyfoods-chef            | `frontend-chef`     | Chef portal |
| eazyfoods-admin           | `frontend-admin`    | Admin dashboard |
| eazyfoods-delivery        | `frontend-delivery` | Delivery driver app |
| eazyfoods-marketing       | `frontend-marketing`| Marketing portal |

For **each** project:

1. Vercel → **Add New Project** → Import **kidoxdavid/eazyfoods**.
2. Set **Root Directory** to the folder in the table (e.g. `frontend-portals`).
3. **Framework Preset:** Vite (auto-detected).
4. **Build Command:** leave default (`npm run build` or `vite build`).
5. Add the **Environment Variables** from the table below.
6. Deploy. Copy the deployment URL (e.g. `https://eazyfoods-portals.vercel.app`).

---

## 2. Environment variables by app

### Backend (Render)

- **CORS_ORIGINS** — Add **all** live frontend URLs, comma-separated, no spaces, e.g.:
  ```text
  https://eazyfoods.ca,https://www.eazyfoods.ca,https://eazyfoods-portals.vercel.app,https://eazyfoods-vendor.vercel.app,https://eazyfoods-chef.vercel.app,https://eazyfoods-admin.vercel.app,https://eazyfoods-delivery.vercel.app,https://eazyfoods-marketing.vercel.app
  ```
  If you use custom domains (e.g. `portals.eazyfoods.ca`), use those URLs instead. Every origin that calls your API must be listed.

### frontend-customer

| Variable | Value | Required |
|----------|--------|----------|
| `VITE_API_BASE_URL` | Your backend URL (e.g. `https://eazyfoods-api.onrender.com`) | Yes |
| `VITE_PORTALS_URL` | Live Portals URL (e.g. `https://eazyfoods-portals.vercel.app` or `https://portals.eazyfoods.ca`) | Yes (for footer link) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key (if you use maps) | Optional |

### frontend-portals

No API. Only set these so the six portal cards point to the **live** apps:

| Variable | Value |
|----------|--------|
| `VITE_PORTAL_CUSTOMER_URL` | e.g. `https://eazyfoods.ca` or `https://eazyfoods-customer.vercel.app` |
| `VITE_PORTAL_VENDOR_URL` | e.g. `https://eazyfoods-vendor.vercel.app` or `https://vendor.eazyfoods.ca` |
| `VITE_PORTAL_CHEF_URL` | e.g. `https://eazyfoods-chef.vercel.app` |
| `VITE_PORTAL_ADMIN_URL` | e.g. `https://eazyfoods-admin.vercel.app` |
| `VITE_PORTAL_DELIVERY_URL` | e.g. `https://eazyfoods-delivery.vercel.app` |
| `VITE_PORTAL_MARKETING_URL` | e.g. `https://eazyfoods-marketing.vercel.app` |

If you omit these, the Portals app will fall back to `http://localhost:*` (dev only).

### frontend-vendor, frontend-chef, frontend-admin, frontend-delivery, frontend-marketing

For **each** of these:

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | Your backend URL (e.g. `https://eazyfoods-api.onrender.com`) |

Add **VITE_GOOGLE_MAPS_API_KEY** in **frontend-delivery** if you use maps there.

---

## 3. Custom domains (optional)

You can keep the default `*.vercel.app` URLs or attach custom domains in Vercel:

- **Customer:** already `eazyfoods.ca` / `www.eazyfoods.ca`
- **Portals:** e.g. `portals.eazyfoods.ca` → add CNAME in GoDaddy (or your DNS) to the Vercel project for Portals.
- **Vendor / Chef / Admin / Delivery / Marketing:** e.g. `vendor.eazyfoods.ca`, `chef.eazyfoods.ca`, etc. Add each in Vercel and DNS.

Then:

- In **Customer** set `VITE_PORTALS_URL=https://portals.eazyfoods.ca`.
- In **Portals** set each `VITE_PORTAL_*_URL` to the corresponding custom URL.
- In **Render** set `CORS_ORIGINS` to the **final** URLs (custom or `*.vercel.app`) that will call the API.

---

## 4. After deployment

1. Open the **Portals** URL. All six cards should open the correct live app in a new tab.
2. Open the **Customer** site, scroll to the footer, and click **“For vendors & partners – Portals”**. It should open the live Portals page.
3. If you see **CORS** or **403** errors when a frontend calls the API, add that frontend’s exact origin to **CORS_ORIGINS** on Render and redeploy the backend.

---

## 5. Quick checklist

- [ ] All 7 Vercel projects created with correct Root Directories.
- [ ] Customer: `VITE_API_BASE_URL` and `VITE_PORTALS_URL` set.
- [ ] Portals: all 6 `VITE_PORTAL_*_URL` set to live URLs.
- [ ] Vendor, Chef, Admin, Delivery, Marketing: `VITE_API_BASE_URL` set.
- [ ] Render: `CORS_ORIGINS` includes every frontend origin (and custom domains if used).
- [ ] Footer “Portals” link and Portals page cards tested in production.
