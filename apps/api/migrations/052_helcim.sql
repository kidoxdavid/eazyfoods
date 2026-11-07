-- Helcim support. HelcimPay.js gives each checkout a public token (kept in client_secret, sent to the browser) and a secret token that only the server may see
-- (used to verify the payment result), and a payment is later identified by a Helcim transaction id that a refund needs.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_secret text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_transaction_id text;
