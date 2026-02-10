# Taking eazyfoods Live

This guide covers deploying the **backend (FastAPI)** and **frontends (React/Vite)** so the site is live on the internet.

---

## Overview

- **Backend**: FastAPI on Python, needs PostgreSQL and env vars (DB, Stripe, etc.).
- **Frontends**: 7 apps (customer, **portals**, vendor, chef, admin, delivery, marketing). Each is a static build; all except portals call the backend API.
- **Database**: PostgreSQL (must be reachable from the backend).
- **Uploads**: Backend serves files from `uploads/`. On free tiers this folder may not persist across deploys; use object storage (S3, etc.) later if needed.

- **Option B (all portals live):** To deploy the Portals app and have the customer footer link to it, with all portal cards pointing to live apps, see **[DEPLOYMENT_OPTION_B.md](./DEPLOYMENT_OPTION_B.md)**.

---

## Option A: Render (backend + DB) + Vercel (frontends) — recommended to start

Good free tiers, minimal setup. You get URLs like:
- Backend: `https://eazyfoods-api.onrender.com`
- Customer site: `https://eazyfoods-customer.vercel.app`
- (Same idea for other frontends.)

### 1. Database (PostgreSQL on Render)

1. Go to [render.com](https://render.com) → Sign up / Log in.
2. **New** → **PostgreSQL**.
3. Name: `eazyfoods-db`, region nearest to you. Create.
4. After creation, open the DB and copy **Internal Database URL** (use this for the backend on Render). For external tools (e.g. local migrations) use **External Database URL**.

### 2. Backend on Render

1. **New** → **Web Service**.
2. Connect your GitHub repo `kidoxdavid/eazyfoods`.
3. Settings:
   - **Root Directory:** leave blank (repo root).
   - **Runtime:** Python 3.
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance type:** Free (or paid if you need always-on).

4. **Environment** (add variables):
   - **DATABASE_URL** = the **Internal Database URL** from your Render PostgreSQL (e.g. `postgresql://user:pass@host/dbname`). The app uses this when set.
   - Or instead of DATABASE_URL you can set **DB_HOST**, **DB_PORT**, **DB_NAME**, **DB_USER**, **DB_PASSWORD** (from the same Internal Database URL).
   - `SECRET_KEY` = a long random string (e.g. `openssl rand -hex 32`).
   - `CORS_ORIGINS` = your frontend URLs, comma-separated, e.g.  
     `https://eazyfoods-customer.vercel.app,https://eazyfoods-vendor.vercel.app`  
     (Add all live frontend URLs; no spaces.)
   - Optional: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_MAPS_API_KEY` (for Maps), etc. Copy from your local `.env` as needed.

5. Deploy. Note the backend URL (e.g. `https://eazyfoods-api.onrender.com`).

**CORS:** Set `CORS_ORIGINS` to your live frontend URLs, comma-separated (no spaces), e.g.  
`https://eazyfoods-customer.vercel.app,https://eazyfoods-vendor.vercel.app`  
The app accepts this as a single env var and will allow those origins. Do not use `*` in production.

### 3. Frontends on Vercel

For **each** frontend (customer, vendor, chef, admin, delivery, marketing):

1. Go to [vercel.com](https://vercel.com) → Add **New Project** → Import `kidoxdavid/eazyfoods`.
2. **Root Directory:** set to the app folder, e.g. `frontend-customer`.
3. **Framework Preset:** Vite.
4. **Environment Variables** (for this frontend):
   - `VITE_API_BASE_URL` = your backend URL, e.g. `https://eazyfoods-api.onrender.com`
   - If you use Google Maps: `VITE_GOOGLE_MAPS_API_KEY` = your key.
5. Deploy. Repeat for `frontend-vendor`, `frontend-chef`, etc., each with its own project and root directory.

**Important:** Each frontend must be built with `VITE_API_BASE_URL` pointing at your **live** backend URL so the site works in production.

### 4. After first deploy

- Open the customer (or vendor) Vercel URL. If you see 403 or CORS errors, add that exact URL to `CORS_ORIGINS` on Render and redeploy the backend.
- Run any DB migrations you use locally (e.g. SQL or scripts) against the **External** Database URL from Render, or add a migration step to the Render build/start if you prefer.

---

## Option B: Single VPS (e.g. Ubuntu)

You run one server (DigitalOcean, Linode, AWS EC2, etc.) and host backend + frontends + (optionally) PostgreSQL.

1. **Server:** Create Ubuntu 22.04, SSH in.
2. **PostgreSQL:** Install and create DB/user; or use a managed DB and set `DB_*` env vars.
3. **Backend:** Clone repo, `pip install -r requirements.txt`, set `.env`, run:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   Use a process manager (systemd, or gunicorn/uvicorn behind nginx).
4. **Frontends:** In each app folder, set `VITE_API_BASE_URL=https://your-domain.com` (or same server), then:
   ```bash
   npm ci && npm run build
   ```
   Serve the `dist/` folders with nginx (or another web server) and point your domain(s) to them.
5. **Nginx:** Reverse-proxy `/api` to the backend (port 8000), and serve static files for each frontend from their `dist/`.
6. **HTTPS:** Use Let’s Encrypt (e.g. certbot).

---

## Production checklist

- [ ] PostgreSQL created and URL (or DB_* vars) set on backend.
- [ ] `SECRET_KEY` set to a new, random value (not the one from `.env`).
- [ ] `CORS_ORIGINS` set to your live frontend URLs (no `*` in production).
- [ ] Stripe keys: use live keys if you accept real payments; keep test keys for testing.
- [ ] Each frontend built with correct `VITE_API_BASE_URL`.
- [ ] If you use uploads, plan for persistence (e.g. Render disk, or S3) so files survive deploys.

---

## Quick reference: build frontends for production

From repo root, for each app:

```bash
cd frontend-customer
VITE_API_BASE_URL=https://eazyfoods-api.onrender.com npm run build
# Output in dist/
```

Use the same `VITE_API_BASE_URL` value you configured in Vercel (or your hosting) so the built app talks to your live API.
