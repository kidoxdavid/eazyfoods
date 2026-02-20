# Running SQL on Render

**Do not paste SQL into the API/backend service shell.** That shell is **bash** (Linux); it does not run SQL and will show errors like `bash: syntax error` or `ALTER: command not found`.

## Option 1: Run from the API shell (recommended)

From the **Render Dashboard** open your **API/Backend** service → **Shell** tab. Then run (project root is usually `~/project/src` or the current directory):

```bash
cd ~/project/src 2>/dev/null || cd /opt/render/project/src 2>/dev/null || true
python3 run_chef_bank_migration.py
```

If you're already in the project root, you can run only:

```bash
python3 run_chef_bank_migration.py
```

This script uses your app's `DATABASE_URL` and adds the chef bank columns. Safe to run multiple times.

---

## Option 2: Run SQL in the Postgres service

1. In **Render Dashboard**, open your **PostgreSQL** service (the database), not the API/web service.
2. Go to the **Connect** or **Info** tab and copy your connection details:
   - **Internal Database URL** (use this from another Render service), or
   - **External Database URL** (use this from your machine or a client).
3. Run the SQL using one of these methods:

### Option A: Render Postgres “Shell” (if available)

If your Postgres service has a **Shell** tab that opens a `psql` session, use it and paste:

```sql
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);
```

### Option B: From your machine with `psql`

If you have PostgreSQL client tools installed locally:

```bash
psql "YOUR_EXTERNAL_DATABASE_URL" -c "ALTER TABLE chefs ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200), ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50), ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(50), ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);"
```

(Replace `YOUR_EXTERNAL_DATABASE_URL` with the value from Render’s Postgres **External Database URL**.)

### Option C: GUI client (TablePlus, DBeaver, pgAdmin, etc.)

Connect using the **External Database URL** from Render, then open a SQL window and run the `ALTER TABLE` statement above.

---

After the migration, redeploy or restart your API service so it uses the updated schema.

---

## CORS and 500 errors (eazyfoods.ca → eazyfoods-api.onrender.com)

If the browser shows **CORS** errors or **500 Internal Server Error** when the frontend at `https://eazyfoods.ca` calls the API:

1. **500 on `/customer/promotions` or `/customer/chefs`**  
   Often caused by the **chefs** table missing the new bank columns. The API code expects those columns; run the migration above on your Render **Postgres** database. After that, redeploy the API.

2. **CORS "No 'Access-Control-Allow-Origin' header"**  
   - In Render, open your **API service** → **Environment** and set:
     - `CORS_ORIGINS` = `https://eazyfoods.ca,https://www.eazyfoods.ca`
     - (Add other frontend URLs if you use them, e.g. `https://vendor.eazyfoods.ca`, `https://admin.eazyfoods.ca`.)
   - If you leave `CORS_ORIGINS` unset, the app defaults to `*` (all origins). If you set it, list every origin that will call the API.
   - Save and redeploy the API so the new env is applied.
