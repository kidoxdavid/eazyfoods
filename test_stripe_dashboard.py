#!/usr/bin/env python3
"""
Test that Stripe PaymentIntents show in your Dashboard.
Run: python3 test_stripe_dashboard.py
Then open the URL printed and check Test mode → Payments.
"""
import os
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

try:
    import stripe
except ImportError:
    print("Run: pip install stripe")
    exit(1)

key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
if not key or not key.startswith("sk_"):
    print("STRIPE_SECRET_KEY not set or invalid in .env (should start with sk_test_ or sk_live_)")
    exit(1)

stripe.api_key = key
is_test = key.startswith("sk_test_")
print(f"Using {'TEST' if is_test else 'LIVE'} key (first 12 chars): {key[:12]}...")

try:
    intent = stripe.PaymentIntent.create(
        amount=100,  # 1.00 CAD in cents
        currency="cad",
        automatic_payment_methods={"enabled": True},
    )
    pi_id = intent.id
    print(f"\nCreated PaymentIntent: {pi_id}")
    print(f"\n1. Open Stripe Dashboard: https://dashboard.stripe.com")
    print(f"2. Turn ON 'Test mode' (top right) if you use sk_test_ keys")
    print(f"3. Go to Payments: https://dashboard.stripe.com/test/payments" if is_test else f"3. Go to Payments: https://dashboard.stripe.com/payments")
    print(f"4. Search or look for: {pi_id}")
    print(f"\nIf you see this payment above, your keys are correct and payments go to this account.")
    print("If nothing shows, you're likely in the wrong mode (Test vs Live) or wrong Stripe account.")
except stripe.StripeError as e:
    print(f"Stripe error: {e}")
