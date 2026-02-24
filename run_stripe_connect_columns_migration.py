#!/usr/bin/env python3
"""
Add Stripe Connect columns to chefs, drivers, and deliveries.
Run from project root: python run_stripe_connect_columns_migration.py

For Render/webshell: paste the SQL from migrations/add_stripe_connect_chefs_drivers.sql
"""
import os
import sys
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Prefer DATABASE_URL (Render), fallback to DB_* (local)
database_url = os.environ.get("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if not database_url:
    try:
        import psycopg2
    except ImportError:
        print("psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)
    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ.get("DB_NAME", "easyfoods"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", ""),
    )
else:
    try:
        import psycopg2
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            dbname=parsed.path.lstrip("/"),
            user=parsed.username,
            password=parsed.password,
            sslmode="require" if parsed.scheme == "postgresql" and "render.com" in (parsed.hostname or "") else None,
        )
    except ImportError:
        print("psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

conn.autocommit = True
cur = conn.cursor()

ALTERS = [
    "ALTER TABLE chefs ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);",
    "ALTER TABLE chefs ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255);",
]

for sql in ALTERS:
    cur.execute(sql)
    print("OK:", sql.strip())

cur.close()
conn.close()
print("Done: Stripe Connect columns added (or already existed).")
