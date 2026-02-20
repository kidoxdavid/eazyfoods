#!/usr/bin/env python3
"""
Run from Render API shell (or any environment with DATABASE_URL and the project):
  cd ~/project/src
  python3 run_chef_bank_migration.py

Adds bank columns to chefs table if missing. Safe to run multiple times (IF NOT EXISTS).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL not set. Set it in Render Environment or .env", file=sys.stderr)
        sys.exit(1)
    try:
        from sqlalchemy import text
        from app.core.database import engine
    except Exception as e:
        print("Import failed (run from project root): %s" % e, file=sys.stderr)
        sys.exit(1)
    sql = """
    ALTER TABLE chefs
      ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
        print("Done. Chef bank columns added (or already existed).")
    except Exception as e:
        print("Migration failed: %s" % e, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
