#!/usr/bin/env python3
"""
Script to create admin user
Run: python create_admin_user.py
"""
import psycopg2
import sys
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create admin user in the database"""
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
        cursor = conn.cursor()
        
        # Check if admin already exists
        cursor.execute("SELECT id FROM admin_users WHERE email = %s", ('admin@eazyfoods.com',))
        existing = cursor.fetchone()
        
        if existing:
            print("ℹ️  Admin user already exists!")
            cursor.close()
            conn.close()
            return True
        
        # Hash password
        password_hash = pwd_context.hash("admin123")
        
        # Create admin user
        import json
        permissions_json = json.dumps({
            "vendors": ["view", "edit", "approve", "suspend"],
            "customers": ["view", "edit", "suspend"],
            "products": ["view", "edit", "delete"],
            "orders": ["view", "edit", "refund"],
            "promotions": ["view", "approve", "reject"],
            "reviews": ["view", "moderate", "delete"]
        })
        
        cursor.execute("""
            INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active, permissions)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
        """, (
            'admin@eazyfoods.com',
            password_hash,
            'Admin',
            'User',
            'super_admin',
            True,
            permissions_json
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Admin user created successfully!")
        print("\nLogin credentials:")
        print("  Email: admin@eazyfoods.com")
        print("  Password: admin123")
        print("\n⚠️  IMPORTANT: Change the password in production!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = create_admin_user()
    sys.exit(0 if success else 1)
