"""
Migration script to create chef-related tables
Run this script to add chef functionality to the database
"""
import psycopg2
from app.core.config import settings
from urllib.parse import quote_plus

def create_chef_tables():
    """Create chef, chef_reviews, and customer_allergies tables"""
    
    encoded_password = quote_plus(settings.DB_PASSWORD)
    conn_str = f"postgresql://{settings.DB_USER}:{encoded_password}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    try:
        # Create chefs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chefs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                phone_verified BOOLEAN DEFAULT FALSE,
                password_hash VARCHAR(255) NOT NULL,
                
                -- Personal Info
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                chef_name VARCHAR(200),
                bio TEXT,
                profile_image_url VARCHAR(255),
                banner_image_url VARCHAR(255),
                
                -- Address
                street_address VARCHAR(255) NOT NULL,
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100),
                postal_code VARCHAR(20) NOT NULL,
                country VARCHAR(100) DEFAULT 'Canada',
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                
                -- Cuisines
                cuisines TEXT[] NOT NULL DEFAULT '{}',
                cuisine_description TEXT,
                
                -- Documents
                government_id_url VARCHAR(255),
                chef_certification_url VARCHAR(255),
                profile_image_url_verification VARCHAR(255),
                
                -- Verification
                verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
                verified_at TIMESTAMP,
                verification_notes TEXT,
                verified_by UUID REFERENCES admin_users(id),
                
                -- Status
                is_active BOOLEAN DEFAULT TRUE,
                is_available BOOLEAN DEFAULT TRUE,
                
                -- Service details
                service_radius_km DECIMAL(5, 2) DEFAULT 10.0,
                minimum_order_amount DECIMAL(10, 2) DEFAULT 0.00,
                service_fee DECIMAL(10, 2) DEFAULT 0.00,
                estimated_prep_time_minutes INTEGER DEFAULT 60,
                accepts_online_payment BOOLEAN DEFAULT TRUE,
                accepts_cash_on_delivery BOOLEAN DEFAULT TRUE,
                
                -- Social media
                social_media_links JSONB,
                website_url VARCHAR(255),
                
                -- Ratings
                average_rating DECIMAL(3, 2) DEFAULT 0.0,
                total_reviews INTEGER DEFAULT 0,
                
                -- Gallery
                gallery_images JSONB,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create chef_reviews table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chef_reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
                customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                
                -- Review content
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                title VARCHAR(200),
                comment TEXT,
                
                -- Review details
                cuisine_quality INTEGER CHECK (cuisine_quality IS NULL OR (cuisine_quality >= 1 AND cuisine_quality <= 5)),
                service_quality INTEGER CHECK (service_quality IS NULL OR (service_quality >= 1 AND service_quality <= 5)),
                value_for_money INTEGER CHECK (value_for_money IS NULL OR (value_for_money >= 1 AND value_for_money <= 5)),
                
                -- Status
                is_public BOOLEAN DEFAULT TRUE,
                is_verified_purchase BOOLEAN DEFAULT FALSE,
                
                -- Response
                chef_response TEXT,
                chef_response_at TIMESTAMP,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create customer_allergies table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS customer_allergies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                
                -- Allergy information
                allergy_type VARCHAR(100) NOT NULL,
                severity VARCHAR(20) DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
                notes TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_chefs_verification_status ON chefs(verification_status);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_chefs_city ON chefs(city);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_chefs_cuisines ON chefs USING GIN(cuisines);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_chef_reviews_chef_id ON chef_reviews(chef_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_chef_reviews_customer_id ON chef_reviews(customer_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_customer_allergies_customer_id ON customer_allergies(customer_id);")
        
        conn.commit()
        print("✅ Chef tables created successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating chef tables: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_chef_tables()

