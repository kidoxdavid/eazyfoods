-- Customer saved chefs (favorites)
CREATE TABLE IF NOT EXISTS customer_saved_chefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(customer_id, chef_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_saved_chefs_customer ON customer_saved_chefs(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_saved_chefs_chef ON customer_saved_chefs(chef_id);
