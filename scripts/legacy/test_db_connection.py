#!/usr/bin/env python3
"""
Script to test PostgreSQL database connection and verify setup.
Run this to ensure your database is properly configured.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_connection():
    """Test database connection with provided credentials."""
    try:
        # Get database connection parameters from environment variables
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'easyfoods'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
        print("Attempting to connect to PostgreSQL database...")
        print(f"Host: {db_config['host']}")
        print(f"Port: {db_config['port']}")
        print(f"Database: {db_config['database']}")
        print(f"User: {db_config['user']}")
        print("-" * 50)
        
        # Attempt connection
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✓ Connection successful!")
        print(f"✓ PostgreSQL version: {version[0]}")
        
        # Check if database exists and get basic info
        cursor.execute("SELECT current_database();")
        db_name = cursor.fetchone()[0]
        print(f"✓ Connected to database: {db_name}")
        
        # Get PostgreSQL version number
        cursor.execute("SHOW server_version;")
        pg_version = cursor.fetchone()[0]
        print(f"✓ Server version: {pg_version}")
        
        # Check current user
        cursor.execute("SELECT current_user;")
        current_user = cursor.fetchone()[0]
        print(f"✓ Current user: {current_user}")
        
        # List existing tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"\n✓ Found {len(tables)} existing table(s):")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("\n✓ No tables found yet (database is empty - ready for schema setup)")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("✓ Database connection test PASSED!")
        print("=" * 50)
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\n✗ Connection failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Ensure PostgreSQL is running: brew services start postgresql (macOS)")
        print("2. Check your .env file has correct credentials")
        print("3. Verify database exists: createdb easyfoods")
        print("4. Check if user has proper permissions")
        return False
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        return False
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)

