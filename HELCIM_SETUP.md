# Helcim Integration Setup Guide

## Backend Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```
The `httpx` package is required for making HTTP requests to Helcim's API.

### 2. Get Helcim API Credentials
1. Sign up for a Helcim account at https://www.helcim.com
2. Log in to your Helcim dashboard
3. Go to Settings > API Access
4. Generate an API Token
5. Copy your **API Token**

### 3. Configure Environment Variables
Add these to your `.env` file:
```env
# Payment Gateway Selection
PAYMENT_GATEWAY=helcim  # Options: "stripe" or "helcim"

# Helcim Configuration
HELCIM_API_TOKEN=your_api_token_here
HELCIM_API_URL=https://api.helcim.com/v2
HELCIM_TEST_MODE=true  # Set to false for production

# Optional: Keep Stripe keys if you want to switch back
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Database Migration
Run this SQL to add Helcim payment fields to the orders table:
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS helcim_transaction_id VARCHAR(255);
```

### 5. Set Up Helcim Webhook (Optional)
1. In Helcim Dashboard, go to Settings > Webhooks
2. Add a webhook endpoint: `https://your-domain.com/api/v1/customer/payments/webhook`
   - For local testing, use ngrok: `https://your-ngrok-url.ngrok.io/api/v1/customer/payments/webhook`
3. Select events to listen to:
   - `payment.completed`
   - `payment.failed`
4. Copy the webhook secret (if provided) and add it to your `.env` if needed

## Frontend Setup

### 1. Install Helcim.js
```bash
cd frontend-customer
npm install @helcim/helcim-js
```

### 2. Update Payment Component
The frontend payment component (`StripePayment.jsx`) needs to be updated to support Helcim. 
The component will automatically detect which gateway is configured based on the `/customer/payments/config` endpoint response.

## Testing

### Test Mode
- Use test API token from Helcim dashboard
- Set `HELCIM_TEST_MODE=true` in `.env`
- Use Helcim test card numbers (check Helcim documentation)

### Production
- Switch to live API token
- Set `HELCIM_TEST_MODE=false` in `.env`
- Update webhook endpoint to production URL
- Test thoroughly before going live

## Payment Flow

1. **Initialize Payment**: Frontend calls `/customer/payments/create-payment-intent` with order total
2. **Get Payment Token**: Backend returns Helcim payment token
3. **Process Payment**: User enters card details, Helcim.js handles payment
4. **Create Order**: After payment succeeds, create order with `transaction_id`
5. **Webhook Confirmation**: Helcim sends webhook to confirm payment (backup verification)

## Advantages of Helcim

- **Lower Fees**: Typically 0.30% + $0.25 vs Stripe's 2.9% + $0.30
- **Interchange-Plus Pricing**: More transparent pricing model
- **Canadian-Based**: Better for CAD transactions
- **No Monthly Fees**: Pay only for transactions

## Security Notes

- Never expose your API token in frontend code
- Always verify webhook signatures (if provided by Helcim)
- Use HTTPS in production
- Store sensitive keys in environment variables only
- Keep test and production tokens separate

## Switching Between Gateways

To switch between Stripe and Helcim:
1. Update `PAYMENT_GATEWAY` in `.env` to either "stripe" or "helcim"
2. Ensure the corresponding API keys are configured
3. Restart the backend server
4. The frontend will automatically use the correct gateway based on the config endpoint

## Troubleshooting

- **"Helcim is not configured"**: Check that `HELCIM_API_TOKEN` is set in `.env`
- **"Payment processing failed"**: Verify API token is correct and test mode matches your environment
- **Webhook not working**: Ensure webhook URL is publicly accessible (use ngrok for local testing)

