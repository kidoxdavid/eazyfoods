#!/usr/bin/env python3
"""
Script to create the easyfoods database if it doesn't exist.
This connects to the default 'postgres' database first, then creates 'easyfoods'.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_database():
    """Create the easyfoods database if it doesn't exist."""
    try:
        # First, connect to the default 'postgres' database
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': 'postgres',  # Connect to default database first
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
        print("Connecting to PostgreSQL server...")
        print(f"Host: {db_config['host']}")
        print(f"Port: {db_config['port']}")
        print(f"User: {db_config['user']}")
        print("-" * 50)
        
        # Connect to postgres database (this always exists)
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True  # Required for creating databases
        cursor = conn.cursor()
        
        # Check if easyfoods database exists
        db_name = os.getenv('DB_NAME', 'easyfoods')
        cursor.execute("""
            SELECT 1 FROM pg_database WHERE datname = %s
        """, (db_name,))
        
        exists = cursor.fetchone()
        
        if exists:
            print(f"✓ Database '{db_name}' already exists!")
        else:
            print(f"Creating database '{db_name}'...")
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✓ Database '{db_name}' created successfully!")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("✓ Database setup complete!")
        print("=" * 50)
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\n✗ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure the Postgres app is running")
        print("2. Check your .env file has correct credentials")
        print("3. Common usernames: your macOS username or 'postgres'")
        print("4. Password is often empty for local Postgres app")
        return False
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        return False
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = create_database()
    sys.exit(0 if success else 1)

