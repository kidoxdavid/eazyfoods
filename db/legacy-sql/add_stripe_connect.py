"""
Migration: Add Stripe Connect and transfer tracking columns.
Run from project root: python migrations/add_stripe_connect.py
Uses DATABASE_URL from environment.

If this script errors, run the SQL manually: migrations/add_stripe_connect.sql
"""
import os
import sys

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not set")
    sys.exit(1)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    from sqlalchemy import create_engine, text
except ImportError:
    print("SQLAlchemy not found. Run the SQL manually: migrations/add_stripe_connect.sql")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

SQLS = [
    ("vendors", "stripe_connect_account_id", "ALTER TABLE vendors ADD COLUMN stripe_connect_account_id VARCHAR(255)"),
    ("vendors", "stripe_connect_details_submitted", "ALTER TABLE vendors ADD COLUMN stripe_connect_details_submitted BOOLEAN DEFAULT FALSE"),
    ("orders", "stripe_transfer_id", "ALTER TABLE orders ADD COLUMN stripe_transfer_id VARCHAR(255)"),
]


def migrate():
    with engine.connect() as conn:
        for table, column, alter_sql in SQLS:
            try:
                r = conn.execute(
                    text(
                        "SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c"
                    ),
                    {"t": table, "c": column},
                )
                if r.fetchone():
                    print(f"{table}.{column} already exists")
                    continue
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"Added {table}.{column}")
            except Exception as e:
                conn.rollback()
                print(f"Error adding {table}.{column}: {e}")
                print("You can run the SQL manually: migrations/add_stripe_connect.sql")
                raise


if __name__ == "__main__":
    migrate()
