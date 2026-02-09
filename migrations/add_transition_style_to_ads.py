"""
Migration: Add transition_style column to marketing_ads table
"""
from app.core.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='marketing_ads' AND column_name='transition_style'
            """))
            
            if result.fetchone():
                print("Column 'transition_style' already exists in marketing_ads table")
                return
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE marketing_ads 
                ADD COLUMN transition_style VARCHAR(50) DEFAULT 'fade'
            """))
            conn.commit()
            print("Successfully added 'transition_style' column to marketing_ads table")
        except Exception as e:
            print(f"Error adding column: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()


