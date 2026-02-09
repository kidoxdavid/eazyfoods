# Final Tunnel Setup - Free Plan Solution

## The Reality
ngrok free plan **reuses the same URL** for multiple tunnels. This is a limitation we need to work around.

## Best Solution: Use 2 Tunnels + Local Network

### Setup 1: Backend + Admin (Always Running)

**Terminal 1 - Backend:**
```bash
ngrok http 8000
```
URL: `https://gabbroid-quinn-competently.ngrok-free.dev` (or whatever you get)

**Terminal 2 - Admin Frontend:**
```bash
ngrok http 3002
```
URL: Should be different (or use the same if ngrok reuses it)

### Setup 2: Vendor & Customer via Local Network

Since you're on the same network, you can share vendor and customer via **local IP**:

1. **Find your local IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
   ```
   You'll get something like: `192.168.1.100`

2. **Vendor Portal:**
   - Local URL: `http://YOUR_IP:3000`
   - Share this with testers on the same WiFi

3. **Customer Portal:**
   - Local URL: `http://YOUR_IP:3003`
   - Share this with testers on the same WiFi

4. **Update CORS** in `app/core/config.py`:
   ```python
   CORS_ORIGINS = [
       "http://localhost:3002",
       "http://localhost:3000",
       "http://localhost:3003",
       "http://YOUR_IP:3000",  # Add this
       "http://YOUR_IP:3003",  # Add this
       "https://gabbroid-quinn-competently.ngrok-free.dev",  # Your ngrok URLs
       # ... other origins
   ]
   ```

5. **All portals use the backend ngrok URL for API:**
   ```javascript
   localStorage.setItem('API_BASE_URL', 'https://gabbroid-quinn-competently.ngrok-free.dev/api/v1')
   ```

---

## Alternative: Rotate 3rd Tunnel

If testers can't access local network:

1. **Keep these 2 running:**
   - Backend (8000)
   - Admin (3002)

2. **Rotate the 3rd:**
   - When testing Vendor: `ngrok http 3000`
   - When testing Customer: Stop vendor, then `ngrok http 3003`

---

## URLs to Share

- **Admin**: `https://ADMIN_NGROK_URL` (via ngrok)
- **Vendor**: `http://YOUR_IP:3000` (local network) OR ngrok URL when running
- **Customer**: `http://YOUR_IP:3003` (local network) OR ngrok URL when running

All use: `https://BACKEND_NGROK_URL/api/v1` for API calls.

---

## Quick Setup

1. **Get your local IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update CORS** with your IP

3. **Restart backend** to apply CORS changes

4. **Share URLs:**
   - Admin: ngrok URL
   - Vendor/Customer: Local IP URLs (if on same network) or rotate ngrok tunnel

