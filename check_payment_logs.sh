#!/bin/bash
# Script to check for recent Helcim payment logs

echo "=========================================="
echo "Looking for recent Helcim payment attempts..."
echo "=========================================="
echo ""

# Check for payment payload logs
echo "📤 PAYMENT REQUEST (what we sent to Helcim):"
echo "--------------------------------------------"
tail -200 backend.log | grep -A 5 "Helcim Payment Payload" | tail -10

echo ""
echo "📥 HELCIM API RESPONSE:"
echo "--------------------------------------------"
tail -200 backend.log | grep -A 20 "Helcim API Response" | tail -25

echo ""
echo "❌ ERRORS (if any):"
echo "--------------------------------------------"
tail -200 backend.log | grep -A 10 "Helcim Error\|Helcim Transaction Declined" | tail -15

echo ""
echo "=========================================="
echo "💡 TIP: Try making a payment, then run this script again"
echo "=========================================="
