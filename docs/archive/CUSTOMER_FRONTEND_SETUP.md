# Customer Frontend Setup for Testing

## Quick Setup Steps

### Step 1: Make Sure Customer Frontend is Running

**Check if it's running:**
```bash
lsof -Pi :3003 -sTCP:LISTEN
```

**If NOT running, start it:**
```bash
cd /Users/davidebubeihezue/Documents/easyfoods/frontend-customer
npm run dev -- --host
```

---

### Step 2: Get Your Backend ngrok URL

Your backend ngrok tunnel should be running. Get the URL:
- Check: `http://localhost:4040` (ngrok web interface)
- Or look at the terminal running `ngrok http 8000`

Backend URL example: `https://gabbroid-quinn-competently.ngrok-free.dev`

---

### Step 3: Choose Access Method

#### Option A: Local Network (Same WiFi) - Easiest

**Your local IP:** `192.168.4.21`

1. **Share this URL with tester:**
   ```
   http://192.168.4.21:3003
   ```

2. **Configure API URL in browser console:**
   - Open: `http://192.168.4.21:3003` (or `http://localhost:3003`)
   - Press F12 (open console)
   - Run:
     ```javascript
     localStorage.setItem('API_BASE_URL', 'https://gabbroid-quinn-competently.ngrok-free.dev/api/v1')
     ```
   - Refresh page

3. **Make sure backend CORS is updated** (already done - includes your IP)

#### Option B: ngrok Tunnel (Works from Anywhere)

**If you want to use ngrok for customer frontend:**

1. **Stop one existing ngrok tunnel** (if you have 3 running)

2. **Start customer ngrok tunnel:**
   ```bash
   ngrok http 3003
   ```

3. **Copy the HTTPS URL** it gives you

4. **Share that URL** with tester

5. **Configure API URL:**
   - Open the customer ngrok URL
   - Console: `localStorage.setItem('API_BASE_URL', 'BACKEND_NGROK_URL/api/v1')`
   - Refresh

---

## Configuration Checklist

- [ ] Customer frontend running on port 3003
- [ ] Backend ngrok tunnel running (port 8000)
- [ ] API_BASE_URL set in customer portal localStorage
- [ ] CORS updated in backend (includes local IP if using local network)
- [ ] Backend server restarted (to apply CORS changes)
- [ ] Tested - customer portal loads and can make API calls

---

## Test It

1. **Open customer portal** (local or ngrok URL)
2. **Check browser console** (F12) for errors
3. **Try to:**
   - Browse products
   - View stores
   - Add to cart
   - Login/signup

If these work, it's set up correctly!

---

## Quick Commands

**Get backend ngrok URL:**
```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data=json.load(sys.stdin); tunnels=[t for t in data.get('tunnels', []) if '8000' in str(t.get('config', {}).get('addr', ''))]; print(tunnels[0]['public_url'] if tunnels else 'Not found')"
```

**Check customer frontend:**
```bash
curl http://localhost:3003
```

