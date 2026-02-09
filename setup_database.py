#!/usr/bin/env python3
"""
Script to set up the database schema.
Run this after verifying your database connection works.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Create database schema from schema.sql file."""
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
        
        # Read and execute schema.sql
        schema_file = os.path.join(os.path.dirname(__file__), 'schema.sql')
        
        if not os.path.exists(schema_file):
            print(f"Error: schema.sql file not found at {schema_file}")
            return False
        
        print("Reading schema.sql...")
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        print("Executing schema...")
        cursor.execute(schema_sql)
        
        print("\n✓ Database schema created successfully!")
        print("✓ Tables, indexes, and triggers have been set up")
        print("✓ Sample categories and products have been inserted")
        
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
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("✓ Database setup completed successfully!")
        print("=" * 50)
        return True
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)

