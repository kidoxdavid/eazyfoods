# Starting ngrok Tunnels One by One

## Important: Start Them Separately!

ngrok free plan can give different URLs if you start them **one at a time** in separate terminals, not all at once.

---

## Step-by-Step Process

### Step 1: Stop Everything First
```bash
pkill -f ngrok
```

### Step 2: Start Backend Tunnel (Terminal 1)
```bash
ngrok http 8000
```
**Wait** until you see the URL (e.g., `https://abc123.ngrok-free.dev`)
**Copy this URL** - this is your BACKEND URL

### Step 3: Start Admin Frontend (Terminal 2 - NEW TERMINAL)
```bash
ngrok http 3002
```
**Wait** until you see the URL (should be different from Terminal 1)
**Copy this URL** - this is your ADMIN URL

### Step 4: Start Vendor Frontend (Terminal 3 - NEW TERMINAL)
```bash
ngrok http 3000
```
**Wait** until you see the URL (should be different)
**Copy this URL** - this is your VENDOR URL

### Step 5: Try Customer Frontend (Terminal 4 - NEW TERMINAL)
```bash
ngrok http 3003
```

**If you get an error about 3 tunnels limit:**
- You've hit the free plan limit
- Keep the first 3 running
- Stop one and start customer when needed

---

## Expected Result

You should get **3 different URLs**:
- Backend: `https://abc123.ngrok-free.dev`
- Admin: `https://xyz789.ngrok-free.dev`
- Vendor: `https://def456.ngrok-free.dev`

---

## Configuration

All frontends use the **BACKEND URL** for API calls:

**In each portal's browser console:**
```javascript
localStorage.setItem('API_BASE_URL', 'YOUR_BACKEND_URL/api/v1')
```

---

## Quick Test

After starting, check all URLs:
```bash
curl http://localhost:4040/api/tunnels | python3 -m json.tool
```

Each tunnel should have a different `public_url`.

