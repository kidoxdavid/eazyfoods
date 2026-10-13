"""
Migration script to add chef_id to orders table
"""
import psycopg2
from app.core.config import settings
from urllib.parse import quote_plus

def add_chef_id_to_orders():
    encoded_password = quote_plus(settings.DB_PASSWORD)
    conn_str = f"postgresql://{settings.DB_USER}:{encoded_password}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    try:
        # Add chef_id column to orders table
        cur.execute("""
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS chef_id UUID REFERENCES chefs(id) ON DELETE SET NULL;
        """)
        
        # Add index for chef_id
        cur.execute("CREATE INDEX IF NOT EXISTS idx_orders_chef_id ON orders(chef_id);")
        
        # Make vendor_id nullable (since orders can be from chefs too)
        cur.execute("""
            ALTER TABLE orders 
            ALTER COLUMN vendor_id DROP NOT NULL;
        """)
        
        conn.commit()
        print("✅ Added chef_id to orders table successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding chef_id to orders: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_chef_id_to_orders()




