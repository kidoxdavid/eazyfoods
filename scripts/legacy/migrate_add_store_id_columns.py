"""
Migration script to add store_id columns to existing tables
"""
from sqlalchemy import text
from app.core.database import engine

def migrate():
    with engine.connect() as conn:
        # Add store_id to products table
        try:
            conn.execute(text("""
                ALTER TABLE products 
                ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id)
            """))
            print("✓ Added store_id to products table")
        except Exception as e:
            print(f"⚠ Error adding store_id to products: {e}")
        
        # Add store_id to orders table
        try:
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id)
            """))
            print("✓ Added store_id to orders table")
        except Exception as e:
            print(f"⚠ Error adding store_id to orders: {e}")
        
        # Add store_id to inventory_adjustments table
        try:
            conn.execute(text("""
                ALTER TABLE inventory_adjustments 
                ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id)
            """))
            print("✓ Added store_id to inventory_adjustments table")
        except Exception as e:
            print(f"⚠ Error adding store_id to inventory_adjustments: {e}")
        
        # Create index on store_id columns for better performance
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_store_id ON inventory_adjustments(store_id)"))
            print("✓ Created indexes on store_id columns")
        except Exception as e:
            print(f"⚠ Error creating indexes: {e}")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()

