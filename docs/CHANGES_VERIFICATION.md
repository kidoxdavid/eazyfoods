# Verification: Requested Changes (Commit & Push)

All of the following are **implemented in the codebase** and included in the commits:
- `f9db9d9` – Driver earnings configurable; reviews badge clear on visit; chef deals in carousel; email verification; grocery detail layout; Top Chef Deals link  
- `0a2d350` – Add SMTP setup documentation  

---

## 1. Driver earnings 80% changeable
- **Backend:** `app/api/v1/endpoints/driver_portal.py` – reads `driver_earnings_percent` from platform settings (default 80).  
- **Backend:** `app/api/v1/endpoints/admin_settings.py` – default `driver_earnings_percent: 80` under orders.  
- **Admin UI:** `frontend-admin/src/pages/Settings.jsx` – Order settings: "Driver earnings (% of delivery fee)" number input (default 80).  
- **Where to change:** Admin portal → Settings → Order settings.

---

## 2. Reviews notification badge – disappears when user opens review section
- **Vendor:** `frontend-vendor/src/hooks/useNotifications.js` – when `pathname === '/reviews'`, returned `notifications.reviews` is 0.  
- **Vendor:** `frontend-vendor/src/pages/Reviews.jsx` – on mount calls `PUT /reviews/mark-read` and dispatches `refresh-notifications`.  
- **Driver:** `frontend-delivery/src/hooks/useNotifications.js` – when `pathname === '/ratings'`, returned `notifications.unreadRatings` is 0.  
- **Chef:** Chef portal has a "Reviews" nav item but **no notification badge** on it (only Orders has a badge). So there is no badge to clear on chef; behaviour is only for vendor and driver.

---

## 3. Chef cards – only city (no province)
- **Home:** `frontend-customer/src/pages/Home.jsx` – chef card shows `chef.city` only.  
- **Chefs list:** `frontend-customer/src/pages/Chefs.jsx` – location is `chef.city || '—'`.  
- **Chef detail:** `frontend-customer/src/pages/ChefDetail.jsx` – banner location is `chef.city`.

---

## 4. Profile dropdown – closes when clicking outside
- **Customer:** `frontend-customer/src/components/Layout.jsx` – `profileDropdownRef`, `profileButtonRef`, and `mousedown` listener; if click is outside both, `setProfileDropdownOpen(false)`.

---

## 5. Chef contact details hidden on customer side
- **Customer:** `frontend-customer/src/pages/ChefDetail.jsx` – contact block (address, phone, website) removed; only "Message / Request custom order" link to `/contact` is shown.

---

## 6. Store details pages – updates
- **Status:** No specific "store details" changes were requested; no store-detail updates were made in these commits.  
- **Current:** `frontend-customer/src/pages/StoreDetail.jsx` is unchanged. If you want specific updates (e.g. layout, fields, copy), say what to change.

---

## 7. Grocery (product) details page – images and layout
- **Customer:** `frontend-customer/src/pages/ProductDetail.jsx`:  
  - Image column: `lg:col-span-5`, wrapper `max-w-sm mx-auto lg:max-w-[340px]`.  
  - Info column: `lg:col-span-7`.  
- **Note:** If images still don’t show on desktop, the cause may be CORS or image URL resolution (e.g. `resolveImageUrl` / API base URL). The layout and size limits are in place.

---

## 8. Email verification on signup & forgot password
- **Verification email:** `app/core/email.py` – `send_verification_email()`.  
- **Signup:** `app/api/v1/endpoints/customer_auth.py` – after creating customer, calls `send_verification_email(customer.email, token, "customer")`.  
- **Verify link:** `GET /customer/auth/verify-email?token=...` marks email verified.  
- **Frontend:** `frontend-customer/src/pages/VerifyEmail.jsx` – calls that API and shows success/error.  
- **Forgot password:** Already implemented – `POST /customer/auth/forgot-password` sends reset email; `POST /customer/auth/reset-password` with token from link resets password.  
- **Links:** Set `CUSTOMER_RESET_PASSWORD_BASE_URL` in backend env so reset and verification links point to your customer app.

---

## 9. Chef promo items in home carousel
- **Home:** `frontend-customer/src/pages/Home.jsx`:  
  - State `chefDeals`, fetch `GET /customer/chef-cuisines-deals`.  
  - Carousel input: market products with promotions **plus** chef deal items (`type: 'chef_promo'`, link to chef page).  
  - Carousel renders chef deal cards (image, name, chef name, price, badge) and product cards.

---

## 10. Top Chef Deals link (right of Top Market Deals)
- **Home:** `frontend-customer/src/pages/Home.jsx` – between top banner and carousel, same row as "Top Market Deals": right-aligned "Top Chef Deals" link to `/top-chef-deals` (with UtensilsCrossed icon).

---

## Git status
- **Local:** Last commits are `0a2d350` and `f9db9d9`.  
- **Remote:** If `git status` shows "Your branch is up to date with 'origin/main'", then these commits are pushed. If it shows "Your branch is ahead of 'origin/main'", run `git push` from your machine.  
- **Seeing changes:** Rebuild and redeploy each app (customer, admin, vendor, driver). In the browser, do a hard refresh (e.g. Ctrl+Shift+R / Cmd+Shift+R) or clear cache so you don’t see old JS/CSS.
