"""
Migration: Add document validity columns to drivers table
Run from project root: python migrations/add_driver_document_validity.py
Uses DATABASE_URL from environment (no app import needed).
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not set")
    exit(1)
# Render uses postgres:// but SQLAlchemy expects postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)


def migrate():
    with engine.connect() as conn:
        try:
            for col in ["driver_license_validity", "vehicle_registration_validity", "insurance_validity"]:
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='drivers' AND column_name=:col
                """), {"col": col})
                if result.fetchone():
                    print(f"Column '{col}' already exists in drivers table")
                    continue
                conn.execute(text(f"ALTER TABLE drivers ADD COLUMN {col} TIMESTAMP"))
                conn.commit()
                print(f"Added column '{col}' to drivers table")
        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()
            raise


if __name__ == "__main__":
    migrate()
