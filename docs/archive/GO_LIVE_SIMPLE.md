# Get eazyfoods.ca Live (Simple Steps)

You have the domain **eazyfoods.ca** from GoDaddy. You **don’t need** a GoDaddy hosting plan. Use free hosting for the app, then point your domain to it.

---

## What we’re doing in plain English

1. **Put your app on free hosting** (backend on Render, website on Vercel).
2. **Connect your domain** so when people go to **eazyfoods.ca** they see your site.

You’ll create free accounts on Render and Vercel, connect your GitHub repo, and then change a few settings in GoDaddy so eazyfoods.ca points to your new site.

---

## Part 1: Create a free database and backend (Render)

1. Go to **https://render.com** and sign up (e.g. with GitHub).
2. **Create a database**
   - Click **New +** → **PostgreSQL**.
   - Name: `eazyfoods-db`. Pick a region (e.g. Oregon). Click **Create Database**.
   - Wait until it says “Available.” Then open it and copy the **Internal Database URL** (starts with `postgresql://`). Keep it somewhere safe; you’ll paste it in the next step.
3. **Create the backend (API)**
   - Click **New +** → **Web Service**.
   - Connect your GitHub account if needed, then choose the **kidoxdavid/eazyfoods** repo.
   - Use these settings:
     - **Name:** `eazyfoods-api` (or any name).
     - **Region:** same as the database.
     - **Branch:** `main`.
     - **Root Directory:** leave blank.
     - **Runtime:** Python 3.
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Click **Advanced** and add **Environment Variables**. Add these one by one:

     | Key             | Value |
     |-----------------|--------|
     | DATABASE_URL    | (paste the **Internal Database URL** from step 2) |
     | SECRET_KEY      | (make up a long random string, e.g. 32 letters/numbers) |
     | CORS_ORIGINS    | `https://eazyfoods.ca,https://www.eazyfoods.ca` |

     If you use Stripe or Google Maps, add the same keys you have in your `.env` (e.g. `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `GOOGLE_MAPS_API_KEY`).

   - Click **Create Web Service**. Wait until the deploy finishes (green “Live”).
   - Copy your backend URL, e.g. **https://eazyfoods-api.onrender.com** (you’ll need it for Part 2).

---

### Optional: Copy your local PostgreSQL data into Render

If you already have data in PostgreSQL on your computer (products, users, etc.), you can copy it into Render's database so the live site has the same data.

1. **Get your Render External Database URL**  
   In Render, open your PostgreSQL service (eazyfoods-db). Find **External Database URL** (not Internal). Copy it.

2. **Export your local database**  
   In Terminal, run (use your actual DB name if not `easyfoods`):
   ```bash
   pg_dump -h localhost -U postgres -d easyfoods --no-owner --no-acl -f ~/Desktop/eazyfoods_backup.sql
   ```
   Enter your local Postgres password when prompted. This creates `eazyfoods_backup.sql` on your Desktop.

3. **Import into Render**  
   Run (paste your **External** Database URL in place of `YOUR_RENDER_EXTERNAL_URL`):
   ```bash
   psql "YOUR_RENDER_EXTERNAL_URL" -f ~/Desktop/eazyfoods_backup.sql
   ```
   If you get SSL errors, add `?sslmode=require` to the end of the URL inside the quotes. When it finishes, Render has the same data as your local DB.

---

## Part 2: Put your customer website online (Vercel)

1. Go to **https://vercel.com** and sign up (e.g. with GitHub).
2. **Import your project**
   - Click **Add New…** → **Project**.
   - Import the **kidoxdavid/eazyfoods** repo from GitHub.
   - **Root Directory:** click **Edit** and set it to **frontend-customer** (this is the main storefront).
   - **Framework Preset:** Vite (should be detected).
   - Under **Environment Variables**, add:
     - **Name:** `VITE_API_BASE_URL`
     - **Value:** your backend URL from Part 1, e.g. `https://eazyfoods-api.onrender.com`
   - Click **Deploy**. Wait until it’s done.
   - You’ll get a URL like **https://eazyfoods-xxxx.vercel.app**. We’ll connect your domain next.

---

## Part 3: Use your domain eazyfoods.ca (GoDaddy + Vercel)

**Goal:** When someone types **eazyfoods.ca** or **www.eazyfoods.ca**, they see your Vercel site.

1. **Tell Vercel about your domain**
   - In Vercel, open your project (frontend-customer).
   - Go to **Settings** → **Domains**.
   - Add **eazyfoods.ca** and **www.eazyfoods.ca**. Vercel will show you what DNS records to add (something like “A record” and “CNAME record”).
2. **Point your domain in GoDaddy**
   - Log in at **https://www.godaddy.com** → **My Products** → find **eazyfoods.ca** → **DNS** (or **Manage DNS**).
   - You’ll add or edit records as Vercel asked. Usually:
     - **A record:** Type `A`, Name `@`, Value = the IP or host Vercel gives you (e.g. `76.76.21.21`).
     - **CNAME record:** Type `CNAME`, Name `www`, Value = something like `cname.vercel-dns.com` (use exactly what Vercel shows).
   - Save. DNS can take from a few minutes up to 24–48 hours to update; often it’s under an hour.
3. Back in **Vercel → Domains**, Vercel will show a check when eazyfoods.ca is correctly pointed. Once it’s verified, **eazyfoods.ca** and **www.eazyfoods.ca** will open your live site.

---

## Optional: API on a subdomain (api.eazyfoods.ca)

If you want your API at **api.eazyfoods.ca** instead of **eazyfoods-api.onrender.com**:

- In **Render**, open your Web Service → **Settings** → **Custom Domain**, and add **api.eazyfoods.ca**. Render will tell you what CNAME to add in GoDaddy (e.g. point `api` to your Render URL).
- In GoDaddy DNS, add a **CNAME** record: Name **api**, Value = the host Render gives you.
- After DNS updates, set **CORS_ORIGINS** on Render to include `https://eazyfoods.ca` and `https://www.eazyfoods.ca` (you already did that above).

If you skip this, the site still works: the frontend will keep using **https://eazyfoods-api.onrender.com** as the API URL.

---

## Summary

- **No GoDaddy hosting plan needed.** You only use GoDaddy for the domain and DNS.
- **Hosting:** Backend + DB on Render (free tier), customer site on Vercel (free tier).
- **Domain:** eazyfoods.ca and www.eazyfoods.ca point to Vercel via DNS at GoDaddy.

If you want, we can do this one part at a time: first get the backend and site live on Render/Vercel URLs, then add eazyfoods.ca when you’re ready.
