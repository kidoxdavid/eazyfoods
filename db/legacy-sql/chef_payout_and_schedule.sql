-- Chef payouts and schedule (run once)
-- Creates chef_payouts, chef_payout_items and adds operating_hours, blocked_dates to chefs.

-- Chef schedule columns (if not already present)
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS operating_hours JSONB;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS blocked_dates JSONB;

-- Chef payouts
CREATE TABLE IF NOT EXISTS chef_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    payout_number VARCHAR(50) NOT NULL UNIQUE,
    net_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payout_method VARCHAR(50) DEFAULT 'bank_transfer',
    bank_account_name VARCHAR(200),
    transaction_reference VARCHAR(100),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chef_payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chef_payout_id UUID NOT NULL REFERENCES chef_payouts(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    net_payout DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chef_payouts_chef_id ON chef_payouts(chef_id);
CREATE INDEX IF NOT EXISTS idx_chef_payout_items_chef_payout_id ON chef_payout_items(chef_payout_id);
