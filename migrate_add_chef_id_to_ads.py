"""
Migration script to add chef_id column to marketing_ads table
"""
import psycopg2
from app.core.config import settings
from urllib.parse import quote_plus

def add_chef_id_to_ads():
    """Add chef_id column to marketing_ads table"""
    
    encoded_password = quote_plus(settings.DB_PASSWORD)
    conn_str = f"postgresql://{settings.DB_USER}:{encoded_password}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    try:
        # Check if column already exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='marketing_ads' AND column_name='chef_id';
        """)
        
        if cur.fetchone():
            print("✅ chef_id column already exists in marketing_ads table")
        else:
            # Add chef_id column
            cur.execute("""
                ALTER TABLE marketing_ads
                ADD COLUMN chef_id UUID REFERENCES chefs(id);
            """)
            
            # Create index for better query performance
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_marketing_ads_chef_id ON marketing_ads(chef_id);
            """)
            
            conn.commit()
            print("✅ Added chef_id column to marketing_ads table")
            print("✅ Created index on chef_id")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding chef_id column: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_chef_id_to_ads()

