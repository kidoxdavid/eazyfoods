# Quick Guide: Share Your Website for Testing

## 🚀 Fastest Method: ngrok (Recommended)

### Step 1: Install ngrok
```bash
brew install ngrok
# OR download from: https://ngrok.com/download
```

### Step 2: Start Your Servers

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

### Step 3: Create ngrok Tunnels

**Terminal 3 - Backend Tunnel:**
```bash
ngrok http 8000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Terminal 4 - Frontend Tunnel:**
```bash
ngrok http 3002
```
Copy the HTTPS URL (e.g., `https://xyz789.ngrok.io`)

### Step 4: Update Frontend to Use ngrok Backend

Open your browser console on the admin panel and run:
```javascript
localStorage.setItem('API_BASE_URL', 'https://YOUR_BACKEND_NGROK_URL/api/v1')
// Example: localStorage.setItem('API_BASE_URL', 'https://abc123.ngrok.io/api/v1')
```

Then refresh the page.

### Step 5: Share the Frontend URL

Give your tester the frontend ngrok URL (e.g., `https://xyz789.ngrok.io`)

---

## 🌐 Alternative: Same WiFi Network

If the tester is on the same WiFi:

1. **Find your IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   You'll get something like `192.168.1.100`

2. **Start servers with --host:**
   ```bash
   # Backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend
   cd frontend-admin && npm run dev -- --host
   ```

3. **Update CORS** (in `app/core/config.py`):
   ```python
   CORS_ORIGINS = [
       "http://localhost:3002",
       "http://YOUR_IP:3002",  # Add this
       # ... other origins
   ]
   ```

4. **Share:** `http://YOUR_IP:3002`

---

## 🔧 Using the Helper Script

I've created a script to make this easier:

```bash
./share_setup.sh ngrok
```

This will guide you through the process!

---

## ⚠️ Important Notes

1. **Keep terminals open** - Closing them stops the servers/tunnels
2. **ngrok URLs change** - Free ngrok URLs change each time you restart (unless you have a paid plan)
3. **Database** - Make sure your database is accessible or use a cloud database
4. **Security** - These are for testing only!

---

## 🎯 Quick Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3002
- [ ] ngrok tunnels created (or local network setup)
- [ ] Frontend API URL updated (if using ngrok)
- [ ] CORS updated (if using local network)
- [ ] Share URL with tester!

