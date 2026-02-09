#!/usr/bin/env python3
"""
Migration script to convert from simple grocery store to vendor portal schema.
This will drop old tables and create the new vendor portal structure.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_database():
    """Drop old tables and create vendor portal schema."""
    try:
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'easyfoods'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
        print("Connecting to database...")
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get existing tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        if existing_tables:
            print(f"\nFound {len(existing_tables)} existing table(s):")
            for table in existing_tables:
                print(f"  - {table}")
            print("\n⚠️  WARNING: These tables will be DROPPED!")
            print("All data in these tables will be lost.\n")
        else:
            print("No existing tables found. Proceeding with fresh setup.\n")
        
        # Drop existing tables (in reverse dependency order)
        print("Dropping existing tables...")
        drop_order = [
            'order_status_history', 'order_items', 'orders',
            'payout_items', 'payouts',
            'inventory_adjustments', 'low_stock_alerts', 'expiry_alerts',
            'product_variants', 'products',
            'promotions',
            'reviews',
            'sales_reports',
            'notifications', 'support_messages',
            'vendor_onboarding_steps', 'vendor_users', 'vendors',
            'customer_addresses', 'customers',
            'categories',
            'cart_items', 'addresses'  # Old tables
        ]
        
        for table in drop_order:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                if table in existing_tables:
                    print(f"  ✓ Dropped {table}")
            except Exception as e:
                print(f"  ⚠ Could not drop {table}: {e}")
        
        # Drop functions
        print("\nDropping existing functions...")
        cursor.execute("""
            DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
            DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
            DROP FUNCTION IF EXISTS generate_payout_number() CASCADE;
            DROP FUNCTION IF EXISTS update_vendor_rating() CASCADE;
            DROP FUNCTION IF EXISTS check_low_stock() CASCADE;
        """)
        print("  ✓ Functions dropped")
        
        # Now create the new schema
        print("\nCreating vendor portal schema...")
        schema_file = os.path.join(os.path.dirname(__file__), 'vendor_portal_schema.sql')
        
        if not os.path.exists(schema_file):
            print(f"Error: vendor_portal_schema.sql file not found at {schema_file}")
            return False
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        print("Executing schema (this may take a moment)...")
        cursor.execute(schema_sql)
        
        # Verify new tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        new_tables = cursor.fetchall()
        
        print(f"\n✓ Created {len(new_tables)} new table(s):")
        for table in new_tables:
            print(f"  - {table[0]}")
        
        # Count functions
        cursor.execute("""
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_type = 'FUNCTION';
        """)
        functions = cursor.fetchall()
        
        if functions:
            print(f"\n✓ Created {len(functions)} function(s):")
            for func in functions:
                print(f"  - {func[0]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("✓ Migration to Vendor Portal schema completed!")
        print("=" * 50)
        return True
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("EAZyfoods Vendor Portal Migration")
    print("=" * 50)
    print("\nThis will:")
    print("  1. Drop all existing tables")
    print("  2. Create the new vendor portal schema")
    print("\n⚠️  ALL EXISTING DATA WILL BE LOST!\n")
    
    response = input("Are you sure you want to continue? (type 'yes' to confirm): ").strip().lower()
    if response != 'yes':
        print("Migration cancelled.")
        sys.exit(0)
    
    success = migrate_database()
    sys.exit(0 if success else 1)

