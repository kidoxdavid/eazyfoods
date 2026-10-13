#!/bin/bash

# Quick setup script for sharing your website
# This script helps you set up ngrok and configure everything

echo "🚀 Website Sharing Setup"
echo "========================"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install it with:"
    echo "  brew install ngrok"
    echo "  OR download from: https://ngrok.com/download"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo "✅ ngrok is installed"
echo ""

# Check if servers are running
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

echo "Checking if servers are running..."
if ! check_port 8000; then
    echo "❌ Backend (port 8000) is not running"
    echo "   Start it with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi

if ! check_port 3002; then
    echo "❌ Frontend (port 3002) is not running"
    echo "   Start it with: cd frontend-admin && npm run dev -- --host"
    exit 1
fi

echo "✅ Both servers are running"
echo ""

echo "⚠️  Note: ngrok free plan allows one tunnel at a time."
echo "   We'll start the frontend tunnel here."
echo "   You'll need to start the backend tunnel in a separate terminal."
echo ""

echo "Starting frontend ngrok tunnel (port 3002)..."
echo "   Check http://localhost:4040 for the URL"
echo ""

# Start frontend tunnel
ngrok http 3002 &
FRONTEND_NGROK_PID=$!
sleep 3

# Try to get the URL from ngrok API
FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)

if [ ! -z "$FRONTEND_URL" ] && [ "$FRONTEND_URL" != "None" ]; then
    echo "✅ Frontend URL: $FRONTEND_URL"
else
    echo "⚠️  Check http://localhost:4040 for the frontend URL"
    FRONTEND_URL=""
fi

echo ""
echo "=========================================="
echo "✅ Frontend tunnel is running!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start Backend Tunnel (open a NEW terminal and run):"
echo "   ngrok http 8000"
echo "   Copy the HTTPS URL it gives you (e.g., https://abc123.ngrok.io)"
echo ""
echo "2. Update Frontend API URL:"
echo "   a) Open your admin panel in browser: http://localhost:3002"
echo "   b) Open browser console (F12 or Cmd+Option+I)"
echo "   c) Run this command (replace with your backend ngrok URL):"
echo "      localStorage.setItem('API_BASE_URL', 'YOUR_BACKEND_NGROK_URL/api/v1')"
echo "   d) Refresh the page"
echo ""
echo "3. Update CORS (optional but recommended):"
if [ ! -z "$FRONTEND_URL" ]; then
    echo "   Add this to app/core/config.py CORS_ORIGINS list:"
    echo "   \"$FRONTEND_URL\""
    echo "   Then restart your backend server"
else
    echo "   Add your frontend ngrok URL to CORS_ORIGINS in app/core/config.py"
fi
echo ""
if [ ! -z "$FRONTEND_URL" ]; then
    echo "4. Share this URL with your tester:"
    echo "   👉 $FRONTEND_URL 👈"
else
    echo "4. Get your frontend URL from http://localhost:4040 and share it"
fi
echo ""
echo "⚠️  Keep this terminal open - closing it stops the tunnel!"
echo ""
echo "Press Ctrl+C to stop the tunnel"

# Wait for user interrupt
trap "kill $FRONTEND_NGROK_PID 2>/dev/null; exit" INT
wait
