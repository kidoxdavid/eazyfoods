# Vendor & Customer Portal Setup for Testing

## Current Status

✅ **Vendor Portal**: Running on port 3000
✅ **Customer Portal**: Running on port 3003
✅ **Backend**: Running on port 8000 (shared with admin)

---

## Setup Steps

### Step 1: Restart Vendor & Customer Frontends

The vite.config.js files have been updated. You need to restart both:

**Terminal 5 - Restart Vendor:**
```bash
# Stop current vendor server (Ctrl+C if running)
cd /Users/davidebubeihezue/Documents/easyfoods/frontend-vendor
npm run dev -- --host
```

**Terminal 6 - Restart Customer:**
```bash
# Stop current customer server (Ctrl+C if running)
cd /Users/davidebubeihezue/Documents/easyfoods/frontend-customer
npm run dev -- --host
```

---

### Step 2: Set Up ngrok Tunnels

Since you already have 2 ngrok tunnels running (admin backend and frontend), you have a few options:

#### Option A: Use Same Backend Tunnel (Recommended)

The backend ngrok tunnel you already have can be shared! You just need:

**Terminal 7 - Vendor Tunnel:**
```bash
ngrok http 3000 --pooling-enabled
```

**Terminal 8 - Customer Tunnel:**
```bash
ngrok http 3003 --pooling-enabled
```

**Note:** With pooling, you might get the same URL. If that's an issue, you can:
- Stop the frontend admin tunnel
- Start vendor tunnel
- Start customer tunnel
- Restart frontend admin tunnel

#### Option B: Use Separate Backend Tunnel (If Needed)

If you want separate backend tunnels for each:

1. Stop current backend ngrok tunnel
2. Start new one: `ngrok http 8000`
3. Use that URL for vendor/customer API configuration

---

### Step 3: Configure Vendor Portal

1. **Open vendor portal:**
   - Local: `http://localhost:3000`
   - Or ngrok URL: `https://YOUR_VENDOR_NGROK_URL`

2. **Open browser console** (F12)

3. **Set API URL:**
   ```javascript
   localStorage.setItem('API_BASE_URL', 'https://gabbroid-quinn-competently.ngrok-free.dev/api/v1')
   ```

4. **Verify:**
   ```javascript
   localStorage.getItem('API_BASE_URL')
   ```

5. **Refresh the page**

---

### Step 4: Configure Customer Portal

1. **Open customer portal:**
   - Local: `http://localhost:3003`
   - Or ngrok URL: `https://YOUR_CUSTOMER_NGROK_URL`

2. **Open browser console** (F12)

3. **Set API URL:**
   ```javascript
   localStorage.setItem('API_BASE_URL', 'https://gabbroid-quinn-competently.ngrok-free.dev/api/v1')
   ```

4. **Verify:**
   ```javascript
   localStorage.getItem('API_BASE_URL')
   ```

5. **Refresh the page**

---

## Share URLs

Once configured, share these URLs:

- **Admin Panel**: `https://gabbroid-quinn-competently.ngrok-free.dev`
- **Vendor Portal**: `https://YOUR_VENDOR_NGROK_URL`
- **Customer Portal**: `https://YOUR_CUSTOMER_NGROK_URL`

---

## Quick Checklist

- [ ] Vendor frontend restarted with `--host` flag
- [ ] Customer frontend restarted with `--host` flag
- [ ] Vendor ngrok tunnel running
- [ ] Customer ngrok tunnel running
- [ ] Vendor API_BASE_URL configured in localStorage
- [ ] Customer API_BASE_URL configured in localStorage
- [ ] Both portals tested and working
- [ ] URLs shared with testers

---

## Important Notes

1. **Same Backend**: All three portals (admin, vendor, customer) use the same backend API
2. **Same API URL**: They can all use the same backend ngrok URL: `https://gabbroid-quinn-competently.ngrok-free.dev/api/v1`
3. **Keep Running**: Keep all terminals open while testing
4. **ngrok Free Plan**: Testers may see warning pages - they need to click "Visit Site"

---

## Test Accounts

You'll need test accounts for vendor and customer portals. Check your database or create test users if needed.

