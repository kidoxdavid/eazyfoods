"""
Migration script to create cuisines table
"""
import psycopg2
from app.core.config import settings
from urllib.parse import quote_plus

def create_cuisines_table():
    encoded_password = quote_plus(settings.DB_PASSWORD)
    conn_str = f"postgresql://{settings.DB_USER}:{encoded_password}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    try:
        # Create cuisines table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cuisines (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                cuisine_type VARCHAR(100),
                price DECIMAL(10, 2) NOT NULL,
                price_per_person DECIMAL(10, 2),
                minimum_servings INTEGER DEFAULT 1,
                image_url VARCHAR(500),
                images TEXT[],
                ingredients TEXT[],
                allergens TEXT[],
                spice_level VARCHAR(20) DEFAULT 'medium',
                prep_time_minutes INTEGER,
                serves INTEGER DEFAULT 1,
                is_vegetarian BOOLEAN DEFAULT FALSE,
                is_vegan BOOLEAN DEFAULT FALSE,
                is_gluten_free BOOLEAN DEFAULT FALSE,
                is_halal BOOLEAN DEFAULT FALSE,
                is_kosher BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'active',
                is_featured BOOLEAN DEFAULT FALSE,
                slug VARCHAR(200) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cuisines_chef_id ON cuisines(chef_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cuisines_status ON cuisines(status);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cuisines_slug ON cuisines(slug);")
        
        conn.commit()
        print("✅ Cuisines table created successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating cuisines table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_cuisines_table()

