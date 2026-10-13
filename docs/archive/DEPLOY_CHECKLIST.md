# Deploy checklist – get latest changes live

All requested changes are **already in your repo and committed**. If you don’t see them on the live site, do these two things.

---

## 1. Push to GitHub (from your machine)

From this project folder, in a terminal:

```bash
cd /Users/davidebubeihezue/Documents/easyfoods
git push origin main
```

If it asks for a password, use a **Personal Access Token** (not your GitHub password), or switch to SSH:

```bash
git remote set-url origin git@github.com:YOUR_USERNAME/easyfoods.git
git push origin main
```

---

## 2. Redeploy your frontends

Pushing only updates GitHub. Your **hosting** (Render, Vercel, Netlify, etc.) must **build and deploy** from the latest commit.

- **Customer site (e.g. eazyfoods.ca)**  
  - In the dashboard for that project, trigger **Redeploy** or **Deploy latest commit** (or push to the branch that auto-deploys).  
  - Ensure the build uses the **main** branch (or the branch you pushed to).

- **Admin site**  
  - Same idea: open the admin frontend project and **Redeploy** / deploy latest from **main**.

After each deploy finishes, do a **hard refresh** in the browser (Ctrl+Shift+R or Cmd+Shift+R) so you don’t see old cached JS/CSS.

---

## What’s in the last commits (so you can confirm after deploy)

- **Top Chef Deals** link (right-aligned next to “Top Market Deals”) on the **customer home page** between the top banner and the carousel.
- **Driver earnings (%)** in **Admin → Settings → Orders** (scroll down to “Driver earnings (% of delivery fee)”).
- **Distance-based delivery** in **Admin → Settings → Orders**: “Use distance-based delivery cost” and “Delivery fee per km ($)”.
- **Store icon** fix on the customer site (no more “Store is not defined”).
- **Store details** page: “Back to stores” link and “Store details & products” heading.
- **Chef deals in carousel**, **chef contact hidden**, **chef cards city only**, **profile dropdown closes on outside click**, **email verification**, **reviews badge** behavior, etc.

All of the above are in commits on **main**; they will appear on the live site only after you **push** and then **redeploy** the customer and admin apps.
