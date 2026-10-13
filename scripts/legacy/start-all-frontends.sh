#!/usr/bin/env bash
# Start all six frontends. Each runs in the background on its own port.
# Stop them with: ./stop-frontends.sh

cd "$(dirname "$0")"
./stop-frontends.sh 2>/dev/null
sleep 2

echo "Starting all frontends..."
(cd frontend-vendor   && nohup npm run dev > ../.vite-vendor.log 2>&1) &
(cd frontend-admin    && nohup npm run dev > ../.vite-admin.log 2>&1) &
(cd frontend-customer && nohup npm run dev > ../.vite-customer.log 2>&1) &
(cd frontend-delivery && nohup npm run dev > ../.vite-delivery.log 2>&1) &
(cd frontend-marketing && nohup npm run dev > ../.vite-marketing.log 2>&1) &
(cd frontend-chef     && nohup npm run dev > ../.vite-chef.log 2>&1) &

sleep 12
echo ""
echo "Frontends running. Open in browser:"
echo "  Vendor:    http://localhost:3000"
echo "  Admin:     http://localhost:3002"
echo "  Customer:  http://localhost:3003"
echo "  Delivery:  http://localhost:3004"
echo "  Marketing: http://localhost:3005"
echo "  Chef:      http://localhost:3006"
echo ""
echo "To stop all: ./stop-frontends.sh"
