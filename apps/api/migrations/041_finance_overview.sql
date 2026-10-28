-- Assumptions used ONLY for the clearly labelled "estimated" margin, because real payment-processing fees are not imported yet.
INSERT INTO app_settings(key, value) VALUES ('finance.processing_assumption_bps', '290'), ('finance.processing_assumption_fixed_cents', '30') ON CONFLICT DO NOTHING;
