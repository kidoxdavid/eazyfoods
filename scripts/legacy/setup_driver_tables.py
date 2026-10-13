#!/usr/bin/env python3
"""
Script to create driver and delivery tables in the database
Run: python setup_driver_tables.py
"""
import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_driver_tables():
    """Create driver and delivery tables from SQL file."""
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
        
        # Read and execute create_driver_tables.sql
        sql_file = os.path.join(os.path.dirname(__file__), 'migrations', 'create_driver_tables.sql')
        
        if not os.path.exists(sql_file):
            print(f"Error: create_driver_tables.sql file not found at {sql_file}")
            return False
        
        print("Reading create_driver_tables.sql...")
        with open(sql_file, 'r') as f:
            sql_script = f.read()
        
        print("Executing SQL script...")
        # Execute the entire script
        try:
            cursor.execute(sql_script)
            print("✓ Driver tables created successfully!")
        except Exception as e:
            print(f"Error executing SQL: {e}")
            # Try executing statement by statement
            print("Attempting to execute statements individually...")
            statements = [s.strip() for s in sql_script.split(';') if s.strip() and not s.strip().startswith('--')]
            for statement in statements:
                if statement:
                    try:
                        cursor.execute(statement)
                    except Exception as stmt_error:
                        print(f"Warning: Could not execute statement: {stmt_error}")
                        print(f"Statement: {statement[:100]}...")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name IN ('drivers', 'deliveries')
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"\n✓ Created {len(tables)} table(s):")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("\n⚠ Warning: Could not verify table creation")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("✓ Driver tables setup completed!")
        print("=" * 50)
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = setup_driver_tables()
    sys.exit(0 if success else 1)

