# How to Create 7 Vercel Projects from the Same Repo

You’ll import the **same GitHub repo** (eazyfoods) **7 times**, and each time set a different **Root Directory** so Vercel builds a different app.

---

## One project at a time

Do this **once per app** (Portals, Vendor, Chef, Admin, Delivery, Marketing, and Customer if needed).

### 1. Start a new project

1. Go to **[vercel.com](https://vercel.com)** and sign in.
2. Click **“Add New…”** → **“Project”** (or from the dashboard, **“Add New”** → **“Project”**).
3. Under **Import Git Repository**, find **kidoxdavid/eazyfoods** (or your repo name).
   - If it’s not there, click **“Import”** / **“Connect Git Repository”** and connect GitHub, then select the **eazyfoods** repo.
4. Click **“Import”** next to the eazyfoods repo.

### 2. Set the Root Directory (important)

On the import/config screen:

1. Find **“Root Directory”** (often under **Configure Project** or an **Edit** link).
2. Click **“Edit”** next to it (or the field).
3. **Uncheck** “Set as root directory” if it’s checked, then type or select:
   - `frontend-portals`   for the Portals project  
   - `frontend-vendor`    for the Vendor project  
   - `frontend-chef`      for the Chef project  
   - `frontend-admin`     for the Admin project  
   - `frontend-delivery`  for the Delivery project  
   - `frontend-marketing` for the Marketing project  
   - `frontend-customer`  for the Customer project  
4. Confirm the path (e.g. `frontend-portals`) and leave the rest as default.

### 3. (Optional) Set env vars before first deploy

- **Portals:** You can add the 6 `VITE_PORTAL_*_URL` vars later and redeploy.
- **Customer:** Add `VITE_API_BASE_URL` and `VITE_PORTALS_URL` (see MAKE_ALL_FRONTENDS_LIVE.md).
- **Vendor, Chef, Admin, Delivery, Marketing:** Add `VITE_API_BASE_URL` (your backend URL).

You can also add env vars **after** the first deploy under **Settings → Environment Variables**, then **Redeploy**.

### 4. Deploy

1. Click **“Deploy”**.
2. Wait for the build to finish. Vercel will show a URL like `https://eazyfoods-portals.vercel.app`.
3. Copy that URL; you’ll use it for **VITE_PORTALS_URL** (Customer) and for the 6 portal URLs (Portals project) and for **CORS_ORIGINS** on Render.

### 5. Repeat for the other 6 apps

Do **steps 1–4 again** for each of the other frontends, changing **only** the Root Directory each time:

| When creating this project | Root Directory     |
|----------------------------|--------------------|
| Portals                    | `frontend-portals` |
| Vendor                     | `frontend-vendor`  |
| Chef                       | `frontend-chef`    |
| Admin                      | `frontend-admin`   |
| Delivery                   | `frontend-delivery`|
| Marketing                  | `frontend-marketing` |
| Customer                   | `frontend-customer` |

---

## If you don’t see “Root Directory”

- It may be under **“Configure Project”** or **“Advanced”**.
- Or after you click Import, look for **“Root Directory”** with an **Edit** link; click Edit and enter e.g. `frontend-portals` (no leading slash).
- If the repo is already connected, go to **Dashboard** → your **team** → **“Add New”** → **“Project”** and choose the same repo again; that creates a **new** project. Then on the config screen set the new project’s Root Directory to the next app folder.

---

## Summary

- **One repo, 7 projects:** import eazyfoods **7 times**, each time as a **new** project.
- **Only difference per project:** the **Root Directory** (`frontend-portals`, `frontend-vendor`, etc.).
- After all 7 exist, add env vars (see **MAKE_ALL_FRONTENDS_LIVE.md**) and update **CORS_ORIGINS** on Render.
