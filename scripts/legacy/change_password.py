#!/usr/bin/env python3
"""
Script to change the PostgreSQL user password.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def change_password(new_password):
    """Change the postgres user password."""
    try:
        # Connect with current password
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': 'postgres',
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Change password
        username = os.getenv('DB_USER', 'postgres')
        print(f"Changing password for user '{username}'...")
        cursor.execute(f"ALTER USER {username} WITH PASSWORD %s", (new_password,))
        
        print(f"✓ Password changed successfully!")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"✗ Error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    new_password = 'Cr3@tivity'
    success = change_password(new_password)
    
    if success:
        print("\n" + "=" * 50)
        print("✓ Password updated in PostgreSQL!")
        print("=" * 50)
        print("\nDon't forget to update your .env file with:")
        print(f"  DB_PASSWORD={new_password}")
    
    sys.exit(0 if success else 1)

