# Setting Up Multiple ngrok Tunnels (Free Plan Solution)

## Problem
ngrok free plan limits you to **3 simultaneous tunnels**. You need 4:
- Backend (8000)
- Admin Frontend (3002)
- Vendor Frontend (3000)
- Customer Frontend (3003)

## Solution Options

### Option 1: Use ngrok Config File (Recommended)

This lets you run all tunnels from ONE ngrok agent (counts as 1 session).

#### Step 1: Find Your ngrok Config File

```bash
ngrok config check
```

This will show the path, usually:
- macOS: `~/.config/ngrok/ngrok.yml` or `~/Library/Application Support/ngrok/ngrok.yml`

#### Step 2: Edit the Config File

Open the file and add this configuration:

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
tunnels:
  backend:
    addr: 8000
    proto: http
  admin-frontend:
    addr: 3002
    proto: http
  vendor-frontend:
    addr: 3000
    proto: http
  customer-frontend:
    addr: 3003
    proto: http
```

**Important:** Replace `YOUR_AUTHTOKEN_HERE` with your actual authtoken (or leave it if already set).

#### Step 3: Stop All Current ngrok Tunnels

Stop all running ngrok processes (Ctrl+C in all ngrok terminals).

#### Step 4: Start All Tunnels at Once

```bash
ngrok start --all
```

This will start all 4 tunnels from one agent session!

#### Step 5: Get the URLs

Check the ngrok web interface:
- `http://localhost:4040` - Shows all tunnels

Or use the API:
```bash
curl http://localhost:4040/api/tunnels | python3 -m json.tool
```

---

### Option 2: Rotate Tunnels (Simpler but Less Convenient)

Since you only need 3 tunnels at a time, you can:

1. **Keep these 3 running:**
   - Backend (8000) - Always needed
   - Admin Frontend (3002) - For admin testing
   - Vendor Frontend (3000) - For vendor testing

2. **When you need Customer Portal:**
   - Stop Vendor tunnel
   - Start Customer tunnel (3003)
   - When done, switch back

---

### Option 3: Use Same URL for Multiple Services (Not Recommended)

With pooling, you might get the same URL, but this won't work well since each service needs its own port.

---

## Recommended: Option 1 (Config File)

Let's set it up:

1. **Check your config location:**
   ```bash
   ngrok config check
   ```

2. **Edit the config file** (use the path from step 1)

3. **Stop all ngrok tunnels**

4. **Start all at once:**
   ```bash
   ngrok start --all
   ```

5. **Get URLs from:** `http://localhost:4040`

---

## Quick Setup Script

I can help you create the config file. First, run:
```bash
ngrok config check
```

Then share the path, and I'll help you set it up!

