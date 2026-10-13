#!/usr/bin/env python3
"""
Copy local PostgreSQL database to Render (or any remote Postgres).
Uses .env for LOCAL DB and REMOTE_DATABASE_URL for the destination.
No psql needed - uses Python + psycopg2.

Usage:
  1. In Render, copy your PostgreSQL "External Database URL".
  2. In Terminal, from the project root (easyfoods/):
     export REMOTE_DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
     python copy_local_db_to_render.py
  Or put REMOTE_DATABASE_URL in a .env.remote file and load it (see below).
"""
import os
import sys

# Load .env (script dir first, then current directory)
from dotenv import load_dotenv
_script_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_script_dir, ".env")
if not os.path.isfile(_env_path):
    _env_path = os.path.join(os.getcwd(), ".env")
if not os.path.isfile(_env_path):
    print("ERROR: .env not found. Run from project root: cd /path/to/easyfoods")
    sys.exit(1)
load_dotenv(_env_path)
# Ensure project root is on path so "app" can be imported
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)
os.chdir(_script_dir)

# Remote: use REMOTE_DB_* vars (recommended) or REMOTE_DATABASE_URL
from urllib.parse import quote_plus

REMOTE = None
if os.environ.get("REMOTE_DB_HOST") and os.environ.get("REMOTE_DB_USER") and os.environ.get("REMOTE_DB_PASSWORD"):
    # Build URL from parts – no @ in password issues
    r_host = os.environ.get("REMOTE_DB_HOST")
    r_user = os.environ.get("REMOTE_DB_USER")
    r_pass = quote_plus(os.environ.get("REMOTE_DB_PASSWORD", ""))
    r_name = os.environ.get("REMOTE_DB_NAME", "eazyfoods_db")
    REMOTE = f"postgresql://{r_user}:{r_pass}@{r_host}/{r_name}?sslmode=require"
if not REMOTE:
    REMOTE = os.environ.get("REMOTE_DATABASE_URL")
if not REMOTE:
    print("ERROR: Set either REMOTE_DATABASE_URL or REMOTE_DB_HOST + REMOTE_DB_USER + REMOTE_DB_PASSWORD in .env")
    print("Recommended: REMOTE_DB_HOST, REMOTE_DB_USER, REMOTE_DB_PASSWORD, REMOTE_DB_NAME (from Render)")
    sys.exit(1)
if "sslmode" not in REMOTE:
    REMOTE = REMOTE.rstrip("/") + ("&" if "?" in REMOTE else "?") + "sslmode=require"

# Sanity check: host should not contain @ (would mean wrong URL / password with @)
if "@" in REMOTE.split("/")[2].split("@")[-1]:
    print("ERROR: Remote URL looks wrong (password may contain @ and was parsed incorrectly).")
    print("Use REMOTE_DB_HOST, REMOTE_DB_USER, REMOTE_DB_PASSWORD, REMOTE_DB_NAME in .env instead.")
    sys.exit(1)

# Build local URL from .env (do NOT set DATABASE_URL when running this so local is used)
from urllib.parse import quote_plus
local_password = quote_plus(os.environ.get("DB_PASSWORD", ""))
LOCAL = (
    f"postgresql://{os.environ.get('DB_USER', 'postgres')}:{local_password}"
    f"@{os.environ.get('DB_HOST', 'localhost')}:{os.environ.get('DB_PORT', '5432')}"
    f"/{os.environ.get('DB_NAME', 'easyfoods')}"
)

# Import so all tables are on Base.metadata
from app.models import vendor, customer, product, order, admin, inventory, payout
from app.models import promotion, recipe, review, support, driver, chef, cuisine
from app.models import store, coupon, chat, marketing, meal_plan, platform_settings

from sqlalchemy import create_engine, text
from app.core.database import Base

def main():
    import ssl
    import psycopg2
    local_engine = create_engine(LOCAL)
    # Remote: use a creator so we pass ssl_context as kwarg (not in DSN) to avoid "invalid connection option"
    r_host = os.environ.get("REMOTE_DB_HOST")
    r_user = os.environ.get("REMOTE_DB_USER")
    r_pass = os.environ.get("REMOTE_DB_PASSWORD", "")
    r_name = os.environ.get("REMOTE_DB_NAME", "eazyfoods_db")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    def remote_creator():
        return psycopg2.connect(
            host=r_host,
            port=5432,
            user=r_user,
            password=r_pass,
            dbname=r_name,
            connect_timeout=30,
            ssl_context=ctx,
        )

    remote_engine = create_engine("postgresql://", creator=remote_creator)

    # Create tables on remote (empty)
    print("Creating tables on remote...")
    Base.metadata.create_all(remote_engine)

    # Copy data in dependency order
    tables = list(Base.metadata.sorted_tables)
    print(f"Copying {len(tables)} tables...")

    for table in tables:
        name = table.name
        try:
            with local_engine.connect() as lconn, remote_engine.connect() as rconn:
                result = lconn.execute(text(f'SELECT * FROM "{name}"'))
                rows = result.fetchall()
                if not rows:
                    print(f"  {name}: 0 rows")
                    continue
                cols = list(result.keys())
                placeholders = ", ".join([f":{c}" for c in cols])
                col_list = ", ".join([f'"{c}"' for c in cols])
                insert = text(f'INSERT INTO "{name}" ({col_list}) VALUES ({placeholders})')
                for row in rows:
                    rconn.execute(insert, dict(zip(cols, row)))
                rconn.commit()
                print(f"  {name}: {len(rows)} rows")
        except Exception as e:
            print(f"  {name}: ERROR - {e}")
            raise

    print("Done. Refresh eazyfoods.ca to see your data.")

if __name__ == "__main__":
    main()
