# Step-by-Step Guide: Share Your Website for Testing

## Prerequisites Check

✅ Make sure you have:
- Backend server running on port 8000
- Frontend server running on port 3002
- ngrok installed and authenticated

---

## Step 1: Start Your Servers

**Terminal 1 - Backend:**
```bash
cd /Users/davidebubeihezue/Documents/easyfoods
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd /Users/davidebubeihezue/Documents/easyfoods/frontend-admin
npm run dev -- --host
```

Keep both terminals running!

---

## Step 2: Stop Any Existing ngrok Tunnels

If you have ngrok running from before, stop it (Ctrl+C in that terminal).

---

## Step 3: Start Backend Tunnel First

**Terminal 3 - Backend Tunnel:**
```bash
ngrok http 8000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok-free.dev -> http://localhost:8000
```

**📋 Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.dev`)

Keep this terminal open!

---

## Step 4: Start Frontend Tunnel with Pooling

**Terminal 4 - Frontend Tunnel:**
```bash
ngrok http 3002 --pooling-enabled
```

You'll see output like:
```
Forwarding   https://xyz789.ngrok-free.dev -> http://localhost:3002
```

**📋 Copy the HTTPS URL** (e.g., `https://xyz789.ngrok-free.dev`)

Keep this terminal open!

---

## Step 5: Update Frontend to Use Backend ngrok URL

1. **Open your admin panel in browser:**
   - Go to: `http://localhost:3002`

2. **Open browser console:**
   - Press `F12` or `Cmd+Option+I` (Mac)

3. **Run this command** (replace with your actual backend ngrok URL):
   ```javascript
   localStorage.setItem('API_BASE_URL', 'https://abc123.ngrok-free.dev/api/v1')
   ```
   (Use the backend URL from Step 3!)

4. **Refresh the page** (F5 or Cmd+R)

5. **Test it:** Try logging in or navigating - it should work!

---

## Step 6: Update CORS (Optional but Recommended)

Edit `app/core/config.py` and add your frontend ngrok URL:

```python
CORS_ORIGINS = [
    "http://localhost:3002",
    "https://xyz789.ngrok-free.dev",  # Add this line (your frontend ngrok URL)
    # ... rest of origins
]
```

Then **restart your backend server** (Terminal 1 - Ctrl+C, then run uvicorn again).

---

## Step 7: Share with Your Tester

Share the **frontend ngrok URL** from Step 4:
- `https://xyz789.ngrok-free.dev`

They can open this in their browser and test your website!

---

## Important Notes:

⚠️ **Keep all 4 terminals open** while testing:
- Terminal 1: Backend server
- Terminal 2: Frontend server  
- Terminal 3: Backend ngrok tunnel
- Terminal 4: Frontend ngrok tunnel

⚠️ **ngrok free URLs change** each time you restart (unless you have a paid plan)

⚠️ **If something doesn't work:**
- Check that all 4 terminals are still running
- Verify the API URL in browser console: `localStorage.getItem('API_BASE_URL')`
- Check browser console for errors (F12)

---

## Quick Troubleshooting:

**"Cannot connect" errors:**
- Make sure all servers and tunnels are running
- Check the API_BASE_URL in localStorage matches your backend ngrok URL

**CORS errors:**
- Add the frontend ngrok URL to CORS_ORIGINS in config.py
- Restart backend server

**Tunnel not working:**
- Make sure ngrok is authenticated: `ngrok config check`
- Check ngrok dashboard: http://localhost:4040

