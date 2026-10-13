# Migrate your local DB to Render

Goal: get your **local PostgreSQL** (schema + data) onto **Render PostgreSQL** so the live API uses your real data.

---

## Option 1: Backup → URL → Restore on Render (recommended)

No direct connection from your machine to Render. You upload a dump to a URL; the backend on Render downloads it and restores into Render’s DB.

### Step 1: Dump your local DB (on your Mac)

```bash
cd /Users/davidebubeihezue/Documents/easyfoods

# Use your local .env DB_* (localhost)
pg_dump -h localhost -U postgres -d easyfoods --no-owner --no-acl -f backup_for_render.sql
```

If `pg_dump` asks for a password, use the one in `.env` (`DB_PASSWORD`).

### Step 2: Put the backup behind a public URL

- Create a **GitHub Gist**: https://gist.github.com  
- Add a file, e.g. `backup_for_render.sql`, and paste (or drag) the contents of `backup_for_render.sql`.  
- Save, then open the file and click **Raw**.  
- Copy the **raw URL** (e.g. `https://gist.githubusercontent.com/.../raw/.../backup_for_render.sql`).

### Step 3: Enable restore on the backend (Render)

1. **Buildpack** (so `psql` is available at runtime)  
   - Render Dashboard → your **backend** service → **Settings** → **Build & Deploy**  
   - **No buildpack needed** — restore uses Python/psycopg2 only. Skip any Buildpacks section.  
   - In the repo root, ensure you have an **Aptfile** containing one line: `postgresql-client`  
   - If the file doesn’t exist, create it and commit/push.

2. **Environment variables** (on the same backend service)  
   - `RESTORE_BACKUP_URL` = the raw URL from Step 2 (your Gist raw URL for backup2.sql)  
   - `RESTORE_SECRET` = a one-time secret (e.g. `restore-2025-xyz`)  
   - Save and **redeploy** the backend.

### Step 4: Run the restore (once)

From your Mac (or anywhere):

```bash
curl -X POST "https://eazyfoods-api.onrender.com/api/v1/admin/restore-from-url" \
  -H "X-Restore-Secret: YOUR_RESTORE_SECRET"
```

Use the same value as `RESTORE_SECRET`. On success you’ll get something like `{"status":"ok", ...}`.

### Step 5: Clean up

- Remove `RESTORE_BACKUP_URL` and `RESTORE_SECRET` from the backend env on Render (and optionally redeploy).

---

## Option 2: Copy from local to Render (direct connection)

Runs on your Mac. Connects to both local DB and Render’s DB and copies data. Fails if your network can’t reach Render Postgres (e.g. SSL or firewall).

1. In `.env` you already have:  
   `REMOTE_DB_HOST`, `REMOTE_DB_USER`, `REMOTE_DB_PASSWORD`, `REMOTE_DB_NAME`

2. From project root:

```bash
python copy_local_db_to_render.py
```

- Creates all tables on Render from the app’s models, then copies rows table by table from local to Render.  
- If you see “SSL connection closed” or connection errors, use **Option 1** instead.

---

## Render Shell

The **Render Shell** is on Render’s servers. It can run commands that use `DATABASE_URL` (Render’s DB), but it **cannot** see your local PostgreSQL. So:

- You **cannot** run “copy local → Render” from the Render Shell.
- You **can** run things that only touch Render’s DB, e.g.  
  `python run_google_oauth_migration.py`  
  (adds columns; useful when you re-enable Google sign-in later).

For the actual migration of your local DB to Render, use **Option 1** (backup URL + restore) or **Option 2** (run `copy_local_db_to_render.py` on your Mac).

---

## After restore: vendor login and products

Products are filtered by the logged-in vendor’s ID. To see products from the restored backup:

1. **Use the same vendor account** as in your local DB — the same email and password.
2. Do **not** log in with a new vendor account created after deploy; it has a different ID and won’t see the restored products.

Set these on the Render backend for production:

- `API_PUBLIC_URL` = `https://eazyfoods-api.onrender.com` — so image uploads return absolute URLs that load correctly on the frontend.
- `CORS_ORIGINS` = `https://eazyfoods.vercel.app,https://vendor.eazyfoods.vercel.app,...` (comma-separated frontend origins).
