"""
Migration: Add ad_duration, ad_cost, payment_intent_id to marketing_ads
"""
import psycopg2
from app.core.config import settings
from urllib.parse import quote_plus


def run():
    encoded_password = quote_plus(settings.DB_PASSWORD)
    conn_str = f"postgresql://{settings.DB_USER}:{encoded_password}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    try:
        for col, defn in [
            ("ad_duration", "VARCHAR(20)"),
            ("ad_cost", "DECIMAL(10, 2)"),
            ("payment_intent_id", "VARCHAR(255)"),
        ]:
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'marketing_ads' AND column_name = %s;
            """, (col,))
            if cur.fetchone():
                print(f"Column {col} already exists")
            else:
                cur.execute(f"ALTER TABLE marketing_ads ADD COLUMN {col} {defn};")
                print(f"Added column {col}")
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run()
