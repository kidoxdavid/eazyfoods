# Sharing Your Website for Testing

There are several ways to let someone test your website on their laptop. Here are the easiest options:

## Option 1: ngrok (Recommended - Easiest)

**ngrok** creates a secure tunnel from the internet to your local server. It's free and takes 2 minutes to set up.

### Setup Steps:

1. **Install ngrok:**
   ```bash
   # On macOS
   brew install ngrok
   
   # Or download from: https://ngrok.com/download
   ```

2. **Start your servers** (in separate terminals):
   ```bash
   # Terminal 1: Backend
   cd /Users/davidebubeihezue/Documents/easyfoods
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Admin Frontend
   cd /Users/davidebubeihezue/Documents/easyfoods/frontend-admin
   npm run dev -- --host
   ```

3. **Create ngrok tunnels** (in new terminals):
   ```bash
   # Terminal 3: Backend tunnel
   ngrok http 8000
   
   # Terminal 4: Frontend tunnel (in a new terminal)
   ngrok http 3002
   ```

4. **Share the URLs:**
   - ngrok will give you URLs like:
     - Backend: `https://abc123.ngrok.io` 
     - Frontend: `https://xyz789.ngrok.io`
   - Share the **frontend URL** with your tester
   - **Important:** You'll need to update the frontend API URL to use the ngrok backend URL

### Update Frontend API Configuration:

You'll need to temporarily update the API base URL in `frontend-admin/src/services/api.js` to use the ngrok backend URL instead of `localhost:8000`.

---

## Option 2: Local Network (Same WiFi)

If the tester is on the same WiFi network, they can access your local IP.

### Setup Steps:

1. **Find your local IP address:**
   ```bash
   # On macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   You'll get something like: `192.168.1.100`

2. **Start servers with 0.0.0.0:**
   ```bash
   # Backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (already configured to accept connections)
   cd frontend-admin && npm run dev -- --host
   ```

3. **Update CORS settings:**
   - Add your local IP to `CORS_ORIGINS` in `app/core/config.py`
   - Example: `CORS_ORIGINS = ["http://localhost:3002", "http://192.168.1.100:3002"]`

4. **Share the URL:**
   - Give them: `http://YOUR_IP:3002`
   - Example: `http://192.168.1.100:3002`

---

## Option 3: localtunnel (Free Alternative)

Similar to ngrok but no signup required.

### Setup:

```bash
# Install
npm install -g localtunnel

# Create tunnel for backend
lt --port 8000

# Create tunnel for frontend (new terminal)
lt --port 3002
```

---

## Option 4: Cloud Deployment (Permanent Solution)

For a more permanent testing environment, deploy to:
- **Railway** (easy, free tier available)
- **Render** (free tier)
- **Heroku** (paid now)
- **DigitalOcean App Platform**

---

## Quick Setup Script

I've created a helper script to make this easier. See `share_setup.sh` below.

## Important Notes:

1. **Database:** Make sure your PostgreSQL is accessible or use a cloud database
2. **CORS:** Update CORS settings to allow the external URL
3. **API URLs:** Frontend needs to know the backend URL
4. **Security:** These are for testing only - don't use production data!

