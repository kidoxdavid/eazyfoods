"""
Script to update support_messages table for customer support functionality
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    """Run the migration to add customer support columns"""
    try:
        # Get database connection details
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            print("Error: DATABASE_URL not found in environment variables")
            return False
        
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("Running migration: update_support_messages_for_customers...")
        
        # Read and execute migration SQL
        with open('migrations/update_support_messages_for_customers.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        cursor.execute(migration_sql)
        
        print("✓ Migration completed successfully!")
        print("  - Made vendor_id nullable")
        print("  - Added customer_id column")
        print("  - Added message_type column")
        print("  - Created indexes for better performance")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error running migration: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n✓ Customer support functionality is now ready!")
    else:
        print("\n✗ Migration failed. Please check the error messages above.")

