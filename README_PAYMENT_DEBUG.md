# Payment Debugging Guide

## How to Check Payment Logs

When you try to make a payment, the backend will log detailed information. Here's what to look for:

### Step 1: Try Making a Payment
1. Go to checkout page
2. Fill in card details (use Helcim test card: **4124939999999990**, expiry **01/28**, CVV **100** — see HELCIM_TEST_ACCOUNT.md for full list)
3. Click "Pay & Place Order"

### Step 2: Check Backend Logs

Open `backend.log` and search for these keywords (or scroll to the bottom):

**Look for these log messages:**
- `Helcim Payment Payload:` - Shows what we sent to Helcim
- `Helcim API Response Status:` - HTTP status code (200 = OK)
- `Helcim API Response Data:` - Full response from Helcim
- `Helcim Error Response:` - Any errors from Helcim

### Step 3: Share the Error

Copy the log entries that start with "Helcim" and share them. This will tell us:
- Whether the token is test or production
- What exact error Helcim is returning
- What we need to fix

### Quick Command to View Recent Payment Logs

```bash
tail -100 backend.log | grep -i "helcim" -A 10
```

Or just open `backend.log` and scroll to the bottom - the most recent entries will be there.
