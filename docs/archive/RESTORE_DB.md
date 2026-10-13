# DB setup on Render (no extra tools)

Two options:

- **Option A – Build empty DB (schema only)**  
  Creates all tables from the app’s models. No backup, no buildpack. Then add data via the app.

- **Option B – Full restore from backup**  
  Restores your local `backup2.sql` (schema + data) using the backend on Render.

---

## Option A: Build the DB (schema only, then add new data)

1. **Set one env on the backend**  
   - **Environment**: add `INIT_DB_SECRET` = any secret string (e.g. `my-init-2025`).

2. **Deploy** the backend (no buildpack needed).

3. **Call once:**
   ```bash
   curl -X POST "https://YOUR-BACKEND-URL/api/v1/admin/init-db" \
     -H "X-Init-DB-Secret: my-init-2025"
   ```
   You’ll get a list of tables created. The DB is now like your local one (structure only, empty).

4. **Remove** `INIT_DB_SECRET` from env (optional, for safety).

5. Add data through the app (sign up, create products, etc.) or use Option B later to load a backup.

---

## Option B: Full restore from backup (schema + data)

1. **Add buildpack on Render**

- **Dashboard** → your **backend** service → **Settings** → **Build & Deploy**
   - **Build packs**: add `https://github.com/heroku/heroku-buildpack-apt` (so `psql` is installed from the repo `Aptfile`)

2. **Put the backup behind a URL**

- Create a **GitHub Gist** (or any public URL that returns the raw SQL)
   - Upload `backup2.sql` and get the **raw** URL (e.g. `https://gist.githubusercontent.com/.../.../raw/.../backup2.sql`)

3. **Set env on the backend service**

- **Environment**: add
  - `RESTORE_BACKUP_URL` = that raw URL
  - `RESTORE_SECRET` = a one-time secret (e.g. a long random string)
- Save and **redeploy** the backend

4. **Run the restore once**
   ```bash
   curl -X POST "https://YOUR-BACKEND-URL/api/v1/admin/restore-from-url" \
     -H "X-Restore-Secret: <same value as RESTORE_SECRET>"
   ```
   On success you’ll get `{"status":"ok", ...}`.

5. **Clean up**

   - Remove `RESTORE_BACKUP_URL` and `RESTORE_SECRET` from the backend env.

No TablePlus, pgAdmin, or other tools needed; only the backend on Render (and for Option B, a public URL for the backup).
