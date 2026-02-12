# Admin & Marketing login (not for customers)

Admin and Marketing portals are **login only**. There is no public signup.

## How it works

- **Admin portal** and **Marketing portal** use the same backend auth: email + password → `POST /api/v1/admin/auth/login-json`.
- **Signup is disabled by default.** The backend rejects `POST /admin/auth/signup` unless you explicitly enable it.
- Marketing login page shows “Need access? Contact your administrator.” (no Sign up link). The `/signup` page shows “Access is by invitation only.”

## Creating the first admin (or new admin/marketing users)

**Option A – Enable signup temporarily (e.g. first admin)**  
1. On Render (backend), set env: `ADMIN_SIGNUP_ENABLED=true`.  
2. Redeploy.  
3. Open the Marketing portal Signup page (or call `POST /api/v1/admin/auth/signup` with JSON body: email, password, first_name, last_name, role).  
4. Create your admin account.  
5. Set `ADMIN_SIGNUP_ENABLED=false` again and redeploy.

**Option B – Create users from Admin portal**  
Once you have one admin, use the Admin portal (e.g. Admin Users) to create additional admin/marketing users. That does not require public signup.

**Option C – Database / script**  
Create a row in the `admin_users` table (with a bcrypt-hashed password) or run a one-off script that calls the signup endpoint internally.

## Summary

| Portal     | Login                    | Signup              |
|-----------|---------------------------|---------------------|
| Admin     | Email + password          | None (login only)   |
| Marketing | Email + password (same)   | Disabled; invite only |
