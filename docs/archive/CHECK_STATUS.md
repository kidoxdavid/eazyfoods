# How to Check if Everything is Running

## Quick Check Commands

### 1. Check Backend Server (Port 8000)

**In terminal, run:**
```bash
lsof -Pi :8000 -sTCP:LISTEN
```

**What you should see:**
- If running: Shows process info (like `uvicorn`)
- If NOT running: Nothing or "command not found"

**OR test it directly:**
```bash
curl http://localhost:8000/health
```
- If running: Returns JSON with status
- If NOT running: "Connection refused"

---

### 2. Check Frontend Server (Port 3002)

**In terminal, run:**
```bash
lsof -Pi :3002 -sTCP:LISTEN
```

**What you should see:**
- If running: Shows process info (like `node` or `vite`)
- If NOT running: Nothing

**OR test it directly:**
- Open browser: `http://localhost:3002`
- If running: You see the admin login page
- If NOT running: "Cannot connect" or "This site can't be reached"

---

### 3. Check ngrok Tunnels

**In terminal, run:**
```bash
ps aux | grep ngrok | grep -v grep
```

**What you should see:**
- If running: Shows ngrok processes
- If NOT running: Nothing

**OR check ngrok dashboard:**
- Open browser: `http://localhost:4040`
- If running: You see ngrok web interface with tunnel info
- If NOT running: "Cannot connect"

---

## Visual Checks

### Backend Server (Terminal 1)
Look for output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Frontend Server (Terminal 2)
Look for output like:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3002/
  ➜  Network: http://192.168.x.x:3002/
```

### ngrok Tunnel (Terminal 3 or 4)
Look for output like:
```
Session Status                online
Forwarding                    https://abc123.ngrok-free.dev -> http://localhost:8000
```

---

## Quick Test URLs

**Test Backend:**
- Local: `http://localhost:8000/health`
- Should return: `{"status":"healthy"}` or similar JSON

**Test Frontend:**
- Local: `http://localhost:3002`
- Should show: Admin login page

**Test Backend via ngrok:**
- ngrok URL: `https://YOUR_BACKEND_NGROK_URL/api/v1/admin/dashboard/stats`
- Should return: JSON data (or ngrok warning page - click "Visit Site")

**Test Frontend via ngrok:**
- ngrok URL: `https://YOUR_FRONTEND_NGROK_URL`
- Should show: Admin login page (or ngrok warning page - click "Visit Site")

---

## Status Checklist

Run this to check everything at once:
```bash
echo "Backend:" && (lsof -Pi :8000 -sTCP:LISTEN >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")
echo "Frontend:" && (lsof -Pi :3002 -sTCP:LISTEN >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")
echo "ngrok:" && (ps aux | grep -i ngrok | grep -v grep >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")
```

