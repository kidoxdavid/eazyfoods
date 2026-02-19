# Vercel deployment (Driver portal)

If the build fails on Vercel, check the following:

## 1. Root Directory (most common)

This app lives in **`frontend-delivery`**, not the repo root.

- In Vercel: **Project Settings → General → Root Directory**
- Set to: **`frontend-delivery`**
- Leave blank only if this repo contains just the driver app.

## 2. Build & output

- **Build Command:** `npm run build` (or leave default when Framework is Vite)
- **Output Directory:** `dist`
- **Framework Preset:** Vite (so Vercel uses the right defaults)

## 3. Node version

The project asks for **Node 18+** (`engines` in `package.json` and `.nvmrc`).

- In Vercel: **Project Settings → General → Node.js Version**
- Set to **18.x** or **20.x** if your builds use an older Node.

## 4. Environment variables (optional for build)

The app uses these at **runtime** (in the browser). You can add them in Vercel under **Settings → Environment Variables** if you use a backend:

- `VITE_API_BASE_URL` – API base URL
- `VITE_GOOGLE_OAUTH_CLIENT_ID` – Google sign-in (optional)
- `VITE_GOOGLE_MAPS_API_KEY` – Maps (optional)

Build will still succeed if these are missing (they fall back to empty string).

## 5. Check the build log

In the Vercel deployment email or dashboard, open the **build log** and look at the **last error**. Typical causes:

- **"Cannot find module"** → Root Directory is wrong (see step 1).
- **"Unsupported engine"** or Node errors → Set Node to 18+ (see step 3).
- **"Command not found: npm"** or no `package.json` → Root Directory is wrong.
