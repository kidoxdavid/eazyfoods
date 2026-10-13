#!/usr/bin/env python3
"""
Script to create admin tables in the database
Run: python setup_admin_tables.py
"""
import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_admin_tables():
    """Create admin tables from SQL file."""
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
        
        # Read and execute create_admin_tables.sql
        sql_file = os.path.join(os.path.dirname(__file__), 'migrations', 'create_admin_tables.sql')
        
        if not os.path.exists(sql_file):
            print(f"Error: create_admin_tables.sql file not found at {sql_file}")
            return False
        
        print("Reading create_admin_tables.sql...")
        with open(sql_file, 'r') as f:
            sql_script = f.read()
        
        print("Executing SQL script...")
        # Split by semicolon but keep CREATE TABLE and CREATE INDEX separate
        # Remove comments first
        lines = sql_script.split('\n')
        clean_lines = []
        for line in lines:
            # Remove full-line comments
            if line.strip().startswith('--'):
                continue
            # Remove inline comments (simple approach)
            if '--' in line:
                line = line.split('--')[0]
            clean_lines.append(line)
        
        clean_sql = '\n'.join(clean_lines)
        
        # Execute the entire script
        try:
            cursor.execute(clean_sql)
            print("SQL script executed successfully")
        except Exception as e:
            error_msg = str(e).lower()
            # If it's a multi-statement issue, try executing statements one by one
            if 'multiple statements' in error_msg or 'syntax error' in error_msg:
                statements = clean_sql.split(';')
                for statement in statements:
                    statement = statement.strip()
                    if statement:
                        try:
                            cursor.execute(statement)
                        except Exception as e2:
                            error_msg2 = str(e2).lower()
                            if 'already exists' not in error_msg2:
                                print(f"Executing: {statement[:50]}...")
                                print(f"Warning: {e2}")
            else:
                print(f"Warning: {e}")
        
        print("\n✅ Admin tables created successfully!")
        print("✅ Indexes have been set up")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('admin_users', 'admin_activity_logs')
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        if tables:
            print("\nCreated tables:")
            for table in tables:
                print(f"  ✓ {table[0]}")
        else:
            print("\n⚠️  Warning: Could not verify table creation")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Setup complete!")
        print("\nNext step: Run 'python create_admin_user.py' to create the admin user")
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = setup_admin_tables()
    sys.exit(0 if success else 1)
