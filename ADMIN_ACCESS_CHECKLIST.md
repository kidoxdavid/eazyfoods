# Admin access checklist

If you can't get into the admin portal, check these in order.

## 1. Admin frontend must call the Render backend

The admin app (on Vercel) must send login requests to your backend, not to itself.

- In **Vercel**, open the **admin** project (the one that hosts the admin portal).
- Go to **Settings** → **Environment Variables**.
- Add **`VITE_API_BASE_URL`** = **`https://eazyfoods-api.onrender.com/api/v1`** (Production and Preview).
- **Redeploy** the admin app so the new env is used.

Without this, the login form posts to the wrong URL and you get errors or "Cannot connect to server".

## 2. You need an admin user

Admin login is **email + password**. There is no public signup unless you turn it on.

**Create the first admin user:**

1. On **Render**, open your **backend** service (eazyfoods-api) → **Environment**.
2. Add **`ADMIN_SIGNUP_ENABLED`** = **`true`**. Save and **redeploy**.
3. Create a user (use one of these):

   **Option A – Marketing Signup page**  
   Open your **Marketing** portal URL, go to `/signup`, and create an account (that user can log in to both Marketing and Admin if the role allows).

   **Option B – API call**  
   ```bash
   curl -X POST "https://eazyfoods-api.onrender.com/api/v1/admin/auth/signup" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@eazyfoods.com","password":"YourSecurePassword","first_name":"Admin","last_name":"User","role":"admin"}'
   ```

4. Set **`ADMIN_SIGNUP_ENABLED`** back to **`false`** on Render and redeploy.

## 3. Use the correct URL and credentials

- Open the **admin** app URL (your Vercel admin deployment), e.g. `https://your-admin-app.vercel.app`.
- Log in with the **email and password** of the admin user you created (e.g. `admin@eazyfoods.com`).

## 4. What you see when it works

- After login you are taken to the admin dashboard (vendors, orders, etc.).
- If you see "Incorrect email or password", the user exists but the password is wrong, or the user doesn’t exist (create it with step 2).
- If you see "Cannot connect to server" or a network error, the admin app is not calling Render (fix step 1).
