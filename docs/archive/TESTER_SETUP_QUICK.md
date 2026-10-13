# Quick Tester Setup Guide

## Current Status Check

First, let's verify what's running:

1. **Backend Server** (Terminal 1): Should show `uvicorn` running on port 8000
2. **Frontend Server** (Terminal 2): Should show Vite running on port 3002
3. **ngrok Tunnels**: Check if any are running

---

## Step-by-Step Setup

### Step 1: Stop All Existing ngrok Tunnels

If you have any ngrok tunnels running, stop them (Ctrl+C in those terminals).

### Step 2: Start Backend Tunnel

**Open a NEW terminal (Terminal 3) and run:**
```bash
ngrok http 8000
```

**📋 Copy the HTTPS URL** it shows (e.g., `https://abc123.ngrok-free.dev`)

This is your **BACKEND URL** - you'll need it in Step 4!

### Step 3: Start Frontend Tunnel

**Open ANOTHER NEW terminal (Terminal 4) and run:**
```bash
ngrok http 3002 --pooling-enabled
```

**📋 Copy the HTTPS URL** it shows (e.g., `https://xyz789.ngrok-free.dev`)

This is your **FRONTEND URL** - share this with your tester!

### Step 4: Configure Frontend to Use Backend

1. **Open your admin panel in browser:**
   - Go to: `http://localhost:3002`

2. **Open browser console:**
   - Press `F12` or `Cmd+Option+I` (Mac)

3. **Set the backend API URL:**
   ```javascript
   localStorage.setItem('API_BASE_URL', 'YOUR_BACKEND_NGROK_URL/api/v1')
   ```
   Replace `YOUR_BACKEND_NGROK_URL` with the URL from Step 2.
   
   Example:
   ```javascript
   localStorage.setItem('API_BASE_URL', 'https://abc123.ngrok-free.dev/api/v1')
   ```

4. **Verify it worked:**
   ```javascript
   localStorage.getItem('API_BASE_URL')
   ```
   Should show your backend URL.

5. **Refresh the page** (F5 or Cmd+R)

### Step 5: Test It

- Try logging in (if not already logged in)
- Navigate to different pages (Dashboard, Vendors, Customers, etc.)
- If data loads, it's working! ✅

### Step 6: Share with Tester

Share the **FRONTEND URL** from Step 3:
- `https://xyz789.ngrok-free.dev`

They can open this in their browser and test your website!

---

## Troubleshooting

**"Cannot connect" errors:**
- Make sure all 4 terminals are still running
- Check the API_BASE_URL in localStorage matches your backend ngrok URL
- Verify backend tunnel is still online

**CORS errors:**
- Add the frontend ngrok URL to `app/core/config.py` CORS_ORIGINS
- Restart backend server

**ngrok warning page:**
- On the free plan, testers may see a warning page first
- They need to click "Visit Site" to continue

---

## Quick Checklist

- [ ] Backend server running (Terminal 1)
- [ ] Frontend server running (Terminal 2)
- [ ] Backend ngrok tunnel running (Terminal 3)
- [ ] Frontend ngrok tunnel running (Terminal 4)
- [ ] API_BASE_URL set in browser localStorage
- [ ] Tested locally - data loads correctly
- [ ] Shared frontend URL with tester

---

## Keep These Running!

⚠️ **Important:** Keep all 4 terminals open while testing:
- Terminal 1: Backend server
- Terminal 2: Frontend server
- Terminal 3: Backend ngrok tunnel
- Terminal 4: Frontend ngrok tunnel

Closing any of them will stop that service!

