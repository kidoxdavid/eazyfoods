#!/usr/bin/env python3
"""
Run the delivery tracking fields migration so the deliveries table has
route_polyline, route_distance_km, route_duration_seconds, current_eta_minutes,
and last_location_update. Fixes: column "route_polyline" of relation "deliveries" does not exist.
"""
import os
import sys

# Run from project root so app is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from urllib.parse import quote_plus
import psycopg2
from app.core.config import settings

# Statements run one at a time so errors are clear
ALTER_TABLE = """
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS route_polyline TEXT,
ADD COLUMN IF NOT EXISTS route_distance_km DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS route_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS current_eta_minutes INTEGER,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP
"""
INDEX_1 = "CREATE INDEX IF NOT EXISTS idx_deliveries_last_location_update ON deliveries(last_location_update)"
INDEX_2 = "CREATE INDEX IF NOT EXISTS idx_deliveries_status_location ON deliveries(status, current_latitude, current_longitude)"

def main():
    encoded = quote_plus(settings.DB_PASSWORD)
    conn_str = (
        f"postgresql://{settings.DB_USER}:{encoded}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )
    print(f"Connecting to DB: host={settings.DB_HOST} port={settings.DB_PORT} db={settings.DB_NAME} user={settings.DB_USER}")
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(ALTER_TABLE)
            print("ALTER TABLE deliveries: added tracking columns (or already present).")
            cur.execute(INDEX_1)
            cur.execute(INDEX_2)
            print("Indexes created (or already present).")
            # Verify
            cur.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'deliveries' AND column_name = 'route_polyline'"
            )
            row = cur.fetchone()
        if row:
            print("Verified: column 'route_polyline' exists on deliveries. Migration OK.")
        else:
            print("WARNING: column 'route_polyline' not found after migration. Check that the app uses this same database.")
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
