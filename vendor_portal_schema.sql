-- EAZyfoods Vendor Portal Database Schema
-- Multi-vendor grocery delivery marketplace
-- Supports vendors, roles, inventory, orders, payouts, and more

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- VENDOR MANAGEMENT
-- ============================================================================

-- Vendors (Stores) table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(50) NOT NULL, -- grocery, butcher, specialty, etc.
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Business address
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Business verification
    business_registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    government_id_url VARCHAR(255),
    business_registration_url VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
    verified_at TIMESTAMP,
    
    -- Store setup
    store_profile_image_url VARCHAR(255),
    description TEXT,
    operating_hours JSONB, -- {"monday": {"open": "09:00", "close": "21:00"}, ...}
    delivery_radius_km DECIMAL(5, 2) DEFAULT 5.0,
    pickup_available BOOLEAN DEFAULT TRUE,
    delivery_available BOOLEAN DEFAULT TRUE,
    region VARCHAR(50), -- West African, East African, North African, Central African, South African
    
    -- Commission
    commission_rate DECIMAL(5, 2) DEFAULT 15.0, -- Percentage (10-20%)
    commission_agreement_accepted BOOLEAN DEFAULT FALSE,
    commission_agreement_accepted_at TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'suspended', 'inactive')),
    go_live_at TIMESTAMP,
    
    -- Bank account for payouts
    bank_account_name VARCHAR(200),
    bank_account_number VARCHAR(50),
    bank_routing_number VARCHAR(50),
    bank_name VARCHAR(200),
    
    -- Ratings
    average_rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor users (roles: Store Owner, Store Manager, Staff, Finance)
CREATE TABLE IF NOT EXISTS vendor_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('store_owner', 'store_manager', 'staff', 'finance')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, email)
);

-- Vendor onboarding steps tracking
CREATE TABLE IF NOT EXISTS vendor_onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL, -- signup, business_info, verification, store_setup, go_live
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    data JSONB, -- Store step-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, step_name)
);

-- ============================================================================
-- PRODUCT MANAGEMENT
-- ============================================================================

-- Categories (global, but can be vendor-specific)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- For subcategories
    description TEXT,
    image_url VARCHAR(255),
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products (vendor-owned)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    sale_price DECIMAL(10, 2),
    compare_at_price DECIMAL(10, 2),
    
    -- Categorization
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Product identifiers
    sku VARCHAR(50), -- Auto-generated or custom
    barcode VARCHAR(50), -- Code128 format, can be scanned
    vendor_sku VARCHAR(50), -- Vendor's internal SKU
    
    -- Media
    image_url VARCHAR(255),
    images TEXT[], -- Array of image URLs
    
    -- Units and measurements
    unit VARCHAR(20) NOT NULL DEFAULT 'piece', -- kg, g, piece, litre, etc.
    weight_kg DECIMAL(8, 2),
    
    -- Variants support (size, brand, etc.)
    variant_type VARCHAR(50), -- size, brand, flavor, etc.
    variant_value VARCHAR(100),
    parent_product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- For variant grouping
    
    -- Inventory
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    track_inventory BOOLEAN DEFAULT TRUE,
    
    -- Expiry (for perishables)
    expiry_date DATE,
    track_expiry BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'out_of_stock', 'hidden', 'draft')),
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- SEO
    slug VARCHAR(200) NOT NULL,
    
    -- Origin
    origin_country VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, slug)
);

-- Product variants (for size, brand, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- e.g., "Size", "Brand"
    variant_value VARCHAR(100) NOT NULL, -- e.g., "Large", "Brand A"
    price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Additional cost for this variant
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(50),
    barcode VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_name, variant_value)
);

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Inventory adjustments (audit log)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('stock_in', 'stock_out', 'adjustment', 'damage', 'expired', 'return')),
    quantity_change INTEGER NOT NULL, -- Positive for stock_in, negative for stock_out
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    reference_number VARCHAR(100), -- PO number, invoice, etc.
    performed_by UUID NOT NULL REFERENCES vendor_users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Low stock alerts
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL,
    threshold_quantity INTEGER NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expiry alerts
CREATE TABLE IF NOT EXISTS expiry_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    days_until_expiry INTEGER NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CUSTOMERS (for orders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('shipping', 'billing', 'both')),
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ORDER MANAGEMENT
-- ============================================================================

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Order status workflow
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'picking', 'ready', 'picked_up', 'delivered', 'cancelled')),
    
    -- Delivery method
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('delivery', 'pickup')),
    delivery_address_id UUID REFERENCES customer_addresses(id),
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Commission
    gross_sales DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL, -- Rate at time of order
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_payout DECIMAL(10, 2) NOT NULL,
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    
    -- Fulfillment
    accepted_at TIMESTAMP,
    accepted_by UUID REFERENCES vendor_users(id),
    picking_started_at TIMESTAMP,
    picking_completed_at TIMESTAMP,
    ready_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Special instructions
    special_instructions TEXT,
    customer_notes TEXT,
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES vendor_users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL, -- Store name at time of order
    product_price DECIMAL(10, 2) NOT NULL, -- Store price at time of order
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- Substitutions
    is_substituted BOOLEAN DEFAULT FALSE,
    original_product_id UUID REFERENCES products(id),
    substitution_reason TEXT,
    
    -- Fulfillment
    is_out_of_stock BOOLEAN DEFAULT FALSE,
    quantity_fulfilled INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order status history (audit trail)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES vendor_users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMMISSION & PAYOUTS
-- ============================================================================

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Amounts
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    fees DECIMAL(10, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Payment details
    payout_method VARCHAR(50) DEFAULT 'bank_transfer',
    bank_account_name VARCHAR(200),
    bank_account_number VARCHAR(50),
    transaction_reference VARCHAR(100),
    
    -- Processing
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payout items (orders included in payout)
CREATE TABLE IF NOT EXISTS payout_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    order_number VARCHAR(50) NOT NULL,
    gross_sales DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_payout DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PROMOTIONS & MARKETING
-- ============================================================================

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN ('discount', 'store_wide_sale', 'featured', 'bundle')),
    
    -- Discount details
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2),
    minimum_order_amount DECIMAL(10, 2),
    
    -- Products
    applies_to_all_products BOOLEAN DEFAULT FALSE,
    product_ids UUID[], -- Array of product IDs
    
    -- Constraints
    minimum_margin_enforced BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES vendor_users(id),
    approved_at TIMESTAMP,
    
    -- Schedule
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- REVIEWS & RATINGS
-- ============================================================================

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Vendor response
    vendor_response TEXT,
    vendor_response_at TIMESTAMP,
    responded_by UUID REFERENCES vendor_users(id),
    
    -- Moderation
    is_reported BOOLEAN DEFAULT FALSE,
    report_reason TEXT,
    is_abusive BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANALYTICS & REPORTS
-- ============================================================================

-- Sales reports (can be materialized or generated on-demand)
CREATE TABLE IF NOT EXISTS sales_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    total_commission DECIMAL(10, 2) DEFAULT 0,
    net_payout DECIMAL(10, 2) DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Top products (JSONB for flexibility)
    top_products JSONB,
    
    -- Fulfillment metrics
    average_fulfillment_time_minutes INTEGER,
    cancellation_rate DECIMAL(5, 2),
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, report_type, period_start, period_end)
);

-- ============================================================================
-- NOTIFICATIONS & COMMUNICATION
-- ============================================================================

-- System notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    vendor_user_id UUID REFERENCES vendor_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- order_new, low_stock, payout_ready, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support messages (vendor to EAZyfoods)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    vendor_user_id UUID REFERENCES vendor_users(id),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to VARCHAR(100), -- EAZyfoods support staff
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Vendor indexes
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_verification_status ON vendors(verification_status);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor ON vendor_users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_role ON vendor_users(role);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_vendor ON inventory_adjustments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date ON inventory_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_vendor ON low_stock_alerts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_resolved ON low_stock_alerts(is_resolved);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Payout indexes
CREATE INDEX IF NOT EXISTS idx_payouts_vendor ON payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON payouts(period_start, period_end);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_vendor ON notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(vendor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_users_updated_at BEFORE UPDATE ON vendor_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_order_number TEXT;
BEGIN
    new_order_number := 'EZF-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payout number
CREATE OR REPLACE FUNCTION generate_payout_number()
RETURNS TEXT AS $$
DECLARE
    new_payout_number TEXT;
BEGIN
    new_payout_number := 'PAY-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_payout_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update vendor rating
CREATE OR REPLACE FUNCTION update_vendor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vendors
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE vendor_id = NEW.vendor_id AND is_public = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE vendor_id = NEW.vendor_id AND is_public = TRUE
        )
    WHERE id = NEW.vendor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_vendor_rating();

-- Function to check low stock and create alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_quantity <= NEW.low_stock_threshold AND NEW.track_inventory = TRUE THEN
        INSERT INTO low_stock_alerts (vendor_id, product_id, current_quantity, threshold_quantity)
        VALUES (NEW.vendor_id, NEW.id, NEW.stock_quantity, NEW.low_stock_threshold)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_low_stock_trigger
    AFTER INSERT OR UPDATE OF stock_quantity ON products
    FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
    ('Grains & Cereals', 'grains-cereals', 'Traditional African grains, rice, and cereals'),
    ('Spices & Seasonings', 'spices-seasonings', 'Authentic African spices and seasonings'),
    ('Legumes & Beans', 'legumes-beans', 'Various beans and legumes'),
    ('Oils & Condiments', 'oils-condiments', 'Cooking oils and condiments'),
    ('Beverages', 'beverages', 'African drinks and beverages'),
    ('Snacks & Sweets', 'snacks-sweets', 'Traditional snacks and sweets'),
    ('Frozen Foods', 'frozen-foods', 'Frozen African food products'),
    ('Fresh Produce', 'fresh-produce', 'Fresh fruits and vegetables')
ON CONFLICT (slug) DO NOTHING;

