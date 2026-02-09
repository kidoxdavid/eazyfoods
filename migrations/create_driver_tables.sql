-- Create drivers and deliveries tables
-- Run this migration to add driver functionality to the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth TIMESTAMP,
    
    -- Address
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'United States',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Vehicle Info
    vehicle_type VARCHAR(50), -- car, motorcycle, bicycle, scooter, walking
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(50),
    license_plate VARCHAR(50),
    
    -- Documents
    driver_license_number VARCHAR(100),
    driver_license_url VARCHAR(255),
    vehicle_registration_url VARCHAR(255),
    insurance_document_url VARCHAR(255),
    profile_image_url VARCHAR(255),
    
    -- Verification
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    verified_at TIMESTAMP,
    verification_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT FALSE, -- Available to accept deliveries
    current_location_latitude DECIMAL(10, 8),
    current_location_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP,
    
    -- Performance Metrics
    total_deliveries INTEGER DEFAULT 0,
    completed_deliveries INTEGER DEFAULT 0,
    cancelled_deliveries INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.0,
    
    -- Settings
    delivery_radius_km DECIMAL(5, 2) DEFAULT 10.0, -- Max distance willing to travel
    preferred_delivery_zones JSON, -- Array of preferred areas/cities
    
    -- Bank account for payouts
    bank_account_name VARCHAR(200),
    bank_account_number VARCHAR(50),
    bank_routing_number VARCHAR(50),
    bank_name VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, picked_up, in_transit, delivered, cancelled
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Location tracking
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    
    -- Delivery details
    estimated_pickup_time TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    actual_pickup_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    distance_km DECIMAL(8, 2),
    delivery_fee DECIMAL(10, 2) DEFAULT 0.0,
    driver_earnings DECIMAL(10, 2) DEFAULT 0.0, -- Amount driver earns from this delivery
    
    -- Notes
    driver_notes TEXT,
    customer_notes TEXT,
    
    -- Rating
    customer_rating INTEGER, -- 1-5
    customer_feedback TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_verification_status ON drivers(verification_status);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_is_available ON drivers(is_available);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_driver_updated_at ON drivers;
CREATE TRIGGER trigger_update_driver_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_updated_at();

DROP TRIGGER IF EXISTS trigger_update_delivery_updated_at ON deliveries;
CREATE TRIGGER trigger_update_delivery_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

