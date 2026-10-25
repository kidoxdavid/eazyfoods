-- Drivers are paid out by Interac e-Transfer, so we keep the email that receives it (never bank account numbers).
ALTER TABLE drivers ADD COLUMN payout_email text;
