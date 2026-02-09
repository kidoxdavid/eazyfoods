# Customer Frontend Setup - Simple Steps

## Current Status
✅ Customer frontend is running on port 3003
❌ Backend ngrok tunnel needs to be started

---

## Step 1: Start Backend ngrok Tunnel

**Open a terminal and run:**
```bash
ngrok http 8000
```

**Copy the HTTPS URL** it shows (e.g., `https://abc123.ngrok-free.dev`)

This is your **BACKEND URL** - you'll need it in Step 3.

---

## Step 2: Choose How to Access Customer Portal

### Option A: Local Network (If Tester is on Same WiFi)

**Share this URL:**
```
http://192.168.4.21:3003
```

**Pros:** 
- No ngrok tunnel needed for customer frontend
- Faster connection
- No ngrok warning pages

**Cons:**
- Tester must be on same WiFi network

### Option B: ngrok Tunnel (If Tester is Remote)

**Start customer ngrok tunnel:**
```bash
ngrok http 3003
```

**Share the HTTPS URL** it gives you.

**Pros:**
- Works from anywhere
- No network restrictions

**Cons:**
- Uses one of your 3 tunnel slots
- May see ngrok warning page

---

## Step 3: Configure Customer Portal

1. **Open customer portal:**
   - Local: `http://localhost:3003`
   - Or local network: `http://192.168.4.21:3003`
   - Or ngrok URL: `https://YOUR_CUSTOMER_NGROK_URL`

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Set the API URL:**
   ```javascript
   localStorage.setItem('API_BASE_URL', 'YOUR_BACKEND_NGROK_URL/api/v1')
   ```
   
   Replace `YOUR_BACKEND_NGROK_URL` with the URL from Step 1.
   
   Example:
   ```javascript
   localStorage.setItem('API_BASE_URL', 'https://gabbroid-quinn-competently.ngrok-free.dev/api/v1')
   ```

4. **Verify it worked:**
   ```javascript
   localStorage.getItem('API_BASE_URL')
   ```
   Should show your backend URL.

5. **Refresh the page** (F5 or Cmd+R)

---

## Step 4: Test It

- Try browsing products
- Try viewing stores
- Try adding items to cart
- Check browser console (F12) for any errors

If everything loads, it's working! ✅

---

## Quick Checklist

- [ ] Backend ngrok tunnel running (`ngrok http 8000`)
- [ ] Customer frontend running (port 3003) ✅
- [ ] API_BASE_URL set in localStorage
- [ ] Backend CORS updated (includes local IP if using local network)
- [ ] Backend server restarted (to apply CORS)
- [ ] Tested - customer portal works

---

## URLs Summary

- **Customer Portal**: `http://192.168.4.21:3003` (local) OR ngrok URL
- **Backend API**: `https://YOUR_BACKEND_NGROK_URL/api/v1` (set in localStorage)

