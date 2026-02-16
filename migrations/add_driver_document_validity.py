"""
Migration: Add document validity columns to drivers table
"""
from app.core.database import engine
from sqlalchemy import text


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
