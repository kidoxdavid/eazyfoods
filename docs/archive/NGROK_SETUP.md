# Setting Up ngrok for Website Sharing

## Step 1: Sign Up for ngrok (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with your email (it's free!)
3. Verify your email

## Step 2: Get Your Authtoken

1. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (it looks like: `2abc123def456ghi789jkl012mno345pq_6rst789uvw012xyz345abc678def`)

## Step 3: Configure ngrok

Run this command in your terminal (replace `YOUR_AUTHTOKEN` with the token you copied):

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

## Step 4: Verify It Works

Test ngrok:
```bash
ngrok http 8000
```

You should see it start successfully without authentication errors!

## That's It!

Once configured, you can use `./setup_for_sharing.sh` or run ngrok commands directly.

---

## Quick Command Reference

After setup, you can run:
```bash
# Frontend tunnel
ngrok http 3002

# Backend tunnel (in another terminal)
ngrok http 8000
```

