# Rotating Tunnels Setup (Free Plan Workaround)

## The Problem
ngrok free plan gives the same URL to all tunnels when using `--all`. We need separate URLs for each service.

## The Solution
Run **3 tunnels at a time** and rotate the 4th one as needed.

### Recommended Setup (3 Tunnels Always Running)

**Terminal 1 - Backend (Always Running):**
```bash
ngrok http 8000
```
This is your **BACKEND URL** - needed by all frontends.

**Terminal 2 - Admin Frontend (Always Running):**
```bash
ngrok http 3002
```
This is your **ADMIN URL** - share with admin testers.

**Terminal 3 - Vendor OR Customer (Rotate as Needed):**
```bash
# For Vendor testing:
ngrok http 3000

# OR for Customer testing:
ngrok http 3003
```

---

## Setup Steps

### Step 1: Start Backend Tunnel
```bash
ngrok http 8000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.dev`)

### Step 2: Start Admin Frontend Tunnel
```bash
ngrok http 3002
```
Copy the HTTPS URL (e.g., `https://xyz789.ngrok-free.dev`)

### Step 3: Start Vendor OR Customer Tunnel
Choose one based on what you're testing:

**For Vendor:**
```bash
ngrok http 3000
```

**For Customer:**
```bash
ngrok http 3003
```

---

## Configuration

All frontends use the **SAME backend URL** for API calls:

**In browser console for each portal:**
```javascript
localStorage.setItem('API_BASE_URL', 'YOUR_BACKEND_NGROK_URL/api/v1')
```

Example:
```javascript
localStorage.setItem('API_BASE_URL', 'https://abc123.ngrok-free.dev/api/v1')
```

---

## URLs to Share

- **Admin Panel**: `https://ADMIN_NGROK_URL`
- **Vendor Portal**: `https://VENDOR_NGROK_URL` (when vendor tunnel is running)
- **Customer Portal**: `https://CUSTOMER_NGROK_URL` (when customer tunnel is running)

---

## Quick Switch

When you need to test the other portal:

1. Stop the current frontend tunnel (Ctrl+C)
2. Start the other one:
   ```bash
   # If switching from vendor to customer:
   ngrok http 3003
   
   # If switching from customer to vendor:
   ngrok http 3000
   ```
3. Share the new URL

---

## Alternative: Test Locally

If you're on the same network, you can:
- Share admin via ngrok
- Access vendor/customer via local network IP
- All use the same backend ngrok URL for API

This way you only need 2 ngrok tunnels (backend + admin).

