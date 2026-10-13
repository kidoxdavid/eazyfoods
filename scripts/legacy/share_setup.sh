#!/bin/bash

# Quick setup script for sharing your website for testing
# Usage: ./share_setup.sh [method]
# Methods: ngrok, local, localtunnel

METHOD=${1:-ngrok}

echo "🚀 Setting up website sharing with method: $METHOD"
echo ""

# Check if servers are running
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "✅ Port $1 is in use"
        return 0
    else
        echo "❌ Port $1 is not in use - please start your servers first!"
        return 1
    fi
}

echo "Checking if servers are running..."
check_port 8000 || exit 1
check_port 3002 || exit 1
echo ""

case $METHOD in
    ngrok)
        echo "📡 Setting up ngrok tunnels..."
        echo ""
        echo "Please make sure ngrok is installed:"
        echo "  brew install ngrok"
        echo "  OR download from: https://ngrok.com/download"
        echo ""
        echo "Starting ngrok tunnels..."
        echo ""
        echo "Backend tunnel (port 8000):"
        ngrok http 8000 &
        BACKEND_PID=$!
        sleep 2
        
        echo ""
        echo "Frontend tunnel (port 3002):"
        ngrok http 3002 &
        FRONTEND_PID=$!
        sleep 2
        
        echo ""
        echo "✅ Tunnels started!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Check ngrok dashboard: http://localhost:4040"
        echo "2. Copy the 'Forwarding' URLs"
        echo "3. Update frontend-admin/src/services/api.js with the backend ngrok URL"
        echo "4. Share the frontend ngrok URL with your tester"
        echo ""
        echo "Press Ctrl+C to stop tunnels"
        wait
        ;;
        
    local)
        echo "🌐 Setting up local network sharing..."
        echo ""
        
        # Get local IP
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
        
        if [ -z "$LOCAL_IP" ]; then
            echo "❌ Could not detect local IP address"
            exit 1
        fi
        
        echo "Your local IP: $LOCAL_IP"
        echo ""
        echo "📋 Share this URL with your tester:"
        echo "   http://$LOCAL_IP:3002"
        echo ""
        echo "⚠️  Make sure:"
        echo "1. Both you and the tester are on the same WiFi network"
        echo "2. Your firewall allows connections on ports 8000 and 3002"
        echo "3. Update CORS_ORIGINS in app/core/config.py to include:"
        echo "   http://$LOCAL_IP:3002"
        echo ""
        ;;
        
    localtunnel)
        echo "🌉 Setting up localtunnel..."
        echo ""
        
        if ! command -v lt &> /dev/null; then
            echo "Installing localtunnel..."
            npm install -g localtunnel
        fi
        
        echo "Starting tunnels..."
        echo ""
        echo "Backend tunnel:"
        lt --port 8000 &
        BACKEND_PID=$!
        sleep 2
        
        echo ""
        echo "Frontend tunnel:"
        lt --port 3002 &
        FRONTEND_PID=$!
        sleep 2
        
        echo ""
        echo "✅ Tunnels started!"
        echo "📋 Check the URLs above and share the frontend URL with your tester"
        echo ""
        echo "Press Ctrl+C to stop tunnels"
        wait
        ;;
        
    *)
        echo "❌ Unknown method: $METHOD"
        echo "Available methods: ngrok, local, localtunnel"
        exit 1
        ;;
esac

