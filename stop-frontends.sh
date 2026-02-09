#!/usr/bin/env bash
# Stop Vite dev servers so you can start fresh.
# Run: ./stop-frontends.sh

echo "Stopping Vite dev servers..."
pkill -f "vite" 2>/dev/null || true
sleep 1
echo "Done. Run one frontend with: cd frontend-customer && npm run dev"
