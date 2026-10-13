#!/usr/bin/env python3
"""
Script to set up the EAZyfoods Vendor Portal database schema.
This replaces the simple grocery store schema with the full vendor portal schema.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Create vendor portal database schema from vendor_portal_schema.sql file."""
    try:
        # Get database connection parameters
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
        
        # Read and execute vendor_portal_schema.sql
        schema_file = os.path.join(os.path.dirname(__file__), 'vendor_portal_schema.sql')
        
        if not os.path.exists(schema_file):
            print(f"Error: vendor_portal_schema.sql file not found at {schema_file}")
            return False
        
        print("Reading vendor_portal_schema.sql...")
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        print("Executing schema...")
        print("This may take a moment...")
        cursor.execute(schema_sql)
        
        print("\n✓ Vendor Portal database schema created successfully!")
        print("✓ Tables, indexes, triggers, and functions have been set up")
        print("✓ Sample categories have been inserted")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        print(f"\n✓ Created {len(tables)} table(s):")
        for table in tables:
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
        print("✓ EAZyfoods Vendor Portal database setup completed!")
        print("=" * 50)
        print("\nKey features enabled:")
        print("  ✓ Multi-vendor support with roles")
        print("  ✓ Product management with barcodes")
        print("  ✓ Inventory tracking with audit logs")
        print("  ✓ Order fulfillment workflow")
        print("  ✓ Commission and payout system")
        print("  ✓ Promotions and marketing")
        print("  ✓ Reviews and ratings")
        print("  ✓ Analytics and reports")
        return True
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("EAZyfoods Vendor Portal Database Setup")
    print("=" * 50)
    print("\n⚠️  WARNING: This will create new tables.")
    print("If you have existing data, it will be preserved but")
    print("the schema structure will change significantly.\n")
    
    response = input("Continue? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Setup cancelled.")
        sys.exit(0)
    
    success = setup_database()
    sys.exit(0 if success else 1)

