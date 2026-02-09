#!/usr/bin/env python3
"""
Test different connection options to find what works with your Postgres app.
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def test_connection(username, password=""):
    """Test a connection with given credentials."""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database='postgres',  # Connect to default database
            user=username,
            password=password
        )
        conn.close()
        return True, None
    except psycopg2.OperationalError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def main():
    print("Testing different connection options...")
    print("=" * 50)
    
    # Test options
    options = [
        ("davidebubeihezue", ""),  # macOS username, no password
        ("postgres", ""),           # postgres user, no password
        ("davidebubeihezue", "postgres"),  # macOS username, common password
        ("postgres", "postgres"),   # postgres user, common password
    ]
    
    for username, password in options:
        print(f"\nTesting: user='{username}', password={'***' if password else '(empty)'}")
        success, error = test_connection(username, password)
        
        if success:
            print(f"✓ SUCCESS! This combination works!")
            print(f"\nUpdate your .env file with:")
            print(f"  DB_USER={username}")
            print(f"  DB_PASSWORD={password if password else '(leave empty)'}")
            return True
        else:
            print(f"✗ Failed: {error[:80]}...")
    
    print("\n" + "=" * 50)
    print("None of the common options worked.")
    print("\nYou may need to:")
    print("1. Set a password in the Postgres app")
    print("2. Or check the Postgres app settings for the correct username/password")
    print("3. Or reset the password for your user")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

