# Stripe Integration Setup Guide

## Backend Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Get Stripe API Keys
1. Sign up for a Stripe account at https://stripe.com
2. Go to Developers > API keys
3. Copy your **Publishable key** and **Secret key**
4. For webhooks, you'll need to set up a webhook endpoint (see below)

### 3. Configure Environment Variables
Add these to your `.env` file:
```env
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test or live)
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key (test or live)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret (get this after setting up webhook)
```

### 4. Database Migration
Run this SQL to add Stripe payment fields to the orders table:
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);
```

### 5. Set Up Stripe Webhook
1. In Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/v1/customer/payments/webhook`
   - For local testing, use ngrok: `https://your-ngrok-url.ngrok.io/api/v1/customer/payments/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the "Signing secret" and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

## Frontend Setup

### 1. Install Stripe.js
```bash
cd frontend-customer
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Get Publishable Key
The publishable key will be fetched from the backend configuration or you can set it directly in the frontend.

## Testing

### Test Mode
- Use test API keys (start with `sk_test_` and `pk_test_`)
- Use Stripe test cards: https://stripe.com/docs/testing
- Test card: `4242 4242 4242 4242` (any future expiry, any CVC)

### Production
- Switch to live API keys (start with `sk_live_` and `pk_live_`)
- Update webhook endpoint to production URL
- Test thoroughly before going live

## Payment Flow

1. **Create Payment Intent**: Frontend calls `/customer/payments/create-payment-intent` with order total
2. **Confirm Payment**: User enters card details, Stripe.js handles payment
3. **Create Order**: After payment succeeds, create order with `payment_intent_id`
4. **Webhook Confirmation**: Stripe sends webhook to confirm payment (backup verification)

## Security Notes

- Never expose your secret key in frontend code
- Always verify webhook signatures
- Use HTTPS in production
- Store sensitive keys in environment variables only





