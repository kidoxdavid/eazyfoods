"""
Migration: Add cuisine_id column to order_items table.
Required for chef cuisine orders - order items can be products OR cuisines.
"""
import psycopg2
from app.core.config import settings
from urllib.parse import quote_plus


def migrate():
    encoded_password = quote_plus(settings.DB_PASSWORD)
    conn_str = f"postgresql://{settings.DB_USER}:{encoded_password}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    try:
        # Add cuisine_id column to order_items (nullable - existing rows are products)
        cur.execute("""
            ALTER TABLE order_items
            ADD COLUMN IF NOT EXISTS cuisine_id UUID REFERENCES cuisines(id);
        """)
        conn.commit()
        print("✅ Added cuisine_id column to order_items table successfully!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
