-- Staff alerts about money events. The unique key stops a retried event from emailing the same person twice.
ALTER TABLE notifications ADD COLUMN dedupe_key text;
CREATE UNIQUE INDEX notifications_dedupe ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Which alerts are on. Finance can switch each off in Settings.
INSERT INTO app_settings(key, value) VALUES ('finance.notifications', '{"payout_needs_approval":true,"payout_failed":true,"pricing_rule_pending":true,"reconciliation_difference":true,"payout_hold_placed":true}') ON CONFLICT DO NOTHING;

INSERT INTO notification_templates(key, subject, body) VALUES
 ('staff_payout_needs_approval', 'A payout of ${{amount}} is waiting for approval', E'{{who}} created a payout of ${{amount}} CAD for {{payee}}. It is above the approval limit, so nothing is sent until a different person approves it.\n\nReview it: {{web_url}}/admin/settlements'),
 ('staff_payout_failed', 'A payout of ${{amount}} to {{payee}} failed', E'The transfer of ${{amount}} CAD to {{payee}} did not go through: {{reason}}\n\nIt can be retried, or paid by bank transfer and marked paid: {{web_url}}/finance/settlements'),
 ('staff_pricing_rule_pending', 'A pricing rule is waiting for approval: {{name}}', E'{{who}} submitted the {{kind}} rule "{{name}}". It changes what customers, drivers or vendors are charged or paid for new orders once approved.\n\nReview it: {{web_url}}/admin/pricing'),
 ('staff_reconciliation_difference', 'The books do not match: {{title}}', E'{{detail}}\n\nNothing was changed automatically. Review it: {{web_url}}/finance/reconciliation'),
 ('staff_payout_hold_placed', 'Payouts to {{payee}} are on hold', E'{{who}} placed a hold on payouts to {{payee}}: {{reason}}\n\nOnly an approver can release it: {{web_url}}/admin/settlements');
